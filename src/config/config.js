import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};

export function validateConfig() {
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) {
    throw new Error('PORT debe ser un entero entre 0 y 65535');
  }
}

export function validateDatabaseConfig() {
  if (!config.mongoUrl) throw new Error('Configurá MONGO_URL en el entorno');
  if (!config.jwtSecret || config.jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  validateConfig();
}
