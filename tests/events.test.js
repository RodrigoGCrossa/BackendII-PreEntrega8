import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventData, eventQuery } from '../src/utils/eventValidation.js';
import { authorize } from '../src/middlewares/authorize.middleware.js';
const data = { title: ' Backend ', description: 'Taller', category: 'workshop', date: '2099-05-01T18:00:00.000Z', location: 'Montevideo', capacity: 10, price: 0 };
test('Evento válido se normaliza y descarta organizer recibido', () => { const event = eventData({ ...data, organizer: 'intruso' }); assert.equal(event.title, 'Backend'); assert.equal(event.status, 'draft'); assert.equal(event.organizer, undefined); });
for (const patch of [{ date: '2000-01-01' }, { date: 'invalida' }, { date: '2099-02-31' }, { capacity: 0 }, { capacity: 1.5 }, { capacity: '10' }, { price: -1 }, { price: Infinity }, { title: '' }, { status: 'other' }]) {
  test(`Rechaza evento ${JSON.stringify(patch)}`, () => assert.throws(() => eventData({ ...data, ...patch }), { status: 400 }));
}
test('No modifica cancelados o finalizados', () => { for (const status of ['cancelled', 'finished']) assert.throws(() => eventData({ title: 'Nuevo' }, { ...data, status }), { status: 409 }); });
test('No permite publicar un evento pasado', () => assert.throws(() => eventData({ status: 'published' }, { ...data, date: '2000-01-01', status: 'draft' }), { status: 400 }));
test('Filtros y paginación válidos', () => { const q = eventQuery({ status: 'published', category: 'workshop', page: '2', limit: '5', sort: '-date' }); assert.equal(q.page, 2); assert.equal(q.filter.status, 'published'); assert.equal(q.limit, 5); });
for (const query of [{ page: 0 }, { limit: 101 }, { sort: '$where' }, { status: {} }, { dateFrom: 'no' }, { dateFrom: '2099-01-01', dateTo: '2090-01-01' }]) {
  test(`Rechaza consulta ${JSON.stringify(query)}`, () => assert.throws(() => eventQuery(query), { status: 400 }));
}
for (const [user, status] of [[undefined, 401], [{ role: 'user' }, 403], [{ role: 'organizer' }, undefined], [{ role: 'admin' }, undefined]]) {
  test(`Autorización ${user?.role ?? 'sin sesión'}: ${status ?? 'permitida'}`, () => { let error; authorize('organizer', 'admin')({ user }, {}, (e) => { error = e; }); assert.equal(error?.status, status); });
}
