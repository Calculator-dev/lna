// The visitor's cookie choice, kept in the browser and passed to Google Consent Mode v2.
// Until they choose, analytics and ad storage are denied and GA4 only receives cookieless pings.

export type ConsentChoice = "granted" | "denied"
export const CONSENT_KEY = "lna-consent-v1"
export const CONSENT_EVENT = "lna-consent-change"

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === "granted" || value === "denied" ? value : null
  } catch {
    return null
  }
}

/** The gtag consent fields for a choice; ads fields follow the same answer. */
export function consentFields(choice: ConsentChoice) {
  return { analytics_storage: choice, ad_storage: choice, ad_user_data: choice, ad_personalization: choice }
}

export function saveConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice)
  } catch {
    // Storage blocked: the choice still applies to this page view.
  }
  window.dataLayer ??= []
  // gtag() must push the arguments object, which is what Consent Mode reads.
  window.dataLayer.push(gtagArgs("consent", "update", consentFields(choice)))
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }))
}

function gtagArgs(..._args: unknown[]): IArguments {
  // eslint-disable-next-line prefer-rest-params
  return arguments
}
