import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  ensureFinalFinanceTables,
  parseOptionalInt,
  resolveScopedHomebaseId,
  getPaymentMethodId,
} from "./financeHelpers.js";

const router = Router();
const financeAssetDir = path.join("server", "assets", "finance");

fs.mkdirSync(financeAssetDir, { recursive: true });

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, financeAssetDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      path.parse(file.originalname).name +
        "-" +
        Date.now() +
        path.extname(file.originalname),
    );
  },
});

const uploadSignature = multer({ storage: signatureStorage });

const getAvailableHomebases = async (db, user) => {
  if (user.homebase_id) {
    const result = await db.query(
      `
        SELECT id, name, level
        FROM a_homebase
        WHERE id = $1
        LIMIT 1
      `,
      [user.homebase_id],
    );

    return result.rows;
  }

  const result = await db.query(
    `
      SELECT id, name, level
      FROM a_homebase
      ORDER BY name ASC
    `,
  );

  return result.rows;
};

const getScopedHomebase = async (db, user, requestedHomebaseId) => {
  const homebaseId = await resolveScopedHomebaseId(db, user, requestedHomebaseId);
  if (!homebaseId) {
    return null;
  }

  const result = await db.query(
    `
      SELECT id, name, level
      FROM a_homebase
      WHERE id = $1
      LIMIT 1
    `,
    [homebaseId],
  );

  return result.rows[0] || null;
};

const sanitizeGatewayConfig = (config) => {
  if (!config) {
    return null;
  }

  return {
    id: config.id,
    homebase_id: config.homebase_id,
    provider: config.provider,
    merchant_id: config.merchant_id,
    client_key: config.client_key,
    is_production: config.is_production,
    is_active: config.is_active,
    snap_enabled: config.snap_enabled,
    va_fee_amount: Number(config.va_fee_amount || 0),
    has_server_key: Boolean(config.server_key_encrypted),
    created_at: config.created_at,
    updated_at: config.updated_at,
  };
};

const sanitizeFinanceSetting = (setting) => {
  if (!setting) {
    return null;
  }

  return {
    id: setting.id,
    homebase_id: setting.homebase_id,
    officer_name: setting.officer_name,
    officer_signature_url: setting.officer_signature_url,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  };
};

const normalizeBoolean = (value) =>
  value === true || value === "true" || value === 1;

const PAYMENT_METHOD_CATALOG = [
  {
    method_type: "manual_cash",
    name: "Input Admin",
    is_editable: false,
    is_internal: true,
    description:
      "Dipakai admin keuangan untuk input transaksi internal yang langsung tercatat paid.",
  },
  {
    method_type: "manual_bank",
    name: "Transfer Bank",
    is_editable: true,
    is_internal: false,
    description:
      "Dipakai orang tua untuk upload bukti transfer dan menunggu konfirmasi admin.",
  },
  {
    method_type: "midtrans",
    name: "Midtrans",
    is_editable: false,
    is_internal: false,
    description:
      "Dipakai orang tua untuk pembayaran online otomatis melalui Midtrans.",
  },
];

const syncManualBankMethodState = async (client, homebaseId) => {
  const methodResult = await client.query(
    `
      SELECT id, is_active
      FROM finance.payment_method
      WHERE homebase_id = $1
        AND method_type = 'manual_bank'
      ORDER BY id ASC
      LIMIT 1
    `,
    [homebaseId],
  );

  if (methodResult.rowCount === 0) {
    return null;
  }

  const activeBankResult = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM finance.bank_account
      WHERE homebase_id = $1
        AND payment_method_id = $2
        AND is_active = true
    `,
    [homebaseId, methodResult.rows[0].id],
  );

  const hasActiveBank = Number(activeBankResult.rows[0]?.total || 0) > 0;

  if (!hasActiveBank && normalizeBoolean(methodResult.rows[0].is_active)) {
    await client.query(
      `
        UPDATE finance.payment_method
        SET
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [methodResult.rows[0].id],
    );
  }

  return {
    id: Number(methodResult.rows[0].id),
    is_active: hasActiveBank && normalizeBoolean(methodResult.rows[0].is_active),
    has_active_bank: hasActiveBank,
  };
};

const getSettingsPayload = async (db, homebaseId) => {
  const [gatewayResult, bankAccountsResult, paymentMethodsResult, financeSettingResult] =
    await Promise.all([
      db.query(
        `
          SELECT *
          FROM finance.payment_gateway_config
          WHERE homebase_id = $1
            AND provider = 'midtrans'
          LIMIT 1
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT
            ba.id,
            pm.id AS payment_method_id,
            pm.name AS payment_method_name,
            pm.method_type,
            ba.bank_name,
            ba.account_name,
            ba.account_number,
            ba.branch,
            ba.is_active,
            ba.created_at,
            ba.updated_at
          FROM finance.bank_account ba
          JOIN finance.payment_method pm ON pm.id = ba.payment_method_id
          WHERE pm.homebase_id = $1
          ORDER BY ba.is_active DESC, ba.bank_name ASC, ba.account_name ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT
            id,
            method_type,
            name,
            is_active,
            sort_order,
            created_at,
            updated_at
          FROM finance.payment_method
          WHERE homebase_id = $1
          ORDER BY sort_order ASC, name ASC
        `,
        [homebaseId],
      ),
      db.query(
        `
          SELECT *
          FROM finance.finance_setting
          WHERE homebase_id = $1
          LIMIT 1
        `,
        [homebaseId],
      ),
    ]);

  const bankAccounts = bankAccountsResult.rows.map((item) => ({
    ...item,
    is_active: normalizeBoolean(item.is_active),
  }));
  const paymentMethodRows = paymentMethodsResult.rows.map((item) => ({
    ...item,
    is_active: normalizeBoolean(item.is_active),
  }));
  const paymentMethodMap = new Map(
    paymentMethodRows.map((item) => [
      String(item.method_type || "").toLowerCase(),
      item,
    ]),
  );
  const gatewayConfig = sanitizeGatewayConfig(gatewayResult.rows[0] || null);
  const activeBankAccounts = bankAccounts.filter((item) => item.is_active);

  return {
    gateway_config: gatewayConfig,
    finance_setting: sanitizeFinanceSetting(financeSettingResult.rows[0] || null),
    bank_accounts: bankAccounts,
    payment_methods: PAYMENT_METHOD_CATALOG.map((catalogItem) => {
      const existingMethod = paymentMethodMap.get(catalogItem.method_type);

      return {
        id: existingMethod?.id || null,
        method_type: catalogItem.method_type,
        name: existingMethod?.name || catalogItem.name,
        sort_order: existingMethod?.sort_order || 0,
        is_active:
          catalogItem.method_type === "manual_cash"
            ? true
            : catalogItem.method_type === "midtrans"
              ? Boolean(gatewayConfig?.is_active)
              : Boolean(existingMethod?.is_active),
        is_editable: catalogItem.is_editable,
        is_internal: catalogItem.is_internal,
        is_configured:
          catalogItem.method_type === "midtrans"
            ? Boolean(gatewayConfig?.client_key && gatewayConfig?.has_server_key)
            : catalogItem.method_type === "manual_bank"
              ? activeBankAccounts.length > 0
              : true,
        active_bank_accounts:
          catalogItem.method_type === "manual_bank" ? activeBankAccounts.length : 0,
        description: catalogItem.description,
        created_at: existingMethod?.created_at || null,
        updated_at: existingMethod?.updated_at || null,
      };
    }),
  };
};

router.get(
  "/settings/options",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const selectedHomebase = await getScopedHomebase(db, req.user, requestedHomebaseId);
    const homebases = await getAvailableHomebases(db, req.user);

    res.json({
      status: "success",
      data: {
        homebases,
        selected_homebase_id: selectedHomebase?.id || null,
      },
    });
  }),
);

router.post(
  "/settings/upload-signature",
  authorize("satuan", "keuangan", "pusat"),
  uploadSignature.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File tanda tangan wajib diunggah" });
      }

      return res.status(200).json({
        status: "success",
        data: {
          url: `/assets/finance/${req.file.filename}`,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Gagal mengunggah tanda tangan" });
    }
  },
);

router.get(
  "/settings",
  authorize("satuan", "keuangan", "pusat"),
  withQuery(async (req, res, db) => {
    await ensureFinalFinanceTables(db);

    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebase = await getScopedHomebase(db, req.user, requestedHomebaseId);

    if (!homebase) {
      return res.status(404).json({ message: "Satuan tidak ditemukan" });
    }

    const settings = await getSettingsPayload(db, homebase.id);

    res.json({
      status: "success",
      data: {
        homebase,
        ...settings,
      },
    });
  }),
);

router.put(
  "/settings/finance-profile",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!homebase) {
      return res.status(404).json({ message: "Satuan tidak ditemukan" });
    }

    const officerName = String(req.body.officer_name || "").trim() || null;
    const officerSignatureUrl =
      String(req.body.officer_signature_url || "").trim() || null;

    const existing = await client.query(
      `
        SELECT id
        FROM finance.finance_setting
        WHERE homebase_id = $1
        LIMIT 1
      `,
      [homebase.id],
    );

    if (existing.rowCount > 0) {
      await client.query(
        `
          UPDATE finance.finance_setting
          SET
            officer_name = $1,
            officer_signature_url = $2,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
        [officerName, officerSignatureUrl, req.user.id, existing.rows[0].id],
      );
    } else {
      await client.query(
        `
          INSERT INTO finance.finance_setting (
            homebase_id,
            officer_name,
            officer_signature_url,
            created_by,
            updated_by
          )
          VALUES ($1, $2, $3, $4, $4)
        `,
        [homebase.id, officerName, officerSignatureUrl, req.user.id],
      );
    }

    const settings = await getSettingsPayload(client, homebase.id);

    return res.json({
      status: "success",
      message: "Data petugas invoice berhasil diperbarui",
      data: {
        homebase,
        ...settings,
      },
    });
  }),
);

router.put(
  "/settings/payment-methods/:methodType",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const methodType = String(req.params.methodType || "").trim().toLowerCase();
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!homebase) {
      return res.status(404).json({ message: "Satuan tidak ditemukan" });
    }

    const isActive = req.body.is_active === true;

    if (methodType === "manual_bank") {
      const paymentMethodId = await getPaymentMethodId(client, {
        homebaseId: homebase.id,
        methodType: "manual_bank",
        name: "Transfer Bank",
      });

      if (isActive) {
        const activeBankResult = await client.query(
          `
            SELECT COUNT(*)::int AS total
            FROM finance.bank_account
            WHERE homebase_id = $1
              AND payment_method_id = $2
              AND is_active = true
          `,
          [homebase.id, paymentMethodId],
        );

        if (Number(activeBankResult.rows[0]?.total || 0) <= 0) {
          return res.status(400).json({
            message:
              "Aktifkan minimal satu rekening bank sebelum membuka metode transfer bank",
          });
        }
      }

      await client.query(
        `
          UPDATE finance.payment_method
          SET
            is_active = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [isActive, paymentMethodId],
      );

      if (isActive) {
        const midtransMethodId = await getPaymentMethodId(client, {
          homebaseId: homebase.id,
          methodType: "midtrans",
          name: "Midtrans",
        });

        await client.query(
          `
            UPDATE finance.payment_method
            SET
              is_active = false,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [midtransMethodId],
        );

        await client.query(
          `
            UPDATE finance.payment_gateway_config
            SET
              is_active = false,
              updated_at = CURRENT_TIMESTAMP
            WHERE homebase_id = $1
              AND provider = 'midtrans'
          `,
          [homebase.id],
        );
      }

      const settings = await getSettingsPayload(client, homebase.id);

      return res.json({
        status: "success",
        message: isActive
          ? "Metode transfer bank berhasil diaktifkan"
          : "Metode transfer bank berhasil dinonaktifkan",
        data: {
          homebase,
          ...settings,
        },
      });
    }

    if (methodType === "midtrans") {
      const gatewayResult = await client.query(
        `
          SELECT id, client_key, server_key_encrypted, snap_enabled
          FROM finance.payment_gateway_config
          WHERE homebase_id = $1
            AND provider = 'midtrans'
          LIMIT 1
        `,
        [homebase.id],
      );

      const gatewayConfig = gatewayResult.rows[0] || null;

      if (
        isActive &&
        (!gatewayConfig?.client_key ||
          !gatewayConfig?.server_key_encrypted ||
          gatewayConfig?.snap_enabled !== true)
      ) {
        return res.status(400).json({
          message:
            "Lengkapi konfigurasi Midtrans dan aktifkan Snap terlebih dahulu sebelum membuka metode ini",
        });
      }

      if (gatewayConfig) {
        await client.query(
          `
            UPDATE finance.payment_gateway_config
            SET
              is_active = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `,
          [isActive, gatewayConfig.id],
        );
      } else if (isActive) {
        return res.status(400).json({
          message: "Konfigurasi Midtrans belum tersedia untuk satuan ini",
        });
      }

      const paymentMethodId = await getPaymentMethodId(client, {
        homebaseId: homebase.id,
        methodType: "midtrans",
        name: "Midtrans",
      });

      await client.query(
        `
          UPDATE finance.payment_method
          SET
            is_active = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [isActive, paymentMethodId],
      );

      if (isActive) {
        const manualBankMethodId = await getPaymentMethodId(client, {
          homebaseId: homebase.id,
          methodType: "manual_bank",
          name: "Transfer Bank",
        });

        await client.query(
          `
            UPDATE finance.payment_method
            SET
              is_active = false,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [manualBankMethodId],
        );
      }

      const settings = await getSettingsPayload(client, homebase.id);

      return res.json({
        status: "success",
        message: isActive
          ? "Metode Midtrans berhasil diaktifkan"
          : "Metode Midtrans berhasil dinonaktifkan",
        data: {
          homebase,
          ...settings,
        },
      });
    }

    return res.status(400).json({
      message:
        "Metode pembayaran ini tidak dapat diubah dari panel metode pembayaran",
    });
  }),
);

router.put(
  "/settings/midtrans",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!homebase) {
      return res.status(404).json({ message: "Satuan tidak ditemukan" });
    }

    const merchantId = String(req.body.merchant_id || "").trim();
    const clientKey = String(req.body.client_key || "").trim();
    const serverKey = String(req.body.server_key || "").trim();
    const vaFeeAmount = Number(req.body.va_fee_amount || 0);
    const isProduction = req.body.is_production === true;
    const isActive = req.body.is_active !== false;
    const snapEnabled = req.body.snap_enabled !== false;

    if (!merchantId || !clientKey) {
      return res.status(400).json({
        message: "Merchant ID dan client key wajib diisi",
      });
    }

    const existing = await client.query(
      `
        SELECT id, server_key_encrypted
        FROM finance.payment_gateway_config
        WHERE homebase_id = $1
          AND provider = 'midtrans'
        LIMIT 1
      `,
      [homebase.id],
    );

    const nextServerKey =
      serverKey || existing.rows[0]?.server_key_encrypted || null;

    if (!nextServerKey) {
      return res.status(400).json({
        message: "Server key wajib diisi untuk konfigurasi awal",
      });
    }

    if (existing.rowCount > 0) {
      await client.query(
        `
          UPDATE finance.payment_gateway_config
          SET
            merchant_id = $1,
            client_key = $2,
            server_key_encrypted = $3,
            is_production = $4,
            is_active = $5,
            snap_enabled = $6,
            va_fee_amount = $7,
            updated_by = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
        `,
        [
          merchantId,
          clientKey,
          nextServerKey,
          isProduction,
          isActive,
          snapEnabled,
          vaFeeAmount,
          req.user.id,
          existing.rows[0].id,
        ],
      );
    } else {
      await client.query(
        `
          INSERT INTO finance.payment_gateway_config (
            homebase_id,
            provider,
            merchant_id,
            client_key,
            server_key_encrypted,
            is_production,
            is_active,
            snap_enabled,
            va_fee_amount,
            created_by,
            updated_by
          )
          VALUES ($1, 'midtrans', $2, $3, $4, $5, $6, $7, $8, $9, $9)
        `,
        [
          homebase.id,
          merchantId,
          clientKey,
          nextServerKey,
          isProduction,
          isActive,
          snapEnabled,
          vaFeeAmount,
          req.user.id,
        ],
      );
    }

    const midtransMethodId = await getPaymentMethodId(client, {
      homebaseId: homebase.id,
      methodType: "midtrans",
      name: "Midtrans",
    });

    await client.query(
      `
        UPDATE finance.payment_method
        SET
          is_active = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [isActive, midtransMethodId],
    );

    if (isActive) {
      const manualBankMethodId = await getPaymentMethodId(client, {
        homebaseId: homebase.id,
        methodType: "manual_bank",
        name: "Transfer Bank",
      });

      await client.query(
        `
          UPDATE finance.payment_method
          SET
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [manualBankMethodId],
      );
    }

    await syncManualBankMethodState(client, homebase.id);

    const settings = await getSettingsPayload(client, homebase.id);

    res.json({
      status: "success",
      message: "Pengaturan Midtrans berhasil diperbarui",
      data: {
        homebase,
        ...settings,
      },
    });
  }),
);

router.post(
  "/settings/bank-accounts",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!homebase) {
      return res.status(404).json({ message: "Satuan tidak ditemukan" });
    }

    const bankName = String(req.body.bank_name || "").trim();
    const accountName = String(req.body.account_name || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();
    const branch = String(req.body.branch || "").trim() || null;
    const isActive = req.body.is_active !== false;

    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({
        message: "Nama bank, nama rekening, dan nomor rekening wajib diisi",
      });
    }

    const existingMethodResult = await client.query(
      `
        SELECT id
        FROM finance.payment_method
        WHERE homebase_id = $1
          AND method_type = 'manual_bank'
          AND lower(name) = lower('Transfer Bank')
        LIMIT 1
      `,
      [homebase.id],
    );

    const paymentMethodId =
      existingMethodResult.rows[0]?.id ||
      (await getPaymentMethodId(client, {
        homebaseId: homebase.id,
        methodType: "manual_bank",
        name: "Transfer Bank",
      }));

    if (existingMethodResult.rowCount === 0) {
      await client.query(
        `
          UPDATE finance.payment_method
          SET
            is_active = false,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [paymentMethodId],
      );
    }

    const result = await client.query(
      `
        INSERT INTO finance.bank_account (
          homebase_id,
          payment_method_id,
          bank_name,
          account_name,
          account_number,
          branch,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        homebase.id,
        paymentMethodId,
        bankName,
        accountName,
        accountNumber,
        branch,
        isActive,
      ],
    );

    await syncManualBankMethodState(client, homebase.id);

    res.status(201).json({
      status: "success",
      message: "Rekening bank berhasil ditambahkan",
      data: { id: result.rows[0].id },
    });
  }),
);

router.put(
  "/settings/bank-accounts/:id",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const accountId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.body.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!accountId || !homebase) {
      return res.status(400).json({ message: "Data rekening tidak valid" });
    }

    const bankName = String(req.body.bank_name || "").trim();
    const accountName = String(req.body.account_name || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();
    const branch = String(req.body.branch || "").trim() || null;
    const isActive = req.body.is_active !== false;

    const result = await client.query(
      `
        UPDATE finance.bank_account ba
        SET
          bank_name = $1,
          account_name = $2,
          account_number = $3,
          branch = $4,
          is_active = $5,
          updated_at = CURRENT_TIMESTAMP
        FROM finance.payment_method pm
        WHERE ba.id = $6
          AND pm.id = ba.payment_method_id
          AND pm.homebase_id = $7
          AND ba.homebase_id = $7
        RETURNING ba.id
      `,
      [
        bankName,
        accountName,
        accountNumber,
        branch,
        isActive,
        accountId,
        homebase.id,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Rekening bank tidak ditemukan" });
    }

    await syncManualBankMethodState(client, homebase.id);

    res.json({
      status: "success",
      message: "Rekening bank berhasil diperbarui",
    });
  }),
);

router.delete(
  "/settings/bank-accounts/:id",
  authorize("satuan", "keuangan", "pusat"),
  withTransaction(async (req, res, client) => {
    await ensureFinalFinanceTables(client);

    const accountId = parseOptionalInt(req.params.id);
    const requestedHomebaseId = parseOptionalInt(req.query.homebase_id);
    const homebase = await getScopedHomebase(client, req.user, requestedHomebaseId);

    if (!accountId || !homebase) {
      return res.status(400).json({ message: "Data rekening tidak valid" });
    }

    const result = await client.query(
      `
        DELETE FROM finance.bank_account ba
        USING finance.payment_method pm
        WHERE ba.id = $1
          AND pm.id = ba.payment_method_id
          AND pm.homebase_id = $2
          AND ba.homebase_id = $2
        RETURNING ba.id
      `,
      [accountId, homebase.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Rekening bank tidak ditemukan" });
    }

    await syncManualBankMethodState(client, homebase.id);

    res.json({
      status: "success",
      message: "Rekening bank berhasil dihapus",
    });
  }),
);

export default router;
