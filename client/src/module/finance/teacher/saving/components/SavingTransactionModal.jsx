import { memo, useMemo } from "react";
import {
  Alert,
  Avatar,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

import {
  currencyFormatter,
  rupiahInputProps,
  transactionTypeMeta,
} from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const SavingTransactionModal = ({
  open,
  form,
  access,
  homebaseName,
  editingTransaction,
  students,
  selectedStudent,
  isStudentOptionsLoading,
  currentStudentSearch,
  onStudentSelect,
  onStudentSearchChange,
  onCancel,
  onSubmit,
  confirmLoading,
}) => {
  const watchedStudentId = Form.useWatch("student_id", form);
  const watchedType = Form.useWatch("transaction_type", form);
  const watchedStudentSearch = Form.useWatch("student_search", form) || "";
  const transactionTypeOptions = useMemo(
    () =>
      Object.entries(transactionTypeMeta).map(([value, meta]) => ({
        value,
        label: meta.label,
      })),
    [],
  );
  const studentSearchValue = currentStudentSearch ?? watchedStudentSearch;
  const normalizedStudents = useMemo(
    () =>
      students.map((item) => ({
        ...item,
        optionValue: item.id || item.student_id,
        displayName: item.full_name || item.student_name,
      })),
    [students],
  );
  const studentOptions = useMemo(
    () =>
      normalizedStudents.map((item) => ({
        value: item.optionValue,
        plainLabel: `${item.displayName}${item.nis ? ` - ${item.nis}` : ""}`,
        studentData: item,
        label: (
          <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
            <Space orientation='vertical' size={1}>
              <Text strong style={{ color: "#0f172a" }}>
                {item.displayName}
              </Text>
              <Text type='secondary'>
                {`NIS ${item.nis || "-"} | ${item.homebase_name || homebaseName || "-"} | ${item.periode_name || access?.active_periode_name || "-"}`}
              </Text>
            </Space>
            <Tag color='blue' style={{ borderRadius: 999 }}>
              {`${item.grade_name || "-"} | ${item.class_name || "-"}`}
            </Tag>
          </Flex>
        ),
      })),
    [access?.active_periode_name, homebaseName, normalizedStudents],
  );
  const activeStudent = useMemo(() => {
    const selectedId = Number(watchedStudentId);

    return (
      normalizedStudents.find(
        (item) => Number(item.optionValue) === selectedId,
      ) ||
      (selectedStudent
        ? {
            ...selectedStudent,
            optionValue: selectedStudent.id || selectedStudent.student_id,
            displayName:
              selectedStudent.full_name || selectedStudent.student_name,
          }
        : null)
    );
  }, [normalizedStudents, selectedStudent, watchedStudentId]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      width='min(760px, calc(100vw - 24px))'
      destroyOnHidden
      closable={false}
      centered
      okText={editingTransaction ? "Simpan Perubahan" : "Simpan Transaksi"}
      cancelText='Batal'
      styles={{
        body: {
          padding: 16,
          background: "#f8fafc",
        },
      }}
      modalRender={(node) => (
        <MotionDiv
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ borderRadius: 24, overflow: "hidden" }}
        >
          {node}
        </MotionDiv>
      )}
    >
      <Space orientation='vertical' size={16} style={{ width: "100%" }}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 20,
            background:
              watchedType === "withdrawal"
                ? "linear-gradient(135deg, #7f1d1d, #b91c1c 55%, #dc2626)"
                : "linear-gradient(135deg, #064e3b, #047857 55%, #10b981)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.16)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <Space orientation='vertical' size={10} style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0, color: "#f8fafc" }}>
              {editingTransaction
                ? "Edit Transaksi Tabungan"
                : "Catat Transaksi Tabungan"}
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.86)" }}>
              {watchedType === "withdrawal"
                ? "Pastikan nominal penarikan tidak melebihi saldo siswa yang tersedia."
                : "Setoran yang dicatat akan langsung menambah saldo tabungan siswa terpilih."}
            </Text>
          </Space>
        </Card>

        <Card
          variant='borderless'
          style={{
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.14)",
          }}
          styles={{ body: { padding: 18 } }}
        >
          <Form form={form} layout='vertical' onFinish={onSubmit}>
            <Form.Item
              name='student_id'
              hidden
              rules={[{ required: true, message: "Siswa wajib dipilih" }]}
            >
              <Select />
            </Form.Item>
            <Form.Item name='class_id' hidden>
              <Select />
            </Form.Item>
            <Form.Item name='grade_id' hidden>
              <Select />
            </Form.Item>
            <Form.Item name='student_search' hidden>
              <Input />
            </Form.Item>

            <Alert
              showIcon
              type={watchedType === "withdrawal" ? "warning" : "success"}
              style={{ marginBottom: 16, borderRadius: 14 }}
              message={
                watchedType === "withdrawal"
                  ? "Pastikan nominal penarikan tidak melebihi saldo siswa."
                  : "Setoran akan langsung menambah saldo tabungan siswa."
              }
            />

            <Form.Item
              label='Cari Siswa'
              extra='Ketik nama siswa atau NIS. Data siswa akan dimuat saat pencarian dan konteks satuan, periode, tingkat, serta kelas akan tampil setelah siswa dipilih.'
            >
              <Select
                size='large'
                allowClear
                showSearch={{
                  optionFilterProp: "label",
                  onSearch: onStudentSearchChange,
                }}
                value={watchedStudentId}
                placeholder='Contoh: Budi / 23001'
                filterOption={false}
                searchValue={studentSearchValue}
                optionLabelProp='plainLabel'
                suffixIcon={<Search size={16} color='#94a3b8' />}
                notFoundContent={
                  !studentSearchValue.trim()
                    ? "Mulai ketik nama siswa atau NIS"
                    : isStudentOptionsLoading
                      ? "Mencari siswa..."
                      : "Siswa tidak ditemukan"
                }
                options={studentOptions}
                loading={isStudentOptionsLoading}
                defaultActiveFirstOption={false}
                onBlur={() => {
                  if (!activeStudent) {
                    form.setFieldValue("student_search", studentSearchValue);
                  }
                }}
                onChange={(value, option) => {
                  const selected = Array.isArray(option)
                    ? option[0]?.studentData
                    : option?.studentData;

                  if (!value || !selected) {
                    onStudentSelect(null);
                    onStudentSearchChange("");
                    form.setFieldsValue({
                      student_search: "",
                      student_id: undefined,
                      grade_id: undefined,
                      class_id: undefined,
                    });
                    return;
                  }

                  onStudentSelect(selected);
                  form.setFieldsValue({
                    student_search: `${selected.displayName}${selected.nis ? ` - ${selected.nis}` : ""}`,
                    student_id: selected.optionValue,
                    grade_id: selected.grade_id,
                    class_id: selected.class_id,
                  });
                }}
                virtual={false}
              />
            </Form.Item>

            {activeStudent ? (
              <Card
                variant='borderless'
                style={{
                  marginBottom: 16,
                  borderRadius: 20,
                  background:
                    "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
                }}
                styles={{ body: { padding: 20 } }}
              >
                <Flex
                  justify='space-between'
                  align='center'
                  wrap='wrap'
                  gap={16}
                >
                  <Space size={14} align='start'>
                    <Avatar
                      size={52}
                      style={{ background: "#2563eb", fontWeight: 700 }}
                    >
                      {(activeStudent.displayName || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </Avatar>
                    <Space orientation='vertical' size={2}>
                      <Text strong style={{ color: "#ffffff", fontSize: 16 }}>
                        {activeStudent.displayName}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        NIS {activeStudent.nis || "-"}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        {`Satuan ${activeStudent.homebase_name || homebaseName || "-"} | ${activeStudent.periode_name || access?.active_periode_name || "-"}`}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                        {`Tingkat ${activeStudent.grade_name || "-"} | Kelas ${activeStudent.class_name || "-"}`}
                      </Text>
                      {"balance" in activeStudent ? (
                        <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                          {`Saldo saat ini ${currencyFormatter.format(Number(activeStudent.balance || 0))}`}
                        </Text>
                      ) : null}
                    </Space>
                  </Space>
                  <Tag
                    color='blue'
                    style={{ borderRadius: 999, paddingInline: 12 }}
                  >
                    Siswa Terpilih
                  </Tag>
                </Flex>
              </Card>
            ) : null}

            <Form.Item
              name='transaction_type'
              label='Jenis Transaksi'
              rules={[
                { required: true, message: "Jenis transaksi wajib dipilih" },
              ]}
            >
              <Select
                options={transactionTypeOptions}
                placeholder='Pilih jenis transaksi'
              />
            </Form.Item>

            <Form.Item
              name='amount'
              label='Nominal'
              rules={[{ required: true, message: "Nominal wajib diisi" }]}
            >
              <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </Modal>
  );
};

export default memo(SavingTransactionModal);
