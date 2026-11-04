import { databaseDAO } from '../dao/database.dao.js';
export const unitOfWorkRepository = { run: (work) => databaseDAO.transaction(work) };
