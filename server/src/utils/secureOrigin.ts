// Origin settings decide whether the browser talks to this app over TLS. Kept
// out of config/env.ts so it can be tested: that module parses process.env once
// at import time and exits the process on a bad value, which makes the rule
// itself impossible to exercise.

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

/**
 * The configured origins that would leave a browser on plain http.
 *
 * HTTPS is not optional here: login passwords, bearer tokens, host identity
 * documents and payout bank details all travel in request bodies, and the
 * refresh cookie is only marked Secure in production. An http origin therefore
 * puts every session on that network in clear text.
 *
 * Localhost is exempt because the server deliberately falls back to the
 * request's own origin when the configured client URL is local, so a developer
 * running on http://localhost is not misconfigured.
 */
export function findPlainHttpOrigins(...urls: (string | undefined)[]): string[] {
  return urls
    .flatMap((url) => (url || '').split(','))
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .filter((url) => !LOCAL_ORIGIN.test(url) && !/^https:\/\//i.test(url));
}
