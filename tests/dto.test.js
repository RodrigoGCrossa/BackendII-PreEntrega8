import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserResponseDTO, CurrentUserDTO } from '../src/dto/user.dto.js';
import { EventResponseDTO } from '../src/dto/event.dto.js';
import { TicketResponseDTO } from '../src/dto/ticket.dto.js';
const id = 'a'.repeat(24), uid = 'b'.repeat(24);
const secret = { password: 'hash-privado', refreshToken: 'token-privado', __v: 5, reservationVersion: 4 };
const json = (value) => JSON.parse(JSON.stringify(value));
function safe(value) {
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    assert.equal(['password', 'refreshToken', '__v', 'reservationVersion'].includes(key), false, key);
    safe(child);
  }
}
test('Usuario y current exponen únicamente su contrato público', () => {
  const user = { _id: uid, first_name: 'Ana', last_name: 'Pérez', email: 'ana@example.com', role: 'user', ...secret };
  assert.deepEqual(Object.keys(json(new UserResponseDTO(user))).sort(), ['email', 'first_name', 'id', 'last_name', 'role']);
  assert.deepEqual(json(new CurrentUserDTO(user)), { id: uid, email: user.email, role: 'user' });
  safe(new UserResponseDTO(user));
});
test('Evento descarta internals y limita organizer poblado a su referencia', () => {
  const event = new EventResponseDTO({ _id: id, title: 'Backend', organizer: { _id: uid, ...secret }, ...secret });
  assert.equal(event.id, id); assert.equal(event.organizer, uid); safe(event);
});
test('Ticket conserva _id y filtra user y event incluso si vienen poblados', () => {
  const dto = json(new TicketResponseDTO({ _id: id, user: { _id: uid, email: 'privado@example.com', ...secret }, event: { _id: id, title: 'Backend', date: '2099-01-01', location: 'Montevideo', organizer: { ...secret }, ...secret }, status: 'confirmed', quantity: 2, reservationCode: 'reserva', ...secret }));
  assert.equal(dto._id, id); assert.equal(dto.user, uid);
  assert.deepEqual(dto.event, { _id: id, title: 'Backend', date: '2099-01-01', location: 'Montevideo' });
  assert.equal(dto.cancelledAt, null); safe(dto);
});
test('Referencias ObjectId se serializan sin filtrar documentos crudos', () => {
  const ref = { toHexString: () => id };
  const dto = new TicketResponseDTO({ _id: ref, user: ref, event: ref });
  assert.equal(dto._id, id); assert.equal(dto.user, id); assert.equal(dto.event, id);
});
test('Evento eliminado o populate null se conserva como null', () => assert.equal(new TicketResponseDTO({ _id: id, event: null }).event, null));
