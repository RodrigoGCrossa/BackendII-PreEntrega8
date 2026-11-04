import { eventsDAO } from '../dao/events.dao.js';

export const eventsRepository = {
  createEvent: (data) => eventsDAO.create(data),
  findById: (id, session) => eventsDAO.findById(id, session),
  findEventsByFilters: (filter, options) => eventsDAO.findMany(filter, options),
  findPublishedEvents: (filter = {}, options) => eventsDAO.findMany({ ...filter, status: 'published' }, options),
  countEvents: (filter) => eventsDAO.count(filter),
  updateEvent: (id, data, session) => eventsDAO.update(id, data, session),
  lockForReservation: (id, session) => eventsDAO.lock(id, session),
};
