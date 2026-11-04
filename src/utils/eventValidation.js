import { HttpError } from './HttpError.js';
const statuses = ['draft', 'published', 'cancelled', 'finished'];
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) throw new HttpError(400, 'Fecha inválida; usá formato ISO');
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const date = new Date(value);
  if (month < 1 || month > 12 || day < 1 || day > days || !Number.isFinite(date.getTime())) throw new HttpError(400, 'Fecha inválida');
  return date;
}
export function eventData(body = {}, current = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Datos inválidos');
  const data = {};
  for (const field of ['title', 'description', 'category', 'location']) {
    if (body[field] !== undefined || !current) {
      if (typeof body[field] !== 'string' || !body[field].trim()) throw new HttpError(400, `El campo ${field} es obligatorio`);
      data[field] = body[field].trim();
    }
  }
  if (body.date !== undefined || !current) {
    if (typeof body.date !== 'string' || !body.date.trim()) throw new HttpError(400, 'Fecha inválida');
    data.date = parseDate(body.date);
    if (!Number.isFinite(data.date.getTime()) || data.date <= new Date()) throw new HttpError(400, 'La fecha debe ser futura');
  }
  if (body.capacity !== undefined || !current) {
    if (!Number.isSafeInteger(body.capacity) || body.capacity <= 0) throw new HttpError(400, 'La capacidad debe ser un entero positivo');
    data.capacity = body.capacity;
  }
  if (body.price !== undefined || !current) {
    const price = body.price ?? 0;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) throw new HttpError(400, 'El precio debe ser mayor o igual a cero');
    data.price = price;
  }
  if (body.status !== undefined || !current) {
    data.status = body.status ?? 'draft';
    if (!statuses.includes(data.status)) throw new HttpError(400, 'Estado inválido');
  }
  if (current && ['cancelled', 'finished'].includes(current.status)) throw new HttpError(409, 'No se puede modificar un evento cancelado o finalizado');
  if (data.status === 'published' && new Date(data.date ?? current?.date) <= new Date()) throw new HttpError(400, 'No se puede publicar un evento pasado');
  return data;
}
export function eventQuery(query = {}) {
  const filter = {};
  for (const key of ['status', 'category', 'location']) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== 'string' || !query[key].trim()) throw new HttpError(400, 'Filtro inválido');
      filter[key] = query[key].trim();
    }
  }
  if (filter.status && !statuses.includes(filter.status)) throw new HttpError(400, 'Estado inválido');
  for (const [key, op] of [['dateFrom', '$gte'], ['dateTo', '$lte']]) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== 'string' || !query[key].trim() || !Number.isFinite(Date.parse(query[key]))) throw new HttpError(400, 'Rango de fechas inválido');
      filter.date ??= {};
      filter.date[op] = parseDate(query[key]);
    }
  }
  if (filter.date?.$gte > filter.date?.$lte) throw new HttpError(400, 'Rango de fechas inválido');
  const page = Number(query.page ?? 1), limit = Number(query.limit ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) throw new HttpError(400, 'Paginación inválida (limit: 1 a 100)');
  const sort = query.sort ?? 'date';
  if (!['date', '-date', 'title', '-title', 'price', '-price'].includes(sort)) throw new HttpError(400, 'Ordenamiento inválido');
  return { filter, page, limit, sort };
}
