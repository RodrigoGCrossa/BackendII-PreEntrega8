import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy } from 'passport-jwt';
import { config } from './config.js';
import { registerUser, authenticateUser, getAuthenticatedUser } from '../services/sessions.service.js';

export function configurePassport() {
  const options = { usernameField: 'email', passwordField: 'password', passReqToCallback: true };
  passport.use('register', new LocalStrategy(options, async (req, email, password, done) => {
    try { done(null, await registerUser(req.body)); } catch (error) { done(error); }
  }));
  passport.use('login', new LocalStrategy(options, async (req, email, password, done) => {
    try { done(null, await authenticateUser(req.body)); } catch (error) { done(error); }
  }));
  passport.use('current', new JWTStrategy({
    jwtFromRequest: (req) => req.cookies?.currentUser || null,
    secretOrKeyProvider: (req, token, done) => config.jwtSecret ? done(null, config.jwtSecret) : done(new Error('JWT_SECRET no configurado')),
    algorithms: ['HS256'],
  }, async (payload, done) => {
    try { done(null, await getAuthenticatedUser(payload)); } catch (error) { done(error); }
  }));
}
