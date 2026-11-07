// Transporte simulado: solo se carga explícitamente en las pruebas aisladas.
import nodemailer from 'nodemailer';
import { appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const directory = path.dirname(process.env.DB_PATH);
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_USER = 'plataforma@example.test';
process.env.SMTP_PASS = 'solo-pruebas';
process.env.SUPERADMIN_EMAIL = 'superadmin@example.test';
nodemailer.createTransport = () => ({
  async sendMail(mail) {
    if (existsSync(path.join(directory, 'smtp-fail'))) throw new Error('Fallo SMTP simulado');
    appendFileSync(path.join(directory, 'emails.jsonl'), `${JSON.stringify(mail)}\n`);
    return { messageId: 'simulado' };
  },
});
