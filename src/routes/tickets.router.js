import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { myTickets, cancelTicket } from '../controllers/tickets.controller.js';
export const ticketsRouter = Router();
ticketsRouter.get('/my-tickets', auth, myTickets);
ticketsRouter.patch('/:tid/cancel', auth, cancelTicket);
