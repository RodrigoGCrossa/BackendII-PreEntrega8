import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler, notFound } from '../src/middlewares/error.middleware.js';
import { HttpError } from '../src/utils/HttpError.js';
function response() { return { code: null, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
for (const [error, expected, message] of [
  [new HttpError(403, 'Sin permiso'), 403, 'Sin permiso'],
  [new Error('clave privada'), 500, 'Error interno del servidor'],
  [{ type: 'entity.parse.failed', status: 400 }, 400, 'JSON inválido'],
  [{ name: 'CastError' }, 400, 'Datos inválidos'],
  [{ code: 11000 }, 409, 'El email ya está registrado'],
]) {
  test(`Error ${expected}: ${message}`, () => {
    const res = response(); errorHandler(error, {}, res, () => {});
    assert.equal(res.code, expected); assert.deepEqual(res.body, { status: 'error', message });
  });
}
test('Ruta desconocida devuelve 404', () => { const res = response(); notFound({}, res); assert.equal(res.code, 404); });
test('Respuesta iniciada delega el error', () => { const error = new Error('fallo'); let received; errorHandler(error, {}, { headersSent: true }, (e) => { received = e; }); assert.equal(received, error); });
