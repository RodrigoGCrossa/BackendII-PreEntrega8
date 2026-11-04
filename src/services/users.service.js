import { usersRepository } from '../repositories/users.repository.js';
import { UserResponseDTO } from '../dto/user.dto.js';
import { HttpError } from '../utils/HttpError.js';

export const listUsers = async () => (await usersRepository.list()).map((user) => new UserResponseDTO(user));
export async function assignUserRole(email, role) {
  if (typeof email !== 'string' || !email.trim() || !['user', 'organizer', 'admin'].includes(role)) throw new HttpError(400, 'Email y rol válidos son obligatorios');
  const user = await usersRepository.assignRole(email.trim().toLowerCase(), role);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return new UserResponseDTO(user);
}
