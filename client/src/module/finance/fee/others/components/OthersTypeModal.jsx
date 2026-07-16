import {
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

import { rupiahInputProps } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const buildStudentOptionLabel = (item = {}) => {
  const name = item.full_name || item.name || `Siswa #${item.id}`;
  const className = item.class_name || "-";
  const nis = item.nis || "-";
  return `${name} · ${className} · NIS ${nis}`;
};

const OthersTypeModal = ({
  open,
  editingType,
  onCancel,
  onSubmit,
  onHomebaseChange,
  onPeriodeChange,
  onScopeChange,
  onStudentFilterChange,
  form,
  confirmLoading,
  homebases,
  periodes = [],
  grades = [],
  classes = [],
  students = [],
  studentsLoading = false,
  studentFilter = {},
}) => {
  const scope = Form.useWatch("scope", form) || "grade";
  const periodeId = Form.useWatch("periode_id", form);
  const isStudentScope = scope === "student";
  const lockIdentity = Number(editingType?.charge_count || 0) > 0;

  const studentOptions = students.map((item) => ({
    value: Number(item.id),
    label: buildStudentOptionLabel(item),
    student: item,
  }));

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      width={680}
      destroyOnClose
      centered
      closable={false}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: { padding: 0 },
        footer: { padding: "0 24px 22px" },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <div
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 22,
          background: "linear-gradient(135deg, #eef2ff, #eff6ff)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            display: "grid",
            placeItems: "center",
            borderRadius: 18,
            background: "linear-gradient(135deg, #0f766e, #2563eb)",
            color: "#fff",
            boxShadow: "0 18px 32px rgba(15, 118, 110, 0.22)",
            marginBottom: 14,
          }}
        >
          <ReceiptText size={22} />
        </div>
        <Text strong style={{ display: "block", fontSize: 24, color: "#0f172a" }}>
          {editingType ? "Perbarui Jenis Biaya" : "Tambah Jenis Biaya Baru"}
        </Text>
        <Text type='secondary'>
          Tentukan apakah biaya berlaku untuk seluruh tingkat, atau hanya siswa
          terpilih (misalnya gelombang pendaftaran). Siswa/tingkat yang sudah
          punya tagihan tidak bisa dihapus dari daftar.
        </Text>
      </div>

      <Form
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        initialValues={{ scope: "grade", is_active: true }}
        style={{ padding: "0 24px" }}
      >
        {homebases.length > 1 ? (
          <Form.Item
            name='homebase_id'
            label='Satuan'
            rules={[{ required: true, message: "Satuan wajib dipilih" }]}
          >
            <Select
              size='large'
              placeholder='Pilih satuan'
              onChange={onHomebaseChange}
              options={homebases.map((item) => ({
                value: Number(item.id),
                label: item.name,
              }))}
              showSearch
              optionFilterProp='label'
              virtual={false}
            />
          </Form.Item>
        ) : (
          <Form.Item name='homebase_id' hidden>
            <Input />
          </Form.Item>
        )}

        <Form.Item
          name='periode_id'
          label='Periode'
          rules={[{ required: true, message: "Periode wajib dipilih" }]}
          extra={
            lockIdentity
              ? "Periode dikunci karena jenis biaya sudah dipakai pada tagihan."
              : undefined
          }
        >
          <Select
            size='large'
            placeholder='Pilih periode'
            onChange={onPeriodeChange}
            disabled={lockIdentity}
            options={periodes.map((item) => ({
              value: Number(item.id),
              label: item.is_active ? `${item.name} (Aktif)` : item.name,
            }))}
            showSearch
            optionFilterProp='label'
            virtual={false}
          />
        </Form.Item>

        <Form.Item
          name='scope'
          label='Cakupan'
          rules={[{ required: true, message: "Cakupan wajib dipilih" }]}
          extra={
            lockIdentity
              ? "Cakupan dikunci karena jenis biaya sudah dipakai pada tagihan."
              : undefined
          }
        >
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            size='large'
            disabled={lockIdentity}
            onChange={(event) => onScopeChange?.(event.target.value)}
            options={[
              { value: "grade", label: "Per Tingkat" },
              { value: "student", label: "Per Individu" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name='name'
          label='Nama Jenis Biaya'
          rules={[{ required: true, message: "Nama jenis biaya wajib diisi" }]}
        >
          <Input
            size='large'
            placeholder={
              isStudentScope
                ? "Contoh: Pendaftaran Gelombang 1"
                : "Contoh: Seragam, Buku Paket, Study Tour"
            }
          />
        </Form.Item>

        <Form.Item name='description' label='Deskripsi'>
          <Input.TextArea rows={2} placeholder='Opsional' />
        </Form.Item>

        <Form.Item
          name='amount'
          label='Nominal'
          rules={[{ required: true, message: "Nominal wajib diisi" }]}
        >
          <InputNumber {...rupiahInputProps} size='large' placeholder='Rp 0' />
        </Form.Item>

        {isStudentScope ? (
          <>
            <Form.Item label='Filter Siswa (opsional)'>
              <Space direction='vertical' style={{ width: "100%" }} size={10}>
                <Select
                  size='large'
                  allowClear
                  placeholder='Semua tingkat'
                  value={studentFilter.grade_id}
                  onChange={(value) =>
                    onStudentFilterChange?.({
                      grade_id: value,
                      class_id: undefined,
                    })
                  }
                  options={grades.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  disabled={!periodeId}
                  showSearch
                  optionFilterProp='label'
                  virtual={false}
                  style={{ width: "100%" }}
                />
                <Select
                  size='large'
                  allowClear
                  placeholder='Semua kelas'
                  value={studentFilter.class_id}
                  onChange={(value) =>
                    onStudentFilterChange?.({ class_id: value })
                  }
                  options={classes.map((item) => ({
                    value: Number(item.id),
                    label: `${item.name} (${item.grade_name || "-"})`,
                  }))}
                  disabled={!periodeId}
                  showSearch
                  optionFilterProp='label'
                  virtual={false}
                  style={{ width: "100%" }}
                />
                <Input.Search
                  size='large'
                  allowClear
                  placeholder='Cari nama atau NIS'
                  defaultValue={studentFilter.search || ""}
                  key={`student-search-${studentFilter.grade_id || "all"}-${studentFilter.class_id || "all"}`}
                  onSearch={(value) =>
                    onStudentFilterChange?.({ search: value || "" })
                  }
                  onClear={() => onStudentFilterChange?.({ search: "" })}
                  disabled={!periodeId}
                />
              </Space>
            </Form.Item>

            <Form.Item
              name='student_ids'
              label='Siswa Terpilih'
              rules={[
                {
                  required: true,
                  type: "array",
                  min: 1,
                  message: "Minimal satu siswa wajib dipilih",
                },
              ]}
              extra={
                !periodeId
                  ? "Pilih periode terlebih dahulu untuk memuat daftar siswa."
                  : studentsLoading
                    ? "Memuat daftar siswa..."
                    : studentOptions.length === 0
                      ? "Tidak ada siswa pada filter ini. Ubah tingkat/kelas atau cari nama/NIS."
                      : `${studentOptions.length} siswa tersedia. Pilih nama dan kelas yang sesuai.`
              }
              getValueFromEvent={(value) =>
                (Array.isArray(value) ? value : []).map((item) => Number(item))
              }
            >
              <Select
                size='large'
                mode='multiple'
                placeholder={
                  periodeId ? "Pilih siswa" : "Pilih periode terlebih dahulu"
                }
                options={studentOptions}
                loading={studentsLoading}
                disabled={!periodeId}
                showSearch
                optionFilterProp='label'
                maxTagCount='responsive'
                virtual={false}
                notFoundContent={
                  studentsLoading
                    ? "Memuat siswa..."
                    : "Tidak ada siswa ditemukan"
                }
                optionRender={(option) => {
                  const student = option.data?.student || {};
                  return (
                    <Space direction='vertical' size={0} style={{ lineHeight: 1.25 }}>
                      <Text strong>{student.full_name || option.label}</Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {`${student.class_name || "-"} · NIS ${student.nis || "-"}`}
                      </Text>
                    </Space>
                  );
                }}
                tagRender={(props) => {
                  const { label, closable, onClose, value } = props;
                  const student = students.find(
                    (item) => Number(item.id) === Number(value),
                  );
                  const tagLabel = student
                    ? `${student.full_name} · ${student.class_name || "-"}`
                    : label;

                  return (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginInlineEnd: 4,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        fontSize: 12,
                        lineHeight: "20px",
                      }}
                    >
                      {tagLabel}
                      {closable ? (
                        <span
                          role='button'
                          tabIndex={0}
                          onClick={onClose}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              onClose?.(event);
                            }
                          }}
                          style={{ cursor: "pointer", color: "#64748b" }}
                        >
                          ×
                        </span>
                      ) : null}
                    </span>
                  );
                }}
              />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            name='grade_ids'
            label='Berlaku Untuk Tingkat'
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "Minimal satu tingkat wajib dipilih",
              },
            ]}
            getValueFromEvent={(value) =>
              (Array.isArray(value) ? value : []).map((item) => Number(item))
            }
          >
            <Select
              size='large'
              mode='multiple'
              placeholder='Pilih tingkat'
              options={grades.map((item) => ({
                value: Number(item.id),
                label: item.name,
              }))}
              showSearch
              optionFilterProp='label'
              virtual={false}
            />
          </Form.Item>
        )}

        <Form.Item
          name='is_active'
          label='Status'
          rules={[{ required: true, message: "Status wajib dipilih" }]}
        >
          <Select
            size='large'
            options={[
              { value: true, label: "Aktif" },
              { value: false, label: "Nonaktif" },
            ]}
            virtual={false}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default OthersTypeModal;
