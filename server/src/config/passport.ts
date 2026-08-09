import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
}

export default passport;
