export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const dateFormatter = (value, withTime = false) => {
  if (!value) {
    return "-";
  }

  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });

  return formatter.format(new Date(value));
};

export const statusMetaMap = {
  confirmed: {
    color: "green",
    label: "Terkonfirmasi",
  },
  rejected: {
    color: "red",
    label: "Ditolak",
  },
  paid: {
    color: "green",
    label: "Lunas",
  },
  pending: {
    color: "processing",
    label: "Menunggu Verifikasi",
  },
  failed: {
    color: "red",
    label: "Ditolak",
  },
  cancelled: {
    color: "default",
    label: "Dibatalkan",
  },
  expired: {
    color: "orange",
    label: "Kedaluwarsa",
  },
  refunded: {
    color: "purple",
    label: "Refund",
  },
  partial: {
    color: "gold",
    label: "Cicilan",
  },
  unpaid: {
    color: "red",
    label: "Belum Dibayar",
  },
};
