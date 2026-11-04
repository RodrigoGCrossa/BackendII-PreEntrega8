import { config } from './config.js';
import { databaseDAO } from '../dao/database.dao.js';
export const connectDB = () => databaseDAO.connect(config.mongoUrl);
export const disconnectDB = () => databaseDAO.disconnect();
