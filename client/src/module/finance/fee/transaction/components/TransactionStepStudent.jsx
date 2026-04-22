import { useEffect } from "react";
import { Avatar, Card, Flex, Form, Input, Select, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Search, UserRound } from "lucide-react";

import { getPeriodeTagColor } from "./transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

const formatStudentSearchLabel = (item) =>
  `${item.full_name}${item.nis ? ` - ${item.nis}` : ""}`;

const TransactionStepStudent = ({
  form,
  homebases,
  periodes,
  students,
  student,
  editingTransaction,
  currentStudentSearch,
  isStudentOptionsLoading,
  onStudentSelect,
  onHomebaseChange,
  onPeriodeChange,
  onStudentSearchChange,
}) => {
  const selectedHomebaseId = Form.useWatch("homebase_id", form);
  const selectedPeriodeId = Form.useWatch("periode_id", form);
  const selectedStudentId = Form.useWatch("student_id", form);
  const watchedStudentSearch = Form.useWatch("student_search", form) || "";
  const studentSearchValue = currentStudentSearch ?? watchedStudentSearch;
  const canSearchStudent = Boolean(selectedHomebaseId && selectedPeriodeId);
  const singleHomebaseId = homebases.length === 1 ? homebases[0]?.id : undefined;
  const currentHomebaseOption =
    homebases.find((item) => Number(item.id) === Number(selectedHomebaseId)) ||
    (editingTransaction?.homebase_id
      ? {
          id: editingTransaction.homebase_id,
          name: editingTransaction.homebase_name || `Satuan #${editingTransaction.homebase_id}`,
        }
      : null);
  const currentPeriodeOption =
    periodes.find((item) => Number(item.id) === Number(selectedPeriodeId)) ||
    (editingTransaction?.periode_id
      ? {
          id: editingTransaction.periode_id,
          name: editingTransaction.periode_name || `Periode #${editingTransaction.periode_id}`,
          is_active: false,
        }
      : null);
  const currentStudentOption =
    student && selectedStudentId
      ? {
          id: student.student_id || student.id || selectedStudentId,
          full_name: student.full_name || student.student_name || "-",
          nis: student.nis,
          grade_name: student.grade_name,
          class_name: student.class_name,
          periode_name: student.periode_name,
          grade_id: student.grade_id,
          class_id: student.class_id,
        }
      : editingTransaction?.student_id
        ? {
            id: editingTransaction.student_id,
            full_name: editingTransaction.student_name || "-",
            nis: editingTransaction.nis,
            grade_name: editingTransaction.grade_name,
            class_name: editingTransaction.class_name,
            periode_name: editingTransaction.periode_name,
            grade_id: editingTransaction.grade_id,
            class_id: editingTransaction.class_id,
          }
        : null;
  const studentOptions = students.map((item) => ({
    value: item.id,
    plainLabel: formatStudentSearchLabel(item),
    studentData: item,
    label: (
      <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
        <Space direction='vertical' size={1}>
          <Text strong style={{ color: "#0f172a" }}>
            {item.full_name}
          </Text>
          <Text type='secondary'>
            {`NIS ${item.nis || "-"} | ${item.grade_name || "-"} | ${item.class_name || "-"}`}
          </Text>
        </Space>
        <Tag color='blue' style={{ borderRadius: 999 }}>
          {item.periode_name || "-"}
        </Tag>
      </Flex>
        ),
  }));
  const mergedStudentOptions =
    currentStudentOption &&
    !studentOptions.some(
      (item) => Number(item.value) === Number(currentStudentOption.id),
    )
      ? [
          {
            value: currentStudentOption.id,
            plainLabel: formatStudentSearchLabel(currentStudentOption),
            studentData: currentStudentOption,
            label: (
              <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
                <Space direction='vertical' size={1}>
                  <Text strong style={{ color: "#0f172a" }}>
                    {currentStudentOption.full_name}
                  </Text>
                  <Text type='secondary'>
                    {`NIS ${currentStudentOption.nis || "-"} | ${currentStudentOption.grade_name || "-"} | ${currentStudentOption.class_name || "-"}`}
                  </Text>
                </Space>
                <Tag color='blue' style={{ borderRadius: 999 }}>
                  {currentStudentOption.periode_name || "-"}
                </Tag>
              </Flex>
            ),
          },
          ...studentOptions,
        ]
      : studentOptions;
  const homebaseOptions = (
    currentHomebaseOption &&
    !homebases.some((item) => Number(item.id) === Number(currentHomebaseOption.id))
      ? [currentHomebaseOption, ...homebases]
      : homebases
  ).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const periodeOptions = (
    currentPeriodeOption &&
    !periodes.some((item) => Number(item.id) === Number(currentPeriodeOption.id))
      ? [currentPeriodeOption, ...periodes]
      : periodes
  ).map((item) => ({
    value: item.id,
    label: (
      <Flex justify='space-between' align='center' gap={12}>
        <span>{item.name}</span>
        <Tag
          color={getPeriodeTagColor(item.is_active)}
          style={{ borderRadius: 999 }}
        >
          {item.is_active ? "Aktif" : "Tidak Aktif"}
        </Tag>
      </Flex>
    ),
    searchLabel: item.name,
  }));

  useEffect(() => {
    if (!singleHomebaseId) {
      return;
    }

    if (editingTransaction) {
      return;
    }

    if (Number(selectedHomebaseId) === Number(singleHomebaseId)) {
      return;
    }

    onHomebaseChange(singleHomebaseId);
  }, [editingTransaction, onHomebaseChange, selectedHomebaseId, singleHomebaseId]);

  return (
    <Flex vertical gap={20}>
      <Form.Item
        name='student_id'
        hidden
        rules={[{ required: true, message: "Siswa wajib dipilih" }]}
      >
        <Select />
      </Form.Item>
      <Form.Item name='grade_id' hidden>
        <Select />
      </Form.Item>
      <Form.Item name='class_id' hidden>
        <Select />
      </Form.Item>
      <Form.Item name='student_search' hidden>
        <Input />
      </Form.Item>

      <Card
        variant='borderless'
        style={{
          borderRadius: 20,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          border: "1px solid rgba(148,163,184,0.14)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <Form.Item
            name='homebase_id'
            label='Satuan'
            rules={[{ required: true, message: "Satuan wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih satuan'
              size='large'
              options={homebaseOptions}
              disabled={homebases.length <= 1}
              onChange={onHomebaseChange}
              virtual={false}
            />
          </Form.Item>

          <Form.Item
            name='periode_id'
            label='Periode'
            rules={[{ required: true, message: "Periode wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih periode'
              size='large'
              onChange={onPeriodeChange}
              virtual={false}
              options={periodeOptions}
              optionFilterProp='searchLabel'
            />
          </Form.Item>
        </div>

        <Form.Item
          label='Cari Siswa'
          extra='Ketik minimal nama siswa atau NIS. Hasil pencarian tampil otomatis dan pilih siswa langsung dari dropdown.'
        >
          <Select
            size='large'
            allowClear
            showSearch
            value={selectedStudentId}
            placeholder='Contoh: Budi / 23001'
            disabled={!canSearchStudent}
            filterOption={false}
            searchValue={studentSearchValue}
            optionLabelProp='plainLabel'
            suffixIcon={<Search size={16} color='#94a3b8' />}
            notFoundContent={
              !canSearchStudent
                ? "Pilih satuan dan periode terlebih dahulu"
                : !studentSearchValue.trim()
                  ? "Mulai ketik nama siswa atau NIS"
                  : isStudentOptionsLoading
                    ? "Mencari siswa..."
                    : "Siswa tidak ditemukan"
            }
            options={mergedStudentOptions}
            loading={isStudentOptionsLoading}
            defaultActiveFirstOption={false}
            onSearch={onStudentSearchChange}
            onBlur={() => {
              if (!student) {
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
                student_search: formatStudentSearchLabel(selected),
                student_id: selected.id,
                grade_id: selected.grade_id,
                class_id: selected.class_id,
              });
            }}
          />
        </Form.Item>
      </Card>

      {student ? (
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
              color: "#ffffff",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
              <Space size={14} align='start'>
                <Avatar size={52} style={{ background: "#2563eb", fontWeight: 700 }}>
                  {(student.student_name || student.full_name || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </Avatar>
                <Space direction='vertical' size={2}>
                  <Text strong style={{ color: "#ffffff", fontSize: 16 }}>
                    {student.student_name || student.full_name}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    NIS {student.nis || "-"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    {`${student.grade_name || "-"} | ${student.class_name || "-"} | ${student.periode_name || "-"}`}
                  </Text>
                </Space>
              </Space>
              <Tag color='blue' style={{ borderRadius: 999, paddingInline: 12 }}>
                Siswa Terpilih
              </Tag>
            </Flex>
          </Card>
        </MotionDiv>
      ) : (
        <Card
          bordered={false}
          style={{
            borderRadius: 18,
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            border: "1px dashed rgba(148,163,184,0.28)",
          }}
        >
          <Space align='center' size={10}>
            <div
              style={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                color: "#2563eb",
              }}
            >
              <UserRound size={18} />
            </div>
            <Text type='secondary'>
              Pilih satuan, periode, lalu cari siswa untuk mulai menyusun transaksi.
            </Text>
          </Space>
        </Card>
      )}
    </Flex>
  );
};

export default TransactionStepStudent;
