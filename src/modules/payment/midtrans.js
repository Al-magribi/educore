import "server-only";

const SNAP_URLS = {
  sandbox: "https://app.sandbox.midtrans.com/snap/v1/transactions",
  production: "https://app.midtrans.com/snap/v1/transactions",
};

const STATUS_URLS = {
  sandbox: "https://api.sandbox.midtrans.com/v2",
  production: "https://api.midtrans.com/v2",
};

function authHeader(serverKey) {
  const encoded = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

function snapBaseUrl(production) {
  return production ? SNAP_URLS.production : SNAP_URLS.sandbox;
}

function statusBaseUrl(production) {
  return production ? STATUS_URLS.production : STATUS_URLS.sandbox;
}

export function getMidtransSnapScriptUrl(production) {
  return production
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function buildOrderId(paymentId) {
  return `SPMB-${paymentId}`;
}

export function parseOrderId(orderId) {
  if (!orderId?.startsWith("SPMB-")) return null;
  return orderId.slice(5);
}

const SETTLED_STATUSES = new Set(["capture", "settlement"]);
const PENDING_STATUSES = new Set(["pending", "authorize"]);
const FAILED_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);

export function mapMidtransTransactionStatus(transactionStatus) {
  if (SETTLED_STATUSES.has(transactionStatus)) return "paid";
  if (PENDING_STATUSES.has(transactionStatus)) return "pending";
  if (FAILED_STATUSES.has(transactionStatus)) return "failed";
  return "pending";
}

/**
 * @param {{ serverKey: string; production: boolean; orderId: string; amount: number; customer: { name: string; email: string; phone?: string | null } }} params
 */
export async function createSnapTransaction({
  serverKey,
  production,
  orderId,
  amount,
  customer,
}) {
  const res = await fetch(snapBaseUrl(production), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(serverKey),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.error_messages?.join(", ") ||
      data.status_message ||
      data.message ||
      "Gagal membuat transaksi Midtrans";
    throw new Error(message);
  }

  if (!data.token) {
    throw new Error("Token Midtrans tidak diterima");
  }

  return {
    token: data.token,
    redirectUrl: data.redirect_url ?? null,
  };
}

/**
 * @param {{ serverKey: string; production: boolean; orderId: string }} params
 */
export async function getMidtransTransactionStatus({ serverKey, production, orderId }) {
  const res = await fetch(`${statusBaseUrl(production)}/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: authHeader(serverKey),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.status_message || data.error_messages?.join(", ") || "Gagal memeriksa status Midtrans";
    throw new Error(message);
  }

  return {
    orderId: data.order_id,
    transactionStatus: data.transaction_status,
    paymentStatus: mapMidtransTransactionStatus(data.transaction_status),
    fraudStatus: data.fraud_status ?? null,
  };
}
