import { eventsRepository } from '../repositories/events.repository.js';
import { eventData, eventQuery } from '../utils/eventValidation.js';
import { validateId } from '../utils/validation.js';
import { HttpError } from '../utils/HttpError.js';
import { unitOfWorkRepository } from '../repositories/unit-of-work.repository.js';
import { ticketsRepository } from '../repositories/tickets.repository.js';

export async function requireEvent(id, session = null) {
  validateId(id);
  const event = await eventsRepository.findById(id, session);
  if (!event) throw new HttpError(404, 'Evento no encontrado');
  return event;
}
export function checkOwner(event, user) {
  if (user.role !== 'admin' && (user.role !== 'organizer' || String(event.organizer) !== user.id)) {
    throw new HttpError(403, 'No tenés permisos para realizar esta acción');
  }
}
export const createEvent = (body, user) => eventsRepository.createEvent({ ...eventData(body), organizer: user.id });
export async function updateEvent(id, body, user) {
  validateId(id);
  return unitOfWorkRepository.run(async (session) => {
    const event = await eventsRepository.lockForReservation(id, session);
    if (!event) throw new HttpError(404, 'Evento no encontrado');
    checkOwner(event, user);
    const data = eventData(body, event);
    if (data.capacity !== undefined && data.capacity < await ticketsRepository.countReservedPlaces(id, session)) {
      throw new HttpError(409, 'La capacidad no puede ser menor que los cupos ocupados');
    }
    return eventsRepository.updateEvent(id, data, session);
  });
}
export async function listEvents(query) {
  const { filter, page, limit, sort } = eventQuery(query);
  const [data, total] = await Promise.all([
    eventsRepository.findEventsByFilters(filter, { skip: (page - 1) * limit, limit, sort }),
    eventsRepository.countEvents(filter),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}
export function changeStatus(id, body, user) {
  if (!body || typeof body.status !== 'string') throw new HttpError(400, 'El estado es obligatorio');
  return updateEvent(id, { status: body.status }, user);
}
