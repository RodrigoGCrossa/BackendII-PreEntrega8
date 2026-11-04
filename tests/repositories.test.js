import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ticketsDAO } from '../src/dao/tickets.dao.js';
import { eventsDAO } from '../src/dao/events.dao.js';
import { ticketsRepository } from '../src/repositories/tickets.repository.js';
import { eventsRepository } from '../src/repositories/events.repository.js';
afterEach(() => mock.restoreAll());
test('La política de cupos cuenta cantidades de confirmed y pending, nunca cancelled', async () => {
  const sum = mock.method(ticketsDAO, 'sumQuantity', async () => 3);
  const session = {};
  assert.equal(await ticketsRepository.countReservedPlaces('event', session), 3);
  assert.deepEqual(sum.mock.calls[0].arguments, ['event', ['pending', 'confirmed'], session]);
});
test('Cancelar conserva el documento y actualiza exclusivamente estado y fecha', async () => {
  const update = mock.method(ticketsDAO, 'update', async (id, data) => ({ _id: id, ...data }));
  const date = new Date(), session = {};
  const result = await ticketsRepository.cancelTicket('ticket', date, session);
  assert.equal(result.status, 'cancelled');
  assert.deepEqual(update.mock.calls[0].arguments, ['ticket', { status: 'cancelled', cancelledAt: date }, session]);
});
test('Consulta de eventos publicados no permite sobrescribir ese estado', async () => {
  const find = mock.method(eventsDAO, 'findMany', async () => []);
  await eventsRepository.findPublishedEvents({ status: 'cancelled', category: 'workshop' }, { limit: 5 });
  assert.deepEqual(find.mock.calls[0].arguments[0], { status: 'published', category: 'workshop' });
});
