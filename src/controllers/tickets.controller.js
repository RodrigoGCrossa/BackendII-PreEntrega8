import { TicketResponseDTO } from '../dto/ticket.dto.js';
import * as service from '../services/tickets.service.js';
export async function createTicket(req, res) {
  const { ticket, notification } = await service.registerTicket(req.params.eid, req.body, req.user);
  res.status(201).json({ status: 'success', payload: new TicketResponseDTO(ticket), notification });
}
export const myTickets = async (req, res) => res.json({ status: 'success', payload: (await service.myTickets(req.user)).map((ticket) => new TicketResponseDTO(ticket)) });
export const eventTickets = async (req, res) => res.json({ status: 'success', payload: (await service.listEventTickets(req.params.eid, req.user)).map((ticket) => new TicketResponseDTO(ticket)) });
export const cancelTicket = async (req, res) => res.json({ status: 'success', payload: new TicketResponseDTO(await service.cancelTicket(req.params.tid, req.user)) });
