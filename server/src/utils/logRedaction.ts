/**
 * A password-reset link is a single-use credential carried in the query string.
 *
 * The single-page app is served by the same Express process as the API, so a
 * person clicking that link produces two requests that both name the token: the
 * page view itself, and the API call the page then makes, whose referer header
 * is the full page address. A plain morgan format writes the token down twice,
 * next to the requester's address, where anyone who can read the log can use it
 * until it expires.
 *
 * Stripping the value leaves the fact that a reset page was opened, which is
 * the part the log is actually good for.
 */
const TOKEN_PARAM = /([?&#]token=)[^&\s"#]*/gi;

export function redactResetToken(value: string | undefined | null): string {
  if (!value) return '-';
  return value.replace(TOKEN_PARAM, '$1[redacted]');
}
