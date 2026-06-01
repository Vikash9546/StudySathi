import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html, text }) {
  const from = env.EMAIL_FROM || 'noreply@studysathi.com';
  if (transporter) {
    try {
      await transporter.sendMail({ from, to, subject, text, html });
      console.log(`✉️ Email successfully sent to ${to}: "${subject}"`);
    } catch (err) {
      console.error(`❌ Failed to send email to ${to} via SMTP:`, err);
      logFallback(to, subject, text || html);
    }
  } else {
    logFallback(to, subject, text || html);
  }
}

function logFallback(to, subject, content) {
  console.log('\n==================================================');
  console.log(`✉️  [MOCK EMAIL SENT]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${content}`);
  console.log('==================================================\n');
}
