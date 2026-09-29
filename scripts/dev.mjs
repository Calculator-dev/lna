import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Node.js 22+ is required. Run `nvm use 25` on this computer, then `pnpm dev`.')
  process.exit(1)
}

const root = fileURLToPath(new URL('../', import.meta.url))
const apps = [
  { name: 'API', directory: 'apps/api', args: ['--env-file=.env', '--import', 'tsx', 'src/server.ts'] },
  { name: 'CRM', directory: 'apps/crm', args: ['node_modules/vite/bin/vite.js', '--port', '3000', '--strictPort'] },
  { name: 'Storefront', directory: 'apps/storefront', args: ['node_modules/next/dist/bin/next', 'dev', '--port', '3001'] },
]
const children = []
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) {
    if (!child.pid) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') console.error('Could not stop a development server:', error.code)
    }
  }
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
console.log('Starting API (:4000), CRM (:3000), and storefront (:3001). Press Ctrl+C to stop all three.')
for (const app of apps) {
  const child = spawn(process.execPath, app.args, {
    cwd: `${root}${app.directory}`,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  children.push(child)
  child.on('error', error => {
    console.error(`${app.name} failed to start: ${error.message}`)
    stop(1)
  })
  child.on('exit', code => {
    if (!stopping) {
      console.error(`${app.name} stopped. Stopping the other servers.`)
      stop(code || 1)
    }
  })
}
