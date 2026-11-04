import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
process.env.NODE_ENV = 'test';
Object.assign(process.env, { MAIL_HOST: 'smtp.example.com', MAIL_FROM: 'events@example.com', MAIL_PORT: '587' });
const { default: request } = await import('../helpers/request.js');
const { app } = await import('../../src/app.js');
const { usersDAO } = await import('../../src/dao/users.dao.js');
const { eventsDAO } = await import('../../src/dao/events.dao.js');
const { ticketsDAO } = await import('../../src/dao/tickets.dao.js');
const { databaseDAO } = await import('../../src/dao/database.dao.js');
const { assignUserRole } = await import('../../src/services/users.service.js');
const { default: nodemailer } = await import('nodemailer');
const users = [], events = [], tickets = [];
let sequence = 1;
const nextId = () => (sequence++).toString(16).padStart(24, '0');
// Solo el acceso a datos y el transporte SMTP se sustituyen. Las capas intermedias son reales.
mock.method(databaseDAO, 'transaction', async (work) => work({}));
mock.method(usersDAO, 'findOne', async ({ email }) => users.find((user) => user.email === email) ?? null);
mock.method(usersDAO, 'findById', async (id) => users.find((user) => user._id === id) ?? null);
mock.method(usersDAO, 'create', async (data) => { const user = { ...data, _id: nextId() }; users.push(user); return user; });
mock.method(usersDAO, 'update', async ({ email }, data) => {
  const user = users.find((item) => item.email === email);
  return user ? Object.assign(user, data) : null;
});
mock.method(eventsDAO, 'create', async (data) => { const event = { ...data, _id: nextId(), __v: 4, reservationVersion: 7 }; events.push(event); return event; });
mock.method(eventsDAO, 'findById', async (id) => events.find((event) => event._id === id) ?? null);
mock.method(eventsDAO, 'lock', async (id) => events.find((event) => event._id === id) ?? null);
mock.method(eventsDAO, 'update', async (id, data) => Object.assign(events.find((event) => event._id === id), data));
mock.method(ticketsDAO, 'findOne', async (filter) => tickets.find((ticket) => ticket.event === filter.event && ticket.user === filter.user && filter.status.$in.includes(ticket.status)) ?? null);
mock.method(ticketsDAO, 'sumQuantity', async (event, statuses) => tickets.filter((ticket) => ticket.event === event && statuses.includes(ticket.status)).reduce((sum, ticket) => sum + ticket.quantity, 0));
mock.method(ticketsDAO, 'create', async (data) => { const ticket = { ...data, _id: nextId(), __v: 1, cancelledAt: null, createdAt: new Date() }; tickets.push(ticket); return ticket; });
mock.method(ticketsDAO, 'findById', async (id) => tickets.find((ticket) => ticket._id === id) ?? null);
mock.method(ticketsDAO, 'update', async (id, data) => Object.assign(tickets.find((ticket) => ticket._id === id), data));
mock.method(ticketsDAO, 'findMany', async (filter, options) => tickets.filter((ticket) => ticket.user === filter.user).map((ticket) => ({
  ...ticket,
  // Un populate demasiado amplio nunca debe provocar fugas en la respuesta.
  user: { ...users.find((user) => user._id === ticket.user), internalNote: 'privado' },
  event: options.populateEvent ? {
    ...events.find((event) => event._id === ticket.event), password: 'hash-no-publico',
    organizer: { _id: users[0]._id, password: users[0].password },
  } : ticket.event,
})));
const sendMail = mock.fn(async () => ({ accepted: ['attendee@example.com'] }));
mock.method(nodemailer, 'createTransport', () => ({ sendMail }));
after(() => mock.restoreAll());
function assertSafe(data) {
  if (data && typeof data === 'object') for (const [key, value] of Object.entries(data)) {
    assert.equal(['password', '__v', 'reservationVersion', 'internalNote'].includes(key), false, key);
    assertSafe(value);
  }
}

test('Flujo completo por todas las capas y DTO de documentos poblados', async () => {
  const organizer = request.agent(app), attendee = request.agent(app);
  const organizerData = { first_name: 'Org', last_name: 'Test', email: 'organizer@example.com', password: 'Secreta123', role: 'admin' };
  const attendeeData = { first_name: 'Ana', last_name: 'Test', email: 'attendee@example.com', password: 'Secreta123' };
  const registered = await organizer.post('/api/sessions/register').send(organizerData).expect(201);
  assert.equal(registered.body.payload.role, 'user'); assertSafe(registered.body);
  await assignUserRole(organizerData.email, 'organizer');
  await attendee.post('/api/sessions/register').send(attendeeData).expect(201);
  await organizer.post('/api/sessions/login').send(organizerData).expect(200);
  await attendee.post('/api/sessions/login').send(attendeeData).expect(200);
  const current = await attendee.get('/api/sessions/current').expect(200);
  assert.deepEqual(Object.keys(current.body.payload).sort(), ['email', 'id', 'role']);
  const eventData = { title: 'Workshop', description: 'Backend', date: '2099-05-01T18:00:00Z', category: 'workshop', location: 'Montevideo', capacity: 2, price: 0, status: 'published', organizer: 'f'.repeat(24) };
  await request(app).post('/api/events').send(eventData).expect(401);
  await attendee.post('/api/events').send(eventData).expect(403);
  const event = await organizer.post('/api/events').send(eventData).expect(201);
  assert.equal(event.body.payload.organizer, registered.body.payload.id); assertSafe(event.body);
  const eid = event.body.payload.id;
  const ticket = await attendee.post(`/api/events/${eid}/tickets`).send({ quantity: 2 }).expect(201);
  assert.equal(ticket.body.notification, 'sent'); assert.equal(sendMail.mock.callCount(), 1); assertSafe(ticket.body);
  const tid = ticket.body.payload._id;
  await attendee.post(`/api/events/${eid}/tickets`).send({ quantity: 1 }).expect(409);
  const mine = await attendee.get('/api/tickets/my-tickets').expect(200);
  assertSafe(mine.body);
  assert.equal(mine.body.payload[0].user, current.body.payload.id);
  assert.deepEqual(Object.keys(mine.body.payload[0].event).sort(), ['_id', 'date', 'location', 'title']);
  const cancelled = await attendee.patch(`/api/tickets/${tid}/cancel`).expect(200);
  assert.equal(cancelled.body.payload._id, tid); assert.equal(cancelled.body.payload.status, 'cancelled');
  assert.ok(cancelled.body.payload.cancelledAt); assertSafe(cancelled.body);
  await attendee.patch(`/api/tickets/${tid}/cancel`).expect(409);
  await attendee.post(`/api/events/${eid}/tickets`).send({ quantity: 2 }).expect(201);
  await attendee.post('/api/sessions/logout').expect(200);
  await attendee.get('/api/sessions/current').expect(401);
});

test('Error inesperado del DAO se transforma en 500 sin filtrar detalles', async () => {
  mock.method(usersDAO, 'findOne', async () => { throw new Error('URI y detalles privados de persistencia'); });
  const result = await request(app).post('/api/sessions/login').send({ email: 'user@example.com', password: 'Secreta123' }).expect(500);
  assert.deepEqual(result.body, { status: 'error', message: 'Error interno del servidor' });
});
