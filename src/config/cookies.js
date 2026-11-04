import { config } from './config.js';
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/' };
