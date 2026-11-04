import { Router } from 'express';
import { register, login, current, logout } from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { authenticate } from '../middlewares/passport.middleware.js';
export const sessionsRouter = Router();
sessionsRouter.post('/register', authenticate('register'), register);
sessionsRouter.post('/login', authenticate('login'), login);
sessionsRouter.get('/current', auth, current);
sessionsRouter.post('/logout', logout);
