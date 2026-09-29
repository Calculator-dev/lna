import { createApp } from "./app.js"
import { corsOrigins, env } from "./env.js"

const app = createApp()
if (env.NODE_ENV === "production" && corsOrigins.length === 0) {
  app.log.warn("CORS_ORIGINS is not set: browsers cannot call the API from the storefront or CRM")
}

app
  .listen({
    port: env.PORT,
    host: "0.0.0.0",
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
