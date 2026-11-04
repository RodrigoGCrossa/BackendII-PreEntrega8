import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
process.env.NODE_ENV = 'test';
const { default: request } = await import('../helpers/request.js');
const { app } = await import('../../src/app.js');
after(() => mock.restoreAll());
test('Health y rutas desconocidas', async () => {
  const health = await request(app).get('/api/health').expect(200);
  assert.deepEqual(health.body, { status: 'ok', message: 'Servidor activo' });
  await request(app).get('/no-existe').expect(404);
});
test('JSON malformado', async () => { await request(app).post('/api/sessions/register').set('Content-Type', 'application/json').send('{').expect(400); });
const { usersRepository } = await import('../../src/repositories/users.repository.js');
const { comparePassword } = await import('../../src/utils/hash.js');
const users = [];
mock.method(usersRepository, 'findByEmail', async (email) => users.find((u) => u.email === email) ?? null);
mock.method(usersRepository, 'findById', async (id) => users.find((u) => u._id === id) ?? null);
mock.method(usersRepository, 'create', async (data) => { const user = { ...data, _id: (users.length + 1).toString(16).padStart(24, '0') }; users.push(user); return user; });
const data = { first_name: 'Ana', last_name: 'Pérez', email: ' Ana@Mail.com ', password: 'Secreta123', role: 'admin' };
test('Registro, validaciones, duplicado y hash real bcrypt', async () => {
  await request(app).post('/api/sessions/register').send({}).expect(400);
  await request(app).post('/api/sessions/register').send({ ...data, email: 'invalido' }).expect(400);
  await request(app).post('/api/sessions/register').send({ ...data, password: 'corta' }).expect(400);
  const result = await request(app).post('/api/sessions/register').send(data).expect(201);
  assert.equal(result.body.payload.email, 'ana@mail.com');
  assert.equal(result.body.payload.role, 'user');
  assert.equal('password' in result.body.payload, false);
  assert.notEqual(users[0].password, data.password);
  assert.equal(await comparePassword(data.password, users[0].password), true);
  await request(app).post('/api/sessions/register').send(data).expect(409);
});
test('Login, JWT, cookie, current y logout', async () => {
  const agent = request.agent(app);
  for (const body of [{ email: 'no@mail.com', password: data.password }, { email: 'ana@mail.com', password: 'incorrecta' }]) {
    const result = await agent.post('/api/sessions/login').send(body).expect(401);
    assert.equal(result.body.message, 'Credenciales inválidas');
  }
  await agent.post('/api/sessions/login').send({}).expect(400);
  const login = await agent.post('/api/sessions/login').send(data).expect(200);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.match(login.headers['set-cookie'][0], /SameSite=Lax/);
  assert.match(login.headers['set-cookie'][0], /Max-Age=3600/);
  const current = await agent.get('/api/sessions/current').expect(200);
  assert.deepEqual(Object.keys(current.body.payload).sort(), ['email', 'id', 'role']);
  const { verifyToken } = await import('../../src/utils/jwt.js');
  const token = decodeURIComponent(login.headers['set-cookie'][0].split(';')[0].split('=')[1]);
  assert.equal('password' in verifyToken(token), false);
  await request(app).get('/api/sessions/current').set('Cookie', 'currentUser=manipulado').expect(401);
  const { default: jwt } = await import('jsonwebtoken');
  const expired = jwt.sign({ id: users[0]._id, email: users[0].email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: -1 });
  await request(app).get('/api/sessions/current').set('Cookie', `currentUser=${expired}`).expect(401);
  await agent.post('/api/sessions/logout').expect(200);
  await agent.get('/api/sessions/current').expect(401);
});
test('Permisos de usuario, organizer y admin', async () => {
  const { eventsRepository } = await import('../../src/repositories/events.repository.js');
  mock.method(eventsRepository, 'createEvent', async (body) => ({ ...body, _id: 'a'.repeat(24) }));
  mock.method(usersRepository, 'list', async () => users);
  const event = { title: 'Backend', description: 'Taller', category: 'workshop', date: '2099-05-01T18:00:00Z', location: 'Montevideo', capacity: 5, price: 0 };
  const agent = request.agent(app);
  await agent.post('/api/sessions/login').send(data).expect(200);
  await agent.post('/api/events').send(event).expect(403);
  await request(app).post('/api/events').send(event).expect(401);
  users[0].role = 'organizer';
  await agent.post('/api/sessions/login').send(data).expect(200);
  const created = await agent.post('/api/events').send({ ...event, organizer: 'f'.repeat(24) }).expect(201);
  assert.equal(created.body.payload.organizer, users[0]._id);
  await agent.get('/api/users').expect(403);
  users[0].role = 'admin';
  await agent.post('/api/sessions/login').send(data).expect(200);
  const result = await agent.get('/api/users').expect(200);
  assert.equal('password' in result.body.payload[0], false);
  users[0].role = 'user';
});
test('Tickets exigen sesión y cantidad válida', async () => {
  await request(app).post(`/api/events/${'a'.repeat(24)}/tickets`).send({ quantity: 1 }).expect(401);
  const agent = request.agent(app);
  await agent.post('/api/sessions/login').send(data).expect(200);
  for (const quantity of [0, -1, 1.5, '2', null]) {
    await agent.post(`/api/events/${'a'.repeat(24)}/tickets`).send({ quantity }).expect(400);
  }
  await agent.get(`/api/events/${'a'.repeat(24)}/tickets`).expect(403);
});
