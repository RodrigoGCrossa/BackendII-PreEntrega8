import { ticketsDAO } from '../dao/tickets.dao.js';

const activeStatuses = ['pending', 'confirmed'];
export const ticketsRepository = {
  createTicket: (data, session) => ticketsDAO.create(data, session),
  findById: (id, session) => ticketsDAO.findById(id, session),
  findActiveRegistration: (event, user, session) => ticketsDAO.findOne({ event, user, status: { $in: activeStatuses } }, session),
  countReservedPlaces: (event, session) => ticketsDAO.sumQuantity(event, activeStatuses, session),
  findUserTickets: (user) => ticketsDAO.findMany({ user }, { populateEvent: true }),
  findEventTickets: (event) => ticketsDAO.findMany({ event }),
  cancelTicket: (id, cancelledAt, session) => ticketsDAO.update(id, { status: 'cancelled', cancelledAt }, session),
};
