import { idOf } from './identity.js';
import { TicketEventDTO } from './event.dto.js';

export class TicketResponseDTO {
  constructor(ticket) {
    this._id = idOf(ticket);
    this.user = idOf(ticket.user);
    this.event = ticket.event && typeof ticket.event.title === 'string'
      ? new TicketEventDTO(ticket.event) : idOf(ticket.event);
    this.status = ticket.status;
    this.quantity = ticket.quantity;
    this.reservationCode = ticket.reservationCode;
    this.createdAt = ticket.createdAt;
    this.updatedAt = ticket.updatedAt;
    this.cancelledAt = ticket.cancelledAt ?? null;
  }
}
