import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from "antd";
import * as XLSX from "xlsx";

const { Text, Title } = Typography;

const ParentFormDrawer = ({
  screens,
  open,
  editingParent,
  form,
  onClose,
  onSubmit,
  onImportExcel,
  isSubmitting,
  isImporting,
  studentOptions,
}) => {
  const [mode, setMode] = useState("manual");
  const activeMode = editingParent ? "manual" : mode;

  const handleCloseDrawer = () => {
    setMode("manual");
    onClose();
  };

  const normalizeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const toText = (value) => String(value ?? "").trim();

  const parseNisList = (value) =>
    Array.from(
      new Set(
        String(value || "")
          .split(/[\n,;|]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

  const getValueByAliases = (row, aliases) => {
    for (const key of aliases) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    return "";
  };

  const handleImportFile = async (file) => {
    if (!onImportExcel) return Upload.LIST_IGNORE;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        message.error("Sheet Excel tidak ditemukan.");
        return Upload.LIST_IGNORE;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      if (!rows.length) {
        message.error("Data Excel kosong.");
        return Upload.LIST_IGNORE;
      }

      const groupedByUsername = new Map();
      const invalidRows = [];

      rows.forEach((rawRow, index) => {
        const row = {};
        Object.entries(rawRow).forEach(([key, value]) => {
          row[normalizeKey(key)] = value;
        });

        const username = toText(getValueByAliases(row, ["username", "user_name", "user"]));
        const fullName = toText(getValueByAliases(row, ["full_name", "nama_lengkap", "nama"]));
        const password = toText(getValueByAliases(row, ["password", "kata_sandi"]));
        const email = toText(getValueByAliases(row, ["email", "mail"]));
        const phone = toText(
          getValueByAliases(row, ["phone", "no_hp", "nohp", "nomor_hp", "no_telp"]),
        );
        const nisSource = getValueByAliases(row, ["nis_list", "nis", "student_nis", "siswa_nis"]);
        const nisList = parseNisList(nisSource);

        if (!username || !fullName || !password || nisList.length === 0) {
          invalidRows.push(index + 2);
          return;
        }

        const key = username.toLowerCase();
        const existing = groupedByUsername.get(key);

        if (!existing) {
          groupedByUsername.set(key, {
            username,
            full_name: fullName,
            password,
            email: email || null,
            phone: phone || null,
            is_active: true,
            nis_list: nisList,
          });
          return;
        }

        existing.nis_list = Array.from(new Set([...existing.nis_list, ...nisList]));
        if (!existing.full_name && fullName) existing.full_name = fullName;
        if (!existing.password && password) existing.password = password;
        if (!existing.email && email) existing.email = email;
        if (!existing.phone && phone) existing.phone = phone;
      });

      const importRows = Array.from(groupedByUsername.values());

      if (importRows.length === 0) {
        message.error("Tidak ada baris valid untuk diimport.");
        return Upload.LIST_IGNORE;
      }

      if (invalidRows.length > 0) {
        const shortList = invalidRows.slice(0, 8).join(", ");
        message.warning(
          `Sebagian baris dilewati (baris: ${shortList}${invalidRows.length > 8 ? ", dst" : ""}).`,
        );
      }

      await onImportExcel(importRows);
    } catch (error) {
      message.error(error?.message || "Gagal membaca file Excel.");
    }

    return Upload.LIST_IGNORE;
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        username: "wali_ahmad",
        full_name: "Bapak Ahmad",
        password: "Rahasia123!",
        email: "ahmad@mail.com",
        phone: "081234567890",
        nis_list: "10001,10002",
      },
      {
        username: "wali_siti",
        full_name: "Ibu Siti",
        password: "Rahasia123!",
        email: "siti@mail.com",
        phone: "081298765432",
        nis_list: "10003",
      },
    ];

    const guideRows = [
      {
        kolom: "username",
        keterangan: "Wajib. Harus unik untuk setiap akun orang tua.",
      },
      {
        kolom: "full_name",
        keterangan: "Wajib. Nama lengkap orang tua.",
      },
      {
        kolom: "password",
        keterangan: "Wajib. Password awal akun orang tua.",
      },
      {
        kolom: "email",
        keterangan: "Opsional. Email orang tua.",
      },
      {
        kolom: "phone",
        keterangan: "Opsional. Nomor HP orang tua.",
      },
      {
        kolom: "nis_list",
        keterangan: "Wajib. Isi NIS siswa, pisahkan dengan koma. Contoh: 10001,10002",
      },
      {
        kolom: "Catatan",
        keterangan:
          "Jika username sama di beberapa baris, sistem akan menggabungkan semua NIS menjadi satu akun orang tua.",
      },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows),
      "Template_OrangTua",
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(guideRows), "Panduan");
    XLSX.writeFile(workbook, "Template_Import_Orang_Tua.xlsx");
  };

  return (
    <Drawer
      title={
        <Flex align="center" justify="space-between" gap={12} wrap="wrap">
          <span>{editingParent ? "Edit Orang Tua" : "Tambah Orang Tua"}</span>
          {!editingParent ? (
            <Segmented
              value={activeMode}
              onChange={setMode}
              options={[
                { label: "Tambah Manual", value: "manual" },
                { label: "Import Excel", value: "import" },
              ]}
            />
          ) : null}
        </Flex>
      }
      width={screens.xs ? "100%" : 560}
      open={open}
      onClose={handleCloseDrawer}
      destroyOnHidden
    >
      {!editingParent && activeMode === "import" ? (
        <Card size="small">
          <Flex justify="space-between" align="start" gap={12} wrap="wrap">
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Import Data Orang Tua
              </Title>
              <Text type="secondary">
                Download template, isi data, lalu upload file Excel.
              </Text>
            </div>
            <Space wrap>
              <Button onClick={handleDownloadTemplate}>Download Template</Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={handleImportFile}
                disabled={isSubmitting || isImporting}
              >
                <Button type="primary" loading={isImporting}>
                  Import Excel
                </Button>
              </Upload>
            </Space>
          </Flex>

          <Alert
            style={{ marginTop: 12 }}
            type="info"
            showIcon
            message="Panduan Pengisian Template"
            description={
              <div>
                <div>1. Kolom wajib: username, full_name, password, nis_list.</div>
                <div>2. Kolom opsional: email, phone.</div>
                <div>3. Isi `nis_list` dengan pemisah koma untuk banyak siswa.</div>
                <div>4. Contoh: 10001,10002,10003.</div>
                <div>5. Username yang sama akan digabung menjadi satu akun orang tua.</div>
              </div>
            }
          />
        </Card>
      ) : (
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item
            label="Nama Lengkap"
            name="full_name"
            rules={[{ required: true, message: "Nama lengkap wajib diisi." }]}
          >
            <Input placeholder="Nama orang tua" />
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Username wajib diisi." }]}
          >
            <Input placeholder="Username login orang tua" />
          </Form.Item>

          <Form.Item
            label={editingParent ? "Password Baru (Opsional)" : "Password"}
            name="password"
            rules={
              editingParent
                ? []
                : [{ required: true, message: "Password wajib diisi." }]
            }
          >
            <Input.Password placeholder="Masukkan password" />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input placeholder="Email orang tua" />
          </Form.Item>

          <Form.Item label="No. HP" name="phone">
            <Input placeholder="Nomor telepon" />
          </Form.Item>

          <Form.Item
            label="Tambah Siswa Berdasarkan NIS"
            name="nis_list"
            rules={[
              {
                required: true,
                message: "Minimal 1 siswa wajib ditambahkan.",
              },
            ]}
            extra="Siswa yang sudah terhubung ke orang tua lain otomatis dinonaktifkan."
          >
            <Select
              mode="multiple"
              showSearch={{ optionFilterProp: "label" }}
              allowClear
              placeholder="Pilih NIS siswa"
              options={studentOptions}
              virtual={false}
            />
          </Form.Item>

          <Form.Item label="Status Akun" name="is_active" valuePropName="checked">
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Flex justify="end" gap={8}>
              <Button onClick={handleCloseDrawer}>Batal</Button>
              <Button type="primary" loading={isSubmitting} onClick={onSubmit}>
                Simpan
              </Button>
            </Flex>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
};

export default ParentFormDrawer;
