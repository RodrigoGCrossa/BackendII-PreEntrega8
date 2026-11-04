import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';

export const ticketsDAO = {
  initialize: () => Ticket.init(),
  create: async (data, session) => (await Ticket.create([data], { session }))[0].toObject(),
  findById: (id, session = null) => Ticket.findById(id).session(session).lean(),
  findOne: (filter, session = null) => Ticket.findOne(filter).session(session).lean(),
  sumQuantity: async (event, statuses, session) => {
    const result = await Ticket.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(event), status: { $in: statuses } } },
      { $group: { _id: null, quantity: { $sum: '$quantity' } } },
    ]).session(session);
    return result[0]?.quantity ?? 0;
  },
  findMany: (filter, { populateEvent = false } = {}) => {
    const query = Ticket.find(filter);
    if (populateEvent) query.populate('event', 'title date location');
    return query.lean();
  },
  update: (id, data, session) => Ticket.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true, session }).lean(),
};
