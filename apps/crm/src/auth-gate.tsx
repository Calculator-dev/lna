import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { useQueryClient } from "@tanstack/react-query"
import { apiUrl, resetAdminVerification, supabase, verifyAdmin } from "./lib/auth"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState(false)
  // Access is verified per user, not per token, so hourly token refreshes keep the app mounted.
  const [verifiedUser, setVerifiedUser] = useState<string | null>(null)
  const userRef = useRef<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState("")
  const [settingPassword, setSettingPassword] = useState(() => new URLSearchParams(window.location.search).get("setup") === "password" || ["invite", "recovery"].includes(new URLSearchParams(window.location.hash.slice(1)).get("type") ?? ""))
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const configured = Boolean(supabase && apiUrl)

  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setSettingPassword(true)
      setSession(next)
      setLoaded(true)
      const userId = next?.user.id ?? null
      if (userId !== userRef.current) {
        userRef.current = userId
        setVerifiedUser(null)
        setAccessDenied(false)
        resetAdminVerification()
        queryClient.clear()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const accessToken = session?.access_token
  const needsVerification = Boolean(userId && verifiedUser !== userId && !accessDenied)
  useEffect(() => {
    if (!needsVerification || !userId || !accessToken) return
    let cancelled = false
    setError("")
    verifyAdmin(accessToken).then(() => {
      if (!cancelled) setVerifiedUser(userId)
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Nije moguće potvrditi pristup.")
    })
    return () => { cancelled = true }
    // The token is read when verification starts; refreshing it must not restart verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsVerification, userId, attempt])

  useEffect(() => {
    function denied() {
      setVerifiedUser(null)
      setAccessDenied(true)
      resetAdminVerification()
      queryClient.clear()
      setError("Vaš pristup nije moguće potvrditi. Pokušajte ponovo ili se ponovo prijavite.")
    }
    window.addEventListener("admin-access-denied", denied)
    return () => window.removeEventListener("admin-access-denied", denied)
  }, [queryClient])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const result = await supabase.auth.signInWithPassword({ email: String(data.get("email")).trim(), password: String(data.get("password")) })
      if (result.error) setError("Prijava nije uspjela. Provjerite email i lozinku pa pokušajte ponovo.")
    } catch { setError("Prijava trenutno nije moguća. Pokušajte ponovo.") }
    finally { setBusy(false) }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !session) return
    const data = new FormData(event.currentTarget)
    const password = String(data.get("password"))
    if (password !== data.get("confirmPassword")) { setError("Lozinke se ne podudaraju."); return }
    setBusy(true)
    setError("")
    try {
      const result = await supabase.auth.updateUser({ password })
      if (result.error) { setError("Lozinku nije moguće sačuvati. Koristite sigurnu lozinku i pokušajte ponovo."); return }
      setSettingPassword(false)
      window.history.replaceState(null, "", window.location.pathname)
    } catch { setError("Lozinku nije moguće sačuvati. Pokušajte ponovo.") }
    finally { setBusy(false) }
  }

  async function signOut() {
    setBusy(true)
    try {
      const result = await supabase?.auth.signOut({ scope: "local" })
      if (result?.error) { setError("Odjava nije uspjela. Pokušajte ponovo."); return }
      setSession(null)
      userRef.current = null
      setVerifiedUser(null)
      resetAdminVerification()
      queryClient.clear()
      setError("")
    } catch { setError("Odjava nije uspjela. Pokušajte ponovo.") }
    finally { setBusy(false) }
  }

  if (configured && session && settingPassword && verifiedUser === session.user.id) return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8">
      <h1 className="font-serif text-3xl">Postavite lozinku</h1>
      <p>Odaberite lozinku za svoj LNA kreativna sehara administratorski račun.</p>
      <form onSubmit={savePassword} className="space-y-4">
        <label className="block space-y-2"><span>Nova lozinka</span><Input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
        <label className="block space-y-2"><span>Potvrdite lozinku</span><Input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Čuvanje…" : "Sačuvaj lozinku"}</Button>
      </form>
      <Button variant="outline" onClick={signOut} disabled={busy}>Odjavi se</Button>
    </section>
  </main>

  if (configured && session && verifiedUser === session.user.id) return <>
    <div className="flex items-center justify-end gap-4 border-b bg-card px-6 py-3 text-sm">
      <span>{session.user.email}</span><Button variant="outline" disabled={busy} onClick={signOut}>Odjavi se</Button>
      {error && <p role="alert">{error}</p>}
    </div>{children}
  </>

  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div><p className="text-sm text-muted-foreground">LNA kreativna sehara CRM</p><h1 className="mt-2 font-serif text-3xl">Administratorska prijava</h1></div>
      {!configured ? <p>Administratorska prijava još nije dostupna. Obratite se administratoru stranice.</p> : !loaded ? <p role="status">Učitavanje sesije…</p> : session ? <>
        {!error && <p role="status">Provjera administratorskog pristupa…</p>}
        {error && <><p role="alert">{error}</p><Button onClick={() => { setAccessDenied(false); setAttempt(value => value + 1) }}>Pokušaj ponovo</Button></>}
        <Button variant="outline" disabled={busy} onClick={signOut}>Odjavi se</Button>
      </> : <form onSubmit={signIn} className="space-y-4">
        <label className="block space-y-2"><span>Email adresa</span><Input name="email" type="email" autoComplete="username" required /></label>
        <label className="block space-y-2"><span>Lozinka</span><Input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={busy} type="submit">{busy ? "Prijava…" : "Prijavi se"}</Button>
      </form>}
    </section>
  </main>
}
