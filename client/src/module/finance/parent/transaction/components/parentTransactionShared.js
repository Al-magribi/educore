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
  paid: {
    color: "green",
    label: "Lunas",
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
