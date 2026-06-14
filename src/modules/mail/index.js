export {
  getAdminSmtpSettings,
  getSmtpSettingsForServer,
  upsertSmtpSettings,
} from "./settings.js";

export async function sendEmail() {
  const settings = await import("./settings.js").then((m) => m.getSmtpSettingsForServer());
  if (!settings) {
    throw new Error("SMTP belum dikonfigurasi atau nonaktif di database");
  }
  throw new Error("sendEmail belum diimplementasi — gunakan nodemailer dengan settings dari DB");
}
