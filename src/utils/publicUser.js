import { UserResponseDTO, CurrentUserDTO } from '../dto/user.dto.js';
export const publicUser = (user) => new UserResponseDTO(user);
export const sessionUser = (user) => new CurrentUserDTO(user);
