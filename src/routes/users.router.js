import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { getUsers } from '../controllers/users.controller.js';
export const usersRouter = Router();
usersRouter.get('/', auth, authorize('admin'), getUsers);
