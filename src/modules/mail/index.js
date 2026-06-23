export {
  getAdminSmtpSettings,
  getSmtpSettingsForServer,
  upsertSmtpSettings,
} from "./settings.js";

export { sendEmail } from "./send.js";
export { getSchoolBrandingForEmail } from "./branding.js";

export {
  buildVerificationEmailHtml,
  buildVerificationEmailText,
} from "./templates/verification-email.js";
