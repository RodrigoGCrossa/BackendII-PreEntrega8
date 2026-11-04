import { app } from './app.js';
import { config, validateDatabaseConfig } from './config/config.js';
import { connectDB, disconnectDB } from './config/db.js';

try {
  validateDatabaseConfig();
  await connectDB();
  const server = app.listen(config.port, () => {
    console.log(`Servidor activo en puerto ${server.address().port}`);
  });
  server.on('error', async () => {
    console.error('No se pudo iniciar el servidor');
    await disconnectDB();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => { await disconnectDB(); }));
  }
} catch {
  console.error('No se pudo iniciar: revisá MONGO_URL, la conexión y las variables requeridas');
  process.exitCode = 1;
}
