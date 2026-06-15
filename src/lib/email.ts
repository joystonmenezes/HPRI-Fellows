import nodemailer from "nodemailer";

// Email is configured entirely through environment variables (see .env.example).
// Defaults target Gmail / Google Workspace using an app password. If credentials
// are absent, sends are skipped (and logged) so the site still works in dev.

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM || (user ? `HPRI Summer Fellowship <${user}>` : "");
const adminEmail = process.env.ADMIN_EMAIL || user || "";
// Optional hidden recipients (BCC) for staff notifications — they receive a copy
// without appearing on the visible To line. Comma-separated, like ADMIN_EMAIL.
const adminBcc = process.env.ADMIN_BCC || "";

export const emailConfigured = Boolean(user && pass);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  : null;

export function getAdminEmail(): string {
  return adminEmail;
}

export function getAdminBcc(): string {
  return adminBcc;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  bcc?: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn(`[email] not configured — skipping email to ${opts.to}`);
    return false;
  }
  await transporter.sendMail({ from, ...opts });
  return true;
}
