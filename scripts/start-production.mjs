// Runs the API and the storefront together as one production service (one Render instance).
// The storefront listens on the public $PORT; the API listens privately on 127.0.0.1 and is
// reached by the storefront's server directly and by browsers through the storefront's
// /backend rewrite (see apps/storefront/next.config.mjs). Build first with `pnpm build:service`.
import { spawn } from 'node:child_process'
import { connect } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicPort = process.env.PORT || '3001'
const apiPort = process.env.API_INTERNAL_PORT || '4000'
for (const [name, value] of [['PORT', publicPort], ['API_INTERNAL_PORT', apiPort]]) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    console.error(`${name} must be a port number between 1 and 65535 (got "${value}").`)
    process.exit(1)
  }
}
if (publicPort === apiPort) {
  console.error('PORT and API_INTERNAL_PORT must differ.')
  process.exit(1)
}

// Keep each heap well under the instance's memory so both processes fit (override per service).
const heap = (name, fallback) => `--max-old-space-size=${process.env[name] || fallback}`
const apps = [
  {
    name: 'API',
    directory: 'apps/api',
    args: [heap('API_HEAP_MB', 160), '--env-file-if-exists=.env', 'dist/server.js'],
    env: { PORT: apiPort, HOST: '127.0.0.1' },
  },
  {
    name: 'Storefront',
    directory: 'apps/storefront',
    args: [heap('STOREFRONT_HEAP_MB', 224), 'node_modules/next/dist/bin/next', 'start', '--port', publicPort, '--hostname', '0.0.0.0'],
    env: { PORT: publicPort, API_URL: `http://127.0.0.1:${apiPort}` },
  },
]

const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

function start(app) {
  const child = spawn(process.execPath, app.args, {
    cwd: `${root}${app.directory}`,
    stdio: 'inherit',
    env: { ...process.env, ...app.env },
  })
  children.push(child)
  child.on('error', error => {
    console.error(`${app.name} failed to start: ${error.message}`)
    stop(1)
  })
  // If either process dies, stop the other too so the host restarts the whole service.
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${app.name} stopped (${signal ?? `exit ${code}`}). Stopping the service.`)
      stop(code || 1)
    }
  })
}

// Is something accepting connections on this port yet?
function listening(port) {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
  })
}
async function waitFor(check, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  while (!stopping && Date.now() < deadline) {
    if (await check()) return true
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return false
}
async function apiHealthy() {
  try {
    return (await fetch(`http://127.0.0.1:${apiPort}/health`, { signal: AbortSignal.timeout(2000) })).ok
  } catch {
    return false
  }
}

// The public port must open first: Render detects the service's port by scanning for the first
// open one, and would otherwise pick the API's private port. Visitors are not affected by the API
// starting a moment later, because the health check (/backend/health) needs both processes.
const [api, storefront] = apps
start(storefront)
if (!(await waitFor(() => listening(Number(publicPort))))) {
  if (!stopping) { console.error(`Storefront did not open port ${publicPort} within 60s. Stopping the service.`); stop(1) }
} else if (!stopping) {
  start(api)
  if (await waitFor(apiHealthy)) console.log(`Storefront on :${publicPort}, API on 127.0.0.1:${apiPort} (browsers reach it at /backend).`)
  else if (!stopping) { console.error(`API did not answer on 127.0.0.1:${apiPort} within 60s. Stopping the service.`); stop(1) }
}
