import Event from '../models/Event.js';

export const eventsDAO = {
  initialize: () => Event.init(),
  create: async (data) => (await Event.create(data)).toObject(),
  findById: (id, session = null) => Event.findById(id).session(session).lean(),
  findMany: (filter, { skip = 0, limit = 20, sort = 'date' } = {}) => Event.find(filter).sort(sort).skip(skip).limit(limit).lean(),
  count: (filter) => Event.countDocuments(filter),
  update: (id, data, session = null) => Event.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true, session }).lean(),
  lock: (id, session) => Event.findOneAndUpdate({ _id: id }, { $inc: { reservationVersion: 1 } }, { new: true, session }).lean(),
};
