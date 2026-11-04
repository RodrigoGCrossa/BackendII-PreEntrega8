import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration, validateLogin, validateId } from '../src/utils/validation.js';
import { publicUser } from '../src/utils/publicUser.js';
const data = { first_name: ' Ana ', last_name: ' Pérez ', email: ' Ana@Mail.com ', password: 'Secreta123' };
test('Normaliza email y nombres; descarta rol inyectado', () => {
  const user = validateRegistration({ ...data, role: 'admin' });
  assert.equal(user.email, 'ana@mail.com'); assert.equal(user.first_name, 'Ana'); assert.equal(user.role, undefined);
});
for (const body of [undefined, null, {}, { ...data, first_name: ' ' }, { ...data, email: 'malo' }, { ...data, password: 'corta' }, { ...data, password: 'á'.repeat(37) }, { ...data, password: 12345678 }]) {
  test(`Rechaza registro inválido ${JSON.stringify(body)}`, () => assert.throws(() => validateRegistration(body), { status: 400 }));
}
test('Login normaliza email', () => assert.equal(validateLogin(data).email, 'ana@mail.com'));
test('Login exige credenciales', () => assert.throws(() => validateLogin({}), { status: 400 }));
test('ID acepta ObjectId hexadecimal y rechaza entradas inválidas', () => { assert.equal(validateId('a'.repeat(24)), 'a'.repeat(24)); for (const id of ['x', '', null, {}]) assert.throws(() => validateId(id), { status: 400 }); });
test('La respuesta pública excluye password', () => { const user = publicUser({ ...data, _id: 'id', password: 'hash', role: 'user' }); assert.equal(user.id, 'id'); assert.equal('password' in user, false); });
