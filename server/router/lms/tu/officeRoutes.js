import { Router } from "express";
import XLSX from "xlsx";
import { withQuery, withTransaction } from "../../../utils/wrapper.js";
import { uploadArchive } from "./recordRoutes.js";
import {
  clip,
  discardTuFile,
  formatDate,
  formatLetterNo,
  isUniqueViolation,
  toDate,
  toInt,
  toTuAssetUrl,
  uniqueMessage,
} from "./shared.js";

const router = Router();

router.get(
  "/tu/inspections",
  withQuery(async (req, res, client) => {
    const result = await client.query(
      `
        SELECT *
        FROM tu_buku_inspection
        WHERE homebase_id = $1
        ORDER BY inspected_on DESC NULLS LAST, id DESC
      `,
      [req.user.homebase_id],
    );
    return res.json({
      status: "success",
      data: result.rows.map((row) => ({
        ...row,
        inspected_on: formatDate(row.inspected_on),
      })),
    });
  }),
);

router.post(
  "/tu/inspections",
  withTransaction(async (req, res, client) => {
    const officer = clip(req.body?.officer_name, 160);
    if (!officer) {
      return res.status(400).json({
        status: "error",
        message: "Nama petugas pemeriksa wajib diisi.",
      });
    }
    await client.query(
      `
        INSERT INTO tu_buku_inspection (
          homebase_id, inspected_on, officer_name, position, note
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        req.user.homebase_id,
        toDate(req.body?.inspected_on),
        officer,
        clip(req.body?.position, 120),
        clip(req.body?.note, 500),
      ],
    );
    return res.json({ status: "success", message: "Catatan pemeriksaan disimpan." });
  }),
);

router.put(
  "/tu/inspections/:id",
  withTransaction(async (req, res, client) => {
    const officer = clip(req.body?.officer_name, 160);
    if (!officer) {
      return res.status(400).json({
        status: "error",
        message: "Nama petugas pemeriksa wajib diisi.",
      });
    }
    const result = await client.query(
      `
        UPDATE tu_buku_inspection
        SET inspected_on = $3,
            officer_name = $4,
            position = $5,
            note = $6
        WHERE id = $1 AND homebase_id = $2
        RETURNING id
      `,
      [
        toInt(req.params.id),
        req.user.homebase_id,
        toDate(req.body?.inspected_on),
        officer,
        clip(req.body?.position, 120),
        clip(req.body?.note, 500),
      ],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Catatan pemeriksaan tidak ditemukan.",
      });
    }
    return res.json({ status: "success", message: "Catatan pemeriksaan diperbarui." });
  }),
);

router.delete(
  "/tu/inspections/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `DELETE FROM tu_buku_inspection WHERE id = $1 AND homebase_id = $2 RETURNING id`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Catatan pemeriksaan tidak ditemukan.",
      });
    }
    return res.json({ status: "success", message: "Catatan pemeriksaan dihapus." });
  }),
);

const letterFields = (body) => {
  const direction = body?.direction === "keluar" ? "keluar" : "masuk";
  return {
    direction,
    letter_no: clip(body?.letter_no, 80),
    letter_date: toDate(body?.letter_date),
    subject: clip(body?.subject, 250),
    party: clip(body?.party, 200),
    note: clip(body?.note, 500),
  };
};

router.get(
  "/tu/letters/export",
  withQuery(async (req, res, client) => {
    const direction =
      req.query.direction === "masuk" || req.query.direction === "keluar"
        ? req.query.direction
        : "";
    const params = [req.user.homebase_id];
    let filter = "";
    if (direction) {
      params.push(direction);
      filter = "AND direction = $2";
    }
    const result = await client.query(
      `
        SELECT *
        FROM tu_letter
        WHERE homebase_id = $1
          ${filter}
        ORDER BY letter_date DESC NULLS LAST, id DESC
      `,
      params,
    );
    const rows = result.rows.map((row) => ({
      Jenis: row.direction === "masuk" ? "Surat masuk" : "Surat keluar",
      "Nomor Surat": row.letter_no,
      Tanggal: formatDate(row.letter_date),
      Perihal: row.subject,
      "Asal / Tujuan": row.party || "",
      Catatan: row.note || "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Surat");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="arsip-surat${direction ? `-${direction}` : ""}.xlsx"`,
    );
    return res.send(buffer);
  }),
);

router.post(
  "/tu/letters/next-number",
  withTransaction(async (req, res, client) => {
    const direction = req.body?.direction === "keluar" ? "keluar" : "masuk";
    const letterDate = toDate(req.body?.letter_date) || formatDate(new Date());
    const year = Number(letterDate.slice(0, 4));
    const sequence = await client.query(
      `
        INSERT INTO tu_letter_sequence (homebase_id, year, direction, last_number)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (homebase_id, year, direction)
        DO UPDATE SET last_number = tu_letter_sequence.last_number + 1
        RETURNING last_number
      `,
      [req.user.homebase_id, year, direction],
    );
    return res.json({
      status: "success",
      data: {
        letter_no: formatLetterNo(
          sequence.rows[0].last_number,
          direction,
          letterDate,
        ),
      },
    });
  }),
);

router.get(
  "/tu/letters",
  withQuery(async (req, res, client) => {
    const direction =
      req.query.direction === "masuk" || req.query.direction === "keluar"
        ? req.query.direction
        : "";
    const search = clip(req.query.search, 80);
    const params = [req.user.homebase_id];
    const filters = [];
    if (direction) {
      params.push(direction);
      filters.push(`direction = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      filters.push(
        `(letter_no ILIKE $${params.length} OR subject ILIKE $${params.length} OR COALESCE(party, '') ILIKE $${params.length})`,
      );
    }
    const where = filters.length ? `AND ${filters.join(" AND ")}` : "";
    const result = await client.query(
      `
        SELECT *
        FROM tu_letter
        WHERE homebase_id = $1
          ${where}
        ORDER BY letter_date DESC NULLS LAST, id DESC
      `,
      params,
    );
    return res.json({
      status: "success",
      data: result.rows.map((row) => ({
        ...row,
        letter_date: formatDate(row.letter_date),
      })),
    });
  }),
);

router.post(
  "/tu/letters",
  uploadArchive,
  withTransaction(async (req, res, client) => {
    const fields = letterFields(req.body);
    if (!fields.letter_no || !fields.subject) {
      if (req.file) {
        discardTuFile(
          req.user.homebase_id,
          toTuAssetUrl(req.user.homebase_id, req.file.filename),
        );
      }
      return res.status(400).json({
        status: "error",
        message: "Nomor surat dan perihal wajib diisi.",
      });
    }
    const fileUrl = req.file
      ? toTuAssetUrl(req.user.homebase_id, req.file.filename)
      : null;
    try {
      await client.query(
        `
          INSERT INTO tu_letter (
            homebase_id, direction, letter_no, letter_date, subject, party,
            file_url, file_name, note, created_by
          )
          VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, NULLIF($9, ''), $10)
        `,
        [
          req.user.homebase_id,
          fields.direction,
          fields.letter_no,
          fields.letter_date,
          fields.subject,
          fields.party,
          fileUrl,
          req.file?.originalname || null,
          fields.note,
          req.user.id,
        ],
      );
    } catch (error) {
      if (fileUrl) discardTuFile(req.user.homebase_id, fileUrl);
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }
    return res.json({ status: "success", message: "Surat disimpan ke arsip." });
  }),
);

router.put(
  "/tu/letters/:id",
  uploadArchive,
  withTransaction(async (req, res, client) => {
    const current = await client.query(
      `SELECT * FROM tu_letter WHERE id = $1 AND homebase_id = $2`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (current.rowCount === 0) {
      if (req.file) {
        discardTuFile(
          req.user.homebase_id,
          toTuAssetUrl(req.user.homebase_id, req.file.filename),
        );
      }
      return res.status(404).json({ status: "error", message: "Surat tidak ditemukan." });
    }
    const fields = letterFields({ ...req.body, direction: current.rows[0].direction });
    if (!fields.letter_no || !fields.subject) {
      return res.status(400).json({
        status: "error",
        message: "Nomor surat dan perihal wajib diisi.",
      });
    }
    const fileUrl = req.file
      ? toTuAssetUrl(req.user.homebase_id, req.file.filename)
      : current.rows[0].file_url;
    try {
      await client.query(
        `
          UPDATE tu_letter
          SET letter_no = $2,
              letter_date = $3,
              subject = $4,
              party = NULLIF($5, ''),
              file_url = $6,
              file_name = COALESCE($7, file_name),
              note = NULLIF($8, ''),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          current.rows[0].id,
          fields.letter_no,
          fields.letter_date,
          fields.subject,
          fields.party,
          fileUrl,
          req.file?.originalname || null,
          fields.note,
        ],
      );
    } catch (error) {
      if (req.file) discardTuFile(req.user.homebase_id, fileUrl);
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }
    if (req.file && current.rows[0].file_url && current.rows[0].file_url !== fileUrl) {
      discardTuFile(req.user.homebase_id, current.rows[0].file_url);
    }
    return res.json({ status: "success", message: "Arsip surat diperbarui." });
  }),
);

router.delete(
  "/tu/letters/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `
        DELETE FROM tu_letter
        WHERE id = $1 AND homebase_id = $2
        RETURNING file_url
      `,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Surat tidak ditemukan." });
    }
    discardTuFile(req.user.homebase_id, result.rows[0].file_url);
    return res.json({ status: "success", message: "Surat dihapus dari arsip." });
  }),
);

const facilityFields = (body) => {
  const condition = ["baik", "rusak_ringan", "rusak_berat"].includes(body?.condition)
    ? body.condition
    : "baik";
  const quantity = toInt(body?.quantity);
  return {
    code: clip(body?.code, 40),
    name: clip(body?.name, 160),
    category: clip(body?.category, 80),
    location: clip(body?.location, 120),
    quantity: quantity === null ? 1 : quantity,
    condition,
    acquired_year: toInt(body?.acquired_year),
    note: clip(body?.note, 500),
  };
};

router.get(
  "/tu/facilities/report",
  withQuery(async (req, res, client) => {
    const [conditions, categories] = await Promise.all([
      client.query(
        `
          SELECT condition,
                 COUNT(*)::int AS items,
                 COALESCE(SUM(quantity), 0)::int AS quantity
          FROM tu_facility
          WHERE homebase_id = $1
          GROUP BY condition
        `,
        [req.user.homebase_id],
      ),
      client.query(
        `
          SELECT COALESCE(NULLIF(category, ''), 'Tanpa kategori') AS category,
                 condition,
                 COUNT(*)::int AS items,
                 COALESCE(SUM(quantity), 0)::int AS quantity
          FROM tu_facility
          WHERE homebase_id = $1
          GROUP BY category, condition
          ORDER BY category, condition
        `,
        [req.user.homebase_id],
      ),
    ]);
    return res.json({
      status: "success",
      data: {
        conditions: conditions.rows,
        categories: categories.rows,
      },
    });
  }),
);

router.get(
  "/tu/facilities/export",
  withQuery(async (req, res, client) => {
    const result = await client.query(
      `
        SELECT *
        FROM tu_facility
        WHERE homebase_id = $1
        ORDER BY lower(category), lower(name)
      `,
      [req.user.homebase_id],
    );
    const labels = {
      baik: "Baik",
      rusak_ringan: "Rusak ringan",
      rusak_berat: "Rusak berat",
    };
    const rows = result.rows.map((row) => ({
      Kode: row.code || "",
      Nama: row.name,
      Kategori: row.category || "",
      Lokasi: row.location || "",
      Jumlah: row.quantity,
      Kondisi: labels[row.condition] || row.condition,
      "Tahun Perolehan": row.acquired_year || "",
      Catatan: row.note || "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      "Sarana Prasarana",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sarana-prasarana.xlsx"',
    );
    return res.send(buffer);
  }),
);

router.get(
  "/tu/facilities",
  withQuery(async (req, res, client) => {
    const search = clip(req.query.search, 80);
    const params = [req.user.homebase_id];
    let filter = "";
    if (search) {
      params.push(`%${search}%`);
      filter = `AND (name ILIKE $2 OR COALESCE(code, '') ILIKE $2 OR COALESCE(location, '') ILIKE $2 OR COALESCE(category, '') ILIKE $2)`;
    }
    const result = await client.query(
      `
        SELECT *
        FROM tu_facility
        WHERE homebase_id = $1
          ${filter}
        ORDER BY lower(name)
      `,
      params,
    );
    return res.json({ status: "success", data: result.rows });
  }),
);

router.post(
  "/tu/facilities",
  withTransaction(async (req, res, client) => {
    const fields = facilityFields(req.body);
    if (!fields.name) {
      return res.status(400).json({ status: "error", message: "Nama barang wajib diisi." });
    }
    if (fields.quantity < 0) {
      return res.status(400).json({ status: "error", message: "Jumlah tidak valid." });
    }
    try {
      await client.query(
        `
          INSERT INTO tu_facility (
            homebase_id, code, name, category, location, quantity, condition,
            acquired_year, note
          )
          VALUES ($1, NULLIF($2, ''), $3, NULLIF($4, ''), NULLIF($5, ''), $6, $7, $8, NULLIF($9, ''))
        `,
        [
          req.user.homebase_id,
          fields.code,
          fields.name,
          fields.category,
          fields.location,
          fields.quantity,
          fields.condition,
          fields.acquired_year,
          fields.note,
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }
    return res.json({ status: "success", message: "Sarana prasarana disimpan." });
  }),
);

router.put(
  "/tu/facilities/:id",
  withTransaction(async (req, res, client) => {
    const fields = facilityFields(req.body);
    if (!fields.name) {
      return res.status(400).json({ status: "error", message: "Nama barang wajib diisi." });
    }
    try {
      const result = await client.query(
        `
          UPDATE tu_facility
          SET code = NULLIF($3, ''),
              name = $4,
              category = NULLIF($5, ''),
              location = NULLIF($6, ''),
              quantity = $7,
              condition = $8,
              acquired_year = $9,
              note = NULLIF($10, ''),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND homebase_id = $2
          RETURNING id
        `,
        [
          toInt(req.params.id),
          req.user.homebase_id,
          fields.code,
          fields.name,
          fields.category,
          fields.location,
          fields.quantity,
          fields.condition,
          fields.acquired_year,
          fields.note,
        ],
      );
      if (result.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Data sarana tidak ditemukan.",
        });
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ status: "error", message: uniqueMessage(error) });
      }
      throw error;
    }
    return res.json({ status: "success", message: "Sarana prasarana diperbarui." });
  }),
);

router.delete(
  "/tu/facilities/:id",
  withTransaction(async (req, res, client) => {
    const result = await client.query(
      `DELETE FROM tu_facility WHERE id = $1 AND homebase_id = $2 RETURNING id`,
      [toInt(req.params.id), req.user.homebase_id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data sarana tidak ditemukan.",
      });
    }
    return res.json({ status: "success", message: "Sarana prasarana dihapus." });
  }),
);

export default router;
