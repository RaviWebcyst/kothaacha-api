// utils/mailer.js
// Thin wrapper around nodemailer for sending transactional emails (e.g. the
// public contact form) via a real SMTP account. Configure via server/.env:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_TO_EMAIL.
// Leave SMTP_HOST blank to have callers respond with a clear
// "not configured" message instead of throwing.
const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html, replyTo }) {
  if (!isConfigured()) {
    throw new Error('SMTP is not configured');
  }
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    replyTo,
  });
}

module.exports = { sendMail, isConfigured };
