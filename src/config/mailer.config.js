import 'dotenv/config';
import nodemailer from 'nodemailer';
export function createMailer() {
  const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS } = process.env;
  const port = Number(MAIL_PORT || 587);
  if (!MAIL_HOST || !Number.isInteger(port) || port < 1 || port > 65535 || (!!MAIL_USER !== !!MAIL_PASS)) {
    throw new Error('Configuración SMTP incompleta');
  }
  return nodemailer.createTransport({
    host: MAIL_HOST, port, secure: port === 465,
    ...(MAIL_USER ? { auth: { user: MAIL_USER, pass: MAIL_PASS } } : {}),
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
  });
}
