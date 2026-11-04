import supertest from 'supertest';
import { inprocessRequest } from './inprocess-request.js';
export default process.env.TEST_TRANSPORT === 'inprocess' ? inprocessRequest : supertest;
