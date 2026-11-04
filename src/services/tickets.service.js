import { randomUUID } from 'node:crypto';
import { unitOfWorkRepository } from '../repositories/unit-of-work.repository.js';
import { eventsRepository } from '../repositories/events.repository.js';
import { ticketsRepository } from '../repositories/tickets.repository.js';
import { sendTicketConfirmation } from './mail.service.js';
import { requireEvent, checkOwner } from './events.service.js';
import { validateId } from '../utils/validation.js';
import { HttpError } from '../utils/HttpError.js';

export async function registerTicket(eventId, body, user) {
  validateId(eventId);
  const quantity = body?.quantity;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new HttpError(400, 'La cantidad debe ser un entero positivo');
  let result;
  try {
    result = await unitOfWorkRepository.run(async (session) => {
      // Serializa reservas, cancelaciones y cambios de capacidad del mismo evento.
      const event = await eventsRepository.lockForReservation(eventId, session);
      if (!event) throw new HttpError(404, 'Evento no encontrado');
      if (event.status !== 'published' || event.date <= new Date()) throw new HttpError(409, 'El evento no admite inscripciones');
      if (await ticketsRepository.findActiveRegistration(eventId, user.id, session)) throw new HttpError(409, 'Ya tenés una inscripción activa');
      const occupied = await ticketsRepository.countReservedPlaces(eventId, session);
      if (event.capacity - occupied < quantity) throw new HttpError(409, 'No hay cupos suficientes');
      const ticket = await ticketsRepository.createTicket({
        user: user.id, event: eventId, status: 'confirmed', quantity, reservationCode: randomUUID(),
      }, session);
      return { ticket, eventTitle: event.title };
    });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'Ya tenés una inscripción activa');
    throw error;
  }
  // El correo ocurre después del commit; un fallo SMTP no borra una reserva válida.
  let notification = 'sent';
  try {
    await sendTicketConfirmation({ to: user.email, eventTitle: result.eventTitle, code: result.ticket.reservationCode, quantity });
  } catch { notification = 'failed'; }
  return { ticket: result.ticket, notification };
}
export const myTickets = (user) => ticketsRepository.findUserTickets(user.id);
export async function listEventTickets(eventId, user) {
  const event = await requireEvent(eventId);
  checkOwner(event, user);
  return ticketsRepository.findEventTickets(eventId);
}
export async function cancelTicket(id, user) {
  validateId(id);
  return unitOfWorkRepository.run(async (session) => {
    const initial = await ticketsRepository.findById(id, session);
    if (!initial) throw new HttpError(404, 'Ticket no encontrado');
    await eventsRepository.lockForReservation(String(initial.event), session);
    const ticket = await ticketsRepository.findById(id, session);
    if (String(ticket.user) !== user.id && user.role !== 'admin') throw new HttpError(403, 'No tenés permisos para realizar esta acción');
    if (ticket.status === 'cancelled') throw new HttpError(409, 'El ticket ya está cancelado');
    return ticketsRepository.cancelTicket(id, new Date(), session);
  });
}
