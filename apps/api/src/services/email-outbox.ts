import type { FastifyBaseLogger, FastifyInstance } from "fastify"
import { eq, sql } from "drizzle-orm"
import { db } from "../db/client.js"
import { emailOutbox, orders } from "../db/schema.js"
import { env } from "../env.js"
import {
  sendInquiryNotification, sendOrderConfirmationEmail, sendOrderDecisionEmail,
  type ConfirmationEmail, type DecisionEmail, type EmailResult, type InquiryNotification,
} from "./order-email.js"

// Emails are queued in the same transaction as the order, decision or inquiry they belong to,
// so none is lost when the provider is down and none is sent for a change that rolled back.
// The worker sends them with retries and records the order's sent timestamp.

export type QueuedEmail =
  | { kind: "order_confirmation"; orderId: string; payload: ConfirmationEmail }
  | { kind: "order_decision"; orderId: string; payload: DecisionEmail }
  | { kind: "inquiry_notification"; payload: InquiryNotification }

export type QueueResult = { queued: true } | { queued: false; reason: "not_configured" }

/** Retries after 1, 2, 4 … minutes; after the last attempt (about four hours in) it gives up. */
export const MAX_ATTEMPTS = 8
const retryDelayMinutes = (attempts: number) => 2 ** (attempts - 1)
// A claimed email is retried by another pass if this one dies before recording the outcome.
const CLAIM_MINUTES = 5

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Queues an email inside the caller's transaction. Nothing is queued while email isn't
 * configured, so configuring it later doesn't send a backlog of stale messages.
 */
export async function queueEmail(tx: Transaction, email: QueuedEmail): Promise<QueueResult> {
  const configured = env.RESEND_API_KEY && env.ORDER_EMAIL_FROM && (email.kind !== "inquiry_notification" || env.INQUIRY_NOTIFY_EMAIL)
  if (!configured) return { queued: false, reason: "not_configured" }
  await tx.insert(emailOutbox).values({ kind: email.kind, orderId: "orderId" in email ? email.orderId : null, payload: email.payload })
  return { queued: true }
}

function send(email: QueuedEmail): Promise<EmailResult> {
  switch (email.kind) {
    case "order_confirmation": return sendOrderConfirmationEmail(email.payload)
    case "order_decision": return sendOrderDecisionEmail(email.payload)
    case "inquiry_notification": return sendInquiryNotification(email.payload)
  }
}

/** Sends the emails that are due and returns how many it tried. */
export async function deliverDueEmails(log: FastifyBaseLogger, limit = 10) {
  // SKIP LOCKED lets several instances (e.g. old and new during a deploy) share the queue
  // without sending an email twice.
  const { rows } = await db.execute<{ id: string; kind: QueuedEmail["kind"]; order_id: string | null; payload: unknown; attempts: number }>(sql`
    UPDATE ${emailOutbox} SET attempts = attempts + 1, next_attempt_at = now() + make_interval(mins => ${CLAIM_MINUTES})
    WHERE id IN (
      SELECT id FROM ${emailOutbox}
      WHERE sent_at IS NULL AND next_attempt_at <= now() AND attempts < ${MAX_ATTEMPTS}
      ORDER BY next_attempt_at LIMIT ${limit} FOR UPDATE SKIP LOCKED
    )
    RETURNING id, kind, order_id, payload, attempts`)
  for (const row of rows) {
    const email = { kind: row.kind, orderId: row.order_id, payload: row.payload } as QueuedEmail
    const result = await send(email).catch((): EmailResult => ({ sent: false, reason: "delivery_failed" }))
    try {
      if (result.sent) {
        const sentAt = new Date()
        await db.transaction(async tx => {
          await tx.update(emailOutbox).set({ sentAt, lastError: null }).where(eq(emailOutbox.id, row.id))
          if (email.kind === "order_confirmation") await tx.update(orders).set({ confirmationEmailSentAt: sentAt }).where(eq(orders.id, email.orderId))
          if (email.kind === "order_decision") await tx.update(orders).set({ reviewEmailSentAt: sentAt }).where(eq(orders.id, email.orderId))
        })
      } else {
        const finalAttempt = row.attempts >= MAX_ATTEMPTS
        await db.update(emailOutbox).set({
          lastError: result.reason,
          nextAttemptAt: sql`now() + make_interval(mins => ${retryDelayMinutes(row.attempts)})`,
        }).where(eq(emailOutbox.id, row.id))
        if (finalAttempt) log.error({ emailId: row.id, kind: row.kind }, "Email could not be delivered; giving up")
        else log.warn({ emailId: row.id, kind: row.kind, attempts: row.attempts }, "Email delivery failed; will retry")
      }
    } catch (error) {
      // The claim expires, so the email is retried; at worst a sent email goes out again.
      log.error({ emailId: row.id, err: error }, "Email outcome could not be saved")
    }
  }
  return rows.length
}

let wake: (() => void) | undefined

/** Asks a running worker to send right away instead of at its next poll. No-op otherwise. */
export function wakeEmailWorker() {
  wake?.()
}

/**
 * Runs delivery passes every `intervalMs` (and on wake) from when the app is ready until it
 * closes. Call it before the app is ready.
 */
export function startEmailWorker(app: FastifyInstance, intervalMs = 15_000) {
  let running: Promise<void> | undefined
  let again = false
  let stopped = false
  const pass = () => {
    if (stopped) return
    if (running) { again = true; return }
    running = (async () => {
      try {
        // Keep going while full batches come back, so a backlog drains without waiting.
        while (!stopped && await deliverDueEmails(app.log) === 10) { /* next batch */ }
      } catch (error) {
        app.log.error({ err: error }, "Email delivery pass failed")
      } finally {
        running = undefined
        if (again) { again = false; pass() }
      }
    })()
  }
  let timer: NodeJS.Timeout | undefined
  app.addHook("onReady", async () => {
    timer = setInterval(pass, intervalMs)
    timer.unref()
    wake = () => setImmediate(pass)
    pass()
  })
  app.addHook("onClose", async () => {
    stopped = true
    clearInterval(timer)
    wake = undefined
    await running
  })
}
