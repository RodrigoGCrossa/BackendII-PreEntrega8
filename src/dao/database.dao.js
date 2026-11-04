import mongoose from 'mongoose';
import { usersDAO } from './users.dao.js';
import { eventsDAO } from './events.dao.js';
import { ticketsDAO } from './tickets.dao.js';

export const databaseDAO = {
  async connect(url) {
    await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
    await usersDAO.initialize();
    await eventsDAO.initialize();
    await ticketsDAO.initialize();
  },
  disconnect: () => mongoose.disconnect(),
  transaction: (work) => mongoose.connection.transaction(work),
};
