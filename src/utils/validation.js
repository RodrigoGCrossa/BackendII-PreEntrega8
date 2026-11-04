import { HttpError } from './HttpError.js';
export const normalizeEmail = (email) => email.trim().toLowerCase();
export function validateRegistration(body = {}) {
  const fields = ['first_name', 'last_name', 'email', 'password'];
  if (!body || fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) {
    throw new HttpError(400, 'Faltan campos obligatorios');
  }
  const email = normalizeEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email inválido');
  if (body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) {
    throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres y hasta 72 bytes');
  }
  return { first_name: body.first_name.trim(), last_name: body.last_name.trim(), email, password: body.password };
}
export function validateLogin(body = {}) {
  if (!body || typeof body.email !== 'string' || !body.email.trim() || typeof body.password !== 'string' || !body.password) {
    throw new HttpError(400, 'Email y contraseña son obligatorios');
  }
  if (Buffer.byteLength(body.password, 'utf8') > 72) throw new HttpError(401, 'Credenciales inválidas');
  return { email: normalizeEmail(body.email), password: body.password };
}
export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) throw new HttpError(400, 'Identificador inválido');
  return id;
}
