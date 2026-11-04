import passport from 'passport';
import { HttpError } from '../utils/HttpError.js';
export const authenticate = (strategy) => (req, res, next) => {
  passport.authenticate(strategy, { session: false }, (error, user, info, status) => {
    if (error) return next(error);
    if (!user) {
      const code = strategy === 'register' || status === 400 ? 400 : 401;
      const message = strategy === 'current' ? 'No autenticado'
        : strategy === 'register' ? 'Faltan campos obligatorios'
          : status === 400 ? 'Email y contraseña son obligatorios' : 'Credenciales inválidas';
      return next(new HttpError(code, message));
    }
    req.user = user;
    next();
  })(req, res, next);
};
