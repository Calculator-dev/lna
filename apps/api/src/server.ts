import { createApp } from "./app.js"
import { corsOrigins, env } from "./env.js"
import { startEmailWorker } from "./services/email-outbox.js"

const app = createApp()
startEmailWorker(app)
if (env.NODE_ENV === "production" && corsOrigins.length === 0) {
  app.log.warn("CORS_ORIGINS is not set: browsers cannot call the API from the storefront or CRM")
}

app
  .listen({
    port: env.PORT,
    host: env.HOST,
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
