import nodemailer from "nodemailer";
import { getSmtpSettingsForServer } from "./settings.js";

let cachedTransport = null;
let cachedKey = null;

async function getTransport() {
  const settings = await getSmtpSettingsForServer();
  if (!settings) return null;

  const key = `${settings.host}:${settings.port}:${settings.user}:${settings.secure}`;
  if (cachedTransport && cachedKey === key) {
    return { transport: cachedTransport, settings };
  }

  cachedTransport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.user
      ? {
          user: settings.user,
          pass: settings.password,
        }
      : undefined,
  });
  cachedKey = key;

  return { transport: cachedTransport, settings };
}

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} options
 */
export async function sendEmail({ to, subject, html, text }) {
  const result = await getTransport();
  if (!result) {
    throw new Error("SMTP belum dikonfigurasi atau nonaktif");
  }

  const { transport, settings } = result;
  const fromName = settings.fromName || "EduCore SPMB";
  const fromEmail = settings.fromEmail || settings.user;

  if (!fromEmail) {
    throw new Error("Alamat pengirim SMTP belum dikonfigurasi");
  }

  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text: text || undefined,
  });
}
