// Each public form submission sends email, so limit how often one client can submit.
export const publicFormRateLimit = { max: 10, timeWindow: "10 minutes" }
