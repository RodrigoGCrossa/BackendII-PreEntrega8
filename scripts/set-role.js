import { config } from '../src/config/config.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { assignUserRole } from '../src/services/users.service.js';

const [email, role] = process.argv.slice(2);
if (!email || !['user', 'organizer', 'admin'].includes(role) || !config.mongoUrl) {
  console.error('Uso: npm run user:role -- email rol (requiere MONGO_URL)');
  process.exitCode = 1;
} else {
  try {
    await connectDB();
    await assignUserRole(email, role);
    console.info('Rol actualizado. Volvé a iniciar sesión con el usuario modificado.');
  } catch { console.error('No se pudo asignar el rol: revisá email y conexión'); process.exitCode = 1; }
  finally { await disconnectDB(); }
}
