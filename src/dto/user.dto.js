import { idOf } from './identity.js';

export class UserResponseDTO {
  constructor(user) {
    this.id = idOf(user);
    this.first_name = user.first_name;
    this.last_name = user.last_name;
    this.email = user.email;
    this.role = user.role;
  }
}
export class CurrentUserDTO {
  constructor(user) {
    this.id = idOf(user);
    this.email = user.email;
    this.role = user.role;
  }
}
