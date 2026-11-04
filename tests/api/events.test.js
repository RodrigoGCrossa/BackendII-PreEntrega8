import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
const { default: request } = await import('../helpers/request.js');
const { app } = await import('../../src/app.js');
const { generateToken } = await import('../../src/utils/jwt.js');
const { usersRepository } = await import('../../src/repositories/users.repository.js');
const { eventsRepository } = await import('../../src/repositories/events.repository.js');
const user = { _id: '1'.repeat(24), email: 'organizer@example.com', role: 'organizer' };
const cookie = () => `currentUser=${generateToken(user)}`;
const id = 'a'.repeat(24);
let event = { _id: id, title: 'Taller', description: 'Backend', category: 'workshop', location: 'Montevideo', date: new Date('2099-05-01'), capacity: 10, price: 0, status: 'published', organizer: user._id };
mock.method(usersRepository, 'findById', async () => user);
mock.method(eventsRepository, 'findById', async (value) => value === id ? event : null);
mock.method(eventsRepository, 'updateEvent', async (id, data) => Object.assign(event, data));
if (eventsRepository.lockForReservation) {
  const { unitOfWorkRepository } = await import('../../src/repositories/unit-of-work.repository.js');
  const { ticketsRepository } = await import('../../src/repositories/tickets.repository.js');
  mock.method(unitOfWorkRepository, 'run', async (work) => work({}));
  mock.method(eventsRepository, 'lockForReservation', async (value) => value === id ? event : null);
  mock.method(ticketsRepository, 'countReservedPlaces', async () => 0);
}
after(() => mock.restoreAll());
test('Propietario modifica; organizer ajeno no; admin sí; cancelado no cambia', async () => {
  await request(app).put(`/api/events/${id}`).set('Cookie', cookie()).send({ title: 'Propio' }).expect(200);
  event.organizer = '2'.repeat(24);
  await request(app).put(`/api/events/${id}`).set('Cookie', cookie()).send({ title: 'Ajeno' }).expect(403);
  user.role = 'admin';
  await request(app).put(`/api/events/${id}`).set('Cookie', cookie()).send({ title: 'Admin' }).expect(200);
  event.status = 'cancelled';
  await request(app).put(`/api/events/${id}`).set('Cookie', cookie()).send({ status: 'published' }).expect(409);
  await request(app).put(`/api/events/${'b'.repeat(24)}`).set('Cookie', cookie()).send({ title: 'No existe' }).expect(404);
  await request(app).put('/api/events/invalido').set('Cookie', cookie()).send({}).expect(400);
});
test('Listado pagina y filtra con los parámetros del contrato', async () => {
  let options, filter;
  mock.method(eventsRepository, 'findEventsByFilters', async (f, o) => { filter = f; options = o; return [event]; });
  mock.method(eventsRepository, 'countEvents', async () => 6);
  const result = await request(app).get('/api/events?status=published&category=workshop&page=2&limit=5&sort=-date').expect(200);
  assert.equal(result.body.page, 2); assert.equal(result.body.totalPages, 2); assert.equal(result.body.total, 6);
  assert.equal(filter.category, 'workshop'); assert.equal(options.skip, 5); assert.equal(options.limit, 5); assert.equal(options.sort, '-date');
  assert.equal(result.body.data[0].id, id);
  await request(app).get(`/api/events/${'b'.repeat(24)}`).expect(404);
  await request(app).get('/api/events?page=0').expect(400);
});
