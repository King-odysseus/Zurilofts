/**
 * Google sign-in is bound to the browser that started it.
 *
 * This drives the real passport strategy with only the network call to Google
 * stubbed, so it proves the wiring (state, PKCE challenge, verifier on the token
 * exchange) and not just the store in isolation.
 *
 * Run from server/:
 *   node --import tsx --test tests/google-pkce.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Strategy as GoogleStrategy, type StrategyOptions } from 'passport-google-oauth20';

import { GOOGLE_STATE_COOKIE, GoogleCookieStore } from '../src/utils/googleOAuthStore.js';

interface Outcome {
  redirect?: string;
  failed?: boolean;
  error?: Error;
  exchangeParams?: Record<string, string>;
}

function newStrategy() {
  const strategy = new GoogleStrategy(
    {
      clientID: 'client-id',
      clientSecret: 'client-secret',
      callbackURL: 'https://example.test/api/auth/google/callback',
      pkce: true,
      store: new GoogleCookieStore() as unknown as StrategyOptions['store'],
    },
    (_a, _r, profile, done) => done(null, profile),
  );
  return strategy as unknown as {
    authenticate(req: unknown, options?: unknown): void;
    redirect: (url: string) => void;
    fail: () => void;
    error: (e: Error) => void;
    _oauth2: { getOAuthAccessToken: (code: string, params: Record<string, string>, cb: (e: Error) => void) => void };
  };
}

/** A request/response pair that records the cookies the store sets and clears. */
function fakeBrowser(cookies: Record<string, string>, query: Record<string, string> = {}) {
  const set: Record<string, string> = {};
  const cleared: string[] = [];
  const res = {
    cookie: (name: string, value: string) => { set[name] = value; },
    clearCookie: (name: string) => { cleared.push(name); },
  };
  const req = { query, cookies, res, headers: { host: 'example.test' }, connection: {} };
  return { req, set, cleared };
}

function run(strategy: ReturnType<typeof newStrategy>, req: unknown): Outcome {
  const outcome: Outcome = {};
  strategy.redirect = (url) => { outcome.redirect = url; };
  strategy.fail = () => { outcome.failed = true; };
  strategy.error = (e) => { outcome.error = e; };
  // Stand in for Google: record what the token exchange was sent, then stop
  // there. The profile fetch is not what this test is about.
  strategy._oauth2.getOAuthAccessToken = (_code, params, cb) => {
    outcome.exchangeParams = params;
    cb(new Error('stopped after the exchange'));
  };
  strategy.authenticate(req);
  return outcome;
}

/** Start a sign-in and return the cookie the browser would hold plus the state Google echoes. */
function startSignIn() {
  const strategy = newStrategy();
  const start = fakeBrowser({});
  const outcome = run(strategy, start.req);
  assert.ok(outcome.redirect, 'the start sends the browser to Google');
  const url = new URL(outcome.redirect);
  return { strategy, url, cookieValue: start.set[GOOGLE_STATE_COOKIE] };
}

test('starting sign-in sends an S256 challenge and a state, and remembers both in the browser', () => {
  const { url, cookieValue } = startSignIn();

  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.ok(url.searchParams.get('state'));
  assert.ok(cookieValue, 'a cookie is set for the callback to check');

  const [handle, verifier] = cookieValue.split('.');
  assert.equal(handle, url.searchParams.get('state'));
  assert.equal(
    createHash('sha256').update(verifier).digest('base64url'),
    url.searchParams.get('code_challenge'),
    'the challenge sent to Google is the hash of the verifier kept in the cookie',
  );
});

test('the callback from the same browser exchanges the code with the matching verifier', () => {
  const { strategy, url, cookieValue } = startSignIn();
  const verifier = cookieValue.split('.')[1];

  const back = fakeBrowser({ [GOOGLE_STATE_COOKIE]: cookieValue }, { code: 'abc', state: url.searchParams.get('state')! });
  const outcome = run(strategy, back.req);

  assert.equal(outcome.exchangeParams?.code_verifier, verifier);
  assert.deepEqual(back.cleared, [GOOGLE_STATE_COOKIE], 'single use: the cookie is cleared');
});

test('a callback with a different state is refused before any code is exchanged', () => {
  const { strategy, cookieValue } = startSignIn();

  const back = fakeBrowser({ [GOOGLE_STATE_COOKIE]: cookieValue }, { code: 'abc', state: 'someone-elses-state' });
  const outcome = run(strategy, back.req);

  assert.equal(outcome.failed, true);
  assert.equal(outcome.exchangeParams, undefined);
});

test('a callback from a browser that never started the sign-in is refused', () => {
  const { strategy, url } = startSignIn();

  const back = fakeBrowser({}, { code: 'abc', state: url.searchParams.get('state')! });
  const outcome = run(strategy, back.req);

  assert.equal(outcome.failed, true);
  assert.equal(outcome.exchangeParams, undefined);
});

test('a malformed cookie is refused rather than trusted', () => {
  const { strategy, url } = startSignIn();

  for (const value of ['', 'no-separator', '.only-verifier', 'handle.']) {
    const back = fakeBrowser({ [GOOGLE_STATE_COOKIE]: value }, { code: 'abc', state: url.searchParams.get('state')! });
    const outcome = run(strategy, back.req);
    assert.equal(outcome.failed, true, `cookie ${JSON.stringify(value)} must be refused`);
    assert.equal(outcome.exchangeParams, undefined);
  }
});

test('each sign-in gets its own state and verifier', () => {
  const first = startSignIn();
  const second = startSignIn();

  assert.notEqual(first.url.searchParams.get('state'), second.url.searchParams.get('state'));
  assert.notEqual(first.cookieValue.split('.')[1], second.cookieValue.split('.')[1]);
});
