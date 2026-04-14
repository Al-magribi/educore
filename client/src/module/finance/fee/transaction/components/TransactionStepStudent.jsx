import { Avatar, Card, Flex, Form, Input, Select, Space, Tag, Typography } from "antd";
import { Search } from "lucide-react";

import { getPeriodeTagColor } from "./transactionFormShared.jsx";

const { Text } = Typography;

const formatStudentSearchLabel = (item) =>
  `${item.full_name}${item.nis ? ` - ${item.nis}` : ""}`;

const TransactionStepStudent = ({
  form,
  homebases,
  periodes,
  students,
  student,
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
            options={homebases.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
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
            options={periodes.map((item) => ({
              value: item.id,
              label: (
                <Flex justify='space-between' align='center' gap={12}>
                  <span>{item.name}</span>
                  <Tag color={getPeriodeTagColor(item.is_active)}>
                    {item.is_active ? "Aktif" : "Tidak Aktif"}
                  </Tag>
                </Flex>
              ),
              searchLabel: item.name,
            }))}
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
          options={studentOptions}
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

      {student ? (
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
              <Avatar
                size={52}
                style={{ background: "#2563eb", fontWeight: 700 }}
              >
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
      ) : null}
    </Flex>
  );
};

export default TransactionStepStudent;
