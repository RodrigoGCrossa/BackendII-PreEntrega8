import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { sessionUser } from './publicUser.js';
export const generateToken = (user) => jwt.sign({ ...sessionUser(user) }, config.jwtSecret, {
  expiresIn: config.jwtExpiresIn, algorithm: 'HS256',
});
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
