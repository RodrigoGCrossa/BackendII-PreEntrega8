import { usersDAO } from '../dao/users.dao.js';

export const usersRepository = {
  findByEmail: (email) => usersDAO.findOne({ email }, { includePassword: true }),
  findById: (id) => usersDAO.findById(id),
  create: (data) => usersDAO.create(data),
  list: () => usersDAO.findMany(),
  assignRole: (email, role) => usersDAO.update({ email }, { role }),
};
