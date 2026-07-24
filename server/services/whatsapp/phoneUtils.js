const NON_DIGIT_REGEX = /\D/g;

export const normalizePhoneDigits = (phone) => {
  const digits = String(phone || "").replace(NON_DIGIT_REGEX, "");
  if (!digits) return null;

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

export const toWhatsAppChatId = (phone) => {
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return null;
  return `${normalized}@c.us`;
};

export const isValidPhone = (phone) => {
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return false;
  return normalized.length >= 10 && normalized.length <= 15;
};
