/**
 * Why a Google sign-in failed, in one line a server log can hold.
 *
 * passport reports a refused token exchange by calling next(err), so the failure
 * used to land in the JSON error handler: the visitor was left on a blank page
 * reading {"success":false,"error":"Internal server error"} with no way back to
 * the site, and the log held a stack trace whose useful part was a field inside a
 * third-party error object. The reason Google gave is the only part an operator
 * can act on (a wrong client secret says invalid_client, a reused code says
 * invalid_grant), so it is the part that gets recorded.
 */

export interface OAuthFailureSummary {
  /** Google's own error code, or a label when there is not one. */
  code: string;
  /** Short reason for a log line. Never a token, and never the raw response. */
  detail: string;
}

const MAX_DETAIL_LENGTH = 160;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function clip(value: string): string {
  if (value.length <= MAX_DETAIL_LENGTH) return value;
  return `${value.slice(0, MAX_DETAIL_LENGTH)}...`;
}

/**
 * passport-oauth2 wraps a refusal from the token endpoint in an
 * InternalOAuthError whose `oauthError.data` is Google's JSON body. That body is
 * written by a third party, so only the two named fields are read out of it and
 * the rest is discarded rather than copied into the log.
 */
function fromTokenEndpoint(raw: unknown): OAuthFailureSummary | undefined {
  if (typeof raw !== 'string') return undefined;
  const body = raw.trim();
  if (!body.startsWith('{')) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;

  const record = parsed as Record<string, unknown>;
  const code = text(record.error);
  const description = text(record.error_description);
  if (!code && !description) return undefined;
  return { code: code || 'token_rejected', detail: clip(oneLine(description)) };
}

export function summarizeOAuthFailure(input: unknown): OAuthFailureSummary {
  if (!input) return { code: 'unknown', detail: '' };

  if (typeof input === 'string') {
    return { code: 'unknown', detail: clip(oneLine(input.trim())) };
  }

  if (typeof input !== 'object') return { code: 'unknown', detail: '' };
  const record = input as Record<string, unknown>;

  const wrapped = record.oauthError;
  if (wrapped && typeof wrapped === 'object') {
    const summary = fromTokenEndpoint((wrapped as Record<string, unknown>).data);
    if (summary) return summary;
  }

  // An AuthorizationError (Google sent `error=` back instead of a code) carries
  // that code; passport's own refusals and errors from our own code have only a
  // name and a message. A Prisma failure also carries its P-code here, which is
  // what makes a schema problem readable at a glance.
  const code = text(record.code);
  return { code: code || 'unknown', detail: clip(oneLine(text(record.message))) };
}
