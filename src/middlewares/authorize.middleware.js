import { HttpError } from '../utils/HttpError.js';
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'No autenticado'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'No tenés permisos para realizar esta acción'));
  next();
};
