import { listUsers } from '../services/users.service.js';
export const getUsers = async (req, res) => res.json({ status: 'success', payload: await listUsers() });
