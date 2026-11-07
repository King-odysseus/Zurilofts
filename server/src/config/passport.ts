import passport from 'passport';
import { Strategy as GoogleStrategy, type StrategyOptions } from 'passport-google-oauth20';
import { env } from './env.js';
import { GoogleCookieStore } from '../utils/googleOAuthStore.js';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        scope: ['profile', 'email'],
        // PKCE with a cookie-backed store: ties the sign-in to the browser that
        // started it, using no server session.
        pkce: true,
        // The published typings only describe the session-store call shape; the
        // library itself calls the five-argument form when pkce is on.
        store: new GoogleCookieStore() as unknown as StrategyOptions['store'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
}

export default passport;
