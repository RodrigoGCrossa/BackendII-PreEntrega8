import { test } from 'node:test';
import assert from 'node:assert/strict';
// Base de pruebas exclusiva: no usar una base con datos reales.
test('Persistencia MongoDB y registro seguro', { skip: !process.env.TEST_MONGO_URL }, async () => {
  process.env.MONGO_URL = process.env.TEST_MONGO_URL;
  process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
  const { disconnectDB } = await import('../../src/config/db.js');
  const { default: request } = await import('supertest');
  const { app } = await import('../../src/app.js');
  const { connectDB } = await import('../../src/config/db.js');
  const { usersDAO } = await import('../../src/dao/users.dao.js');
  const email = `integration-${Date.now()}@example.com`;
  let connected = false;
  try {
    await connectDB();
    connected = true;
    const result = await request(app).post('/api/sessions/register').send({ first_name: 'Test', last_name: 'Integración', email, password: 'TestSecreta123' }).expect(201);
    assert.equal('password' in result.body.payload, false);
    const stored = await usersDAO.findOne({ email }, { includePassword: true });
    assert.match(stored.password, /^\$2[aby]\$/);
  } finally {
    try { if (connected) await usersDAO.deleteOne({ email }); } finally { await disconnectDB(); }
  }
});
