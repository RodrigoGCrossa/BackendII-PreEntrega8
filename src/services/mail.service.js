import { createMailer } from '../config/mailer.config.js';
export async function sendTicketConfirmation({ to, eventTitle, code, quantity }) {
  if (!process.env.MAIL_FROM) throw new Error('Configurá MAIL_FROM');
  const info = await createMailer().sendMail({
    from: process.env.MAIL_FROM, to,
    subject: 'Confirmación de inscripción',
    text: `Inscripción confirmada para ${eventTitle}. Lugares: ${quantity}. Código: ${code}.`,
  });
  if (!info.accepted?.length) throw new Error('El servidor SMTP no aceptó el destinatario');
}
