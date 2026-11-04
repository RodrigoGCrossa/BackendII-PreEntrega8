import { authenticate } from './passport.middleware.js';
export const auth = authenticate('current');
