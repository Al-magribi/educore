export const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export const pageStyle = {
  minHeight: "100%",
  padding: 24,
  borderRadius: 16,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

export const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const rupiahInputProps = {
  min: 0,
  precision: 0,
  style: { width: "100%" },
  formatter: (value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`,
  parser: (value) => value?.replace(/[^\d]/g, "") || "",
};

export const chargeStatusColorMap = {
  unpaid: "gold",
  partial: "blue",
  paid: "green",
};

export const chargeStatusLabelMap = {
  unpaid: "Belum Bayar",
  partial: "Cicilan",
  paid: "Lunas",
};
