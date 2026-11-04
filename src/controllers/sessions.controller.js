import { UserResponseDTO, CurrentUserDTO } from '../dto/user.dto.js';
import { createSessionToken } from '../services/sessions.service.js';
import { cookieOptions } from '../config/cookies.js';

export function register(req, res) {
  res.status(201).json({ status: 'success', payload: new UserResponseDTO(req.user) });
}
export function login(req, res) {
  res.cookie('currentUser', createSessionToken(req.user), { ...cookieOptions, maxAge: 3600000 });
  res.json({ status: 'success', message: 'Login correcto' });
}
export const current = (req, res) => res.json({ status: 'success', payload: new CurrentUserDTO(req.user) });
export function logout(req, res) {
  res.clearCookie('currentUser', cookieOptions);
  res.json({ status: 'success', message: 'Sesión cerrada' });
}
