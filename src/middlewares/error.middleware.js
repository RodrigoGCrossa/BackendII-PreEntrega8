export function notFound(req, res) {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) { status = 409; message = 'El email ya está registrado'; }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    status = 400; message = 'Datos inválidos';
  }
  if (error.type === 'entity.parse.failed') { status = 400; message = 'JSON inválido'; }
  if (status >= 500) { message = 'Error interno del servidor'; }
  res.status(status).json({ status: 'error', message });
}
