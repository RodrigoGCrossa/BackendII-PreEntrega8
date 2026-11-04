import { idOf } from './identity.js';

export class EventResponseDTO {
  constructor(event) {
    this.id = idOf(event);
    this.title = event.title;
    this.description = event.description;
    this.category = event.category;
    this.date = event.date;
    this.location = event.location;
    this.capacity = event.capacity;
    this.price = event.price;
    this.status = event.status;
    this.organizer = idOf(event.organizer);
    this.createdAt = event.createdAt;
    this.updatedAt = event.updatedAt;
  }
}
// Conserva la forma del populate de mis tickets, filtrando cualquier campo agregado.
export class TicketEventDTO {
  constructor(event) {
    this._id = idOf(event);
    this.title = event.title;
    this.date = event.date;
    this.location = event.location;
  }
}
