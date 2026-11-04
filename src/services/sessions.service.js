import { usersRepository } from '../repositories/users.repository.js';
import { createHash, comparePassword } from '../utils/hash.js';
import { validateRegistration, validateLogin } from '../utils/validation.js';
import { HttpError } from '../utils/HttpError.js';
import { generateToken } from '../utils/jwt.js';
import { CurrentUserDTO } from '../dto/user.dto.js';

export async function registerUser(body) {
  const data = validateRegistration(body);
  if (await usersRepository.findByEmail(data.email)) throw new HttpError(409, 'El email ya está registrado');
  return usersRepository.create({ ...data, password: await createHash(data.password), role: 'user' });
}
export async function authenticateUser(body) {
  const { email, password } = validateLogin(body);
  const user = await usersRepository.findByEmail(email);
  if (!user || !(await comparePassword(password, user.password))) throw new HttpError(401, 'Credenciales inválidas');
  return user;
}
export async function getAuthenticatedUser(payload) {
  if (typeof payload.id !== 'string' || !/^[a-f\d]{24}$/i.test(payload.id)) return null;
  const user = await usersRepository.findById(payload.id);
  return user ? new CurrentUserDTO(user) : null;
}
export const createSessionToken = (user) => generateToken(user);
