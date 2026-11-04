import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import assert from 'node:assert/strict';

// Ejecuta el pipeline Express con mensajes HTTP de Node, sin abrir un puerto.
// No sustituye middleware, controladores, services, JWT ni DTO.
class Request {
  constructor(client, method, path) {
    this.client = client;
    this.method = method;
    this.path = path;
    this.headers = {};
  }
  set(name, value) { this.headers[name.toLowerCase()] = value; return this; }
  send(body) {
    this.body = typeof body === 'string' ? body : JSON.stringify(body);
    this.headers['content-type'] ??= 'application/json';
    return this;
  }
  expect(status) {
    return this.run().then((response) => {
      assert.equal(response.status, status, `${this.method} ${this.path}: ${response.text}`);
      return response;
    });
  }
  then(resolve, reject) { return this.run().then(resolve, reject); }
  run() { return this.pending ??= this.execute(); }
  execute() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const socket = new Duplex({ read() {}, write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
      const req = new IncomingMessage(socket);
      req.method = this.method;
      req.url = this.path;
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;
      req.headers = { host: 'localhost', ...this.headers };
      if (this.client.cookies.size && !req.headers.cookie) req.headers.cookie = [...this.client.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
      if (this.body !== undefined) req.headers['content-length'] = String(Buffer.byteLength(this.body));
      const res = new ServerResponse(req);
      res.assignSocket(socket);
      const timer = setTimeout(() => { socket.destroy(); reject(new Error(`Respuesta pendiente: ${this.method} ${this.path}`)); }, 5000);
      res.on('error', (error) => { clearTimeout(timer); reject(error); });
      res.on('finish', () => {
        clearTimeout(timer);
        const raw = Buffer.concat(chunks).toString('utf8');
        const text = raw.slice(raw.indexOf('\r\n\r\n') + 4);
        const headers = res.getHeaders();
        if (typeof headers['set-cookie'] === 'string') headers['set-cookie'] = [headers['set-cookie']];
        const setCookies = headers['set-cookie'] ?? [];
        if (this.client.retainCookies) for (const cookie of (Array.isArray(setCookies) ? setCookies : [setCookies])) {
          const pair = cookie.split(';')[0];
          const index = pair.indexOf('=');
          const name = pair.slice(0, index), value = pair.slice(index + 1);
          if (value) this.client.cookies.set(name, value); else this.client.cookies.delete(name);
        }
        let body = text;
        if (String(headers['content-type']).includes('application/json')) {
          try { body = JSON.parse(text); } catch (error) { socket.destroy(); reject(error); return; }
        }
        socket.destroy();
        resolve({ status: res.statusCode, body, headers, text });
      });
      this.client.app.handle(req, res);
      if (this.body !== undefined) req.push(Buffer.from(this.body));
      req.complete = true;
      req.push(null);
    });
  }
}
class Client {
  constructor(app, retainCookies = false) { this.app = app; this.retainCookies = retainCookies; this.cookies = new Map(); }
  get(path) { return new Request(this, 'GET', path); }
  post(path) { return new Request(this, 'POST', path); }
  put(path) { return new Request(this, 'PUT', path); }
  patch(path) { return new Request(this, 'PATCH', path); }
}
export const inprocessRequest = (app) => new Client(app);
inprocessRequest.agent = (app) => new Client(app, true);
