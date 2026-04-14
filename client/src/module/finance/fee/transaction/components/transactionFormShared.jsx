export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const getOtherPaymentSelectionKey = (charge) =>
  charge?.charge_id ? `charge-${charge.charge_id}` : `type-${charge?.type_id}`;

export const buildOtherPaymentValue = (
  charge,
  currentValue = {},
  overrides = {},
) => ({
  charge_id: charge?.charge_id || null,
  type_id: charge?.type_id || null,
  amount_paid:
    overrides.amount_paid !== undefined
      ? overrides.amount_paid
      : currentValue.amount_paid,
});

export const getPeriodeTagColor = (isActive) => (isActive ? "green" : "red");

export const getChargeStatusColor = (status) => {
  if (status === "paid") {
    return "green";
  }

  if (status === "partial") {
    return "gold";
  }

  return "blue";
};
