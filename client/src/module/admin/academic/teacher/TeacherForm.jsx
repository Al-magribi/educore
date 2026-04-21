import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Modal,
  Form,
  Input,
  Select,
  Divider,
  Button,
  Row,
  Col,
  Space,
  Card,
  Typography,
  Flex,
} from "antd";
import {
  Plus,
  Trash2,
  User,
  Briefcase,
  BookOpen,
  Loader2,
  School,
  CheckCircle,
} from "lucide-react";
import {
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} from "../../../../service/academic/ApiTeacher"; // Sesuaikan path import

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const TeacherForm = ({ open, onCancel, onSubmit, initialValues, loading }) => {
  const [form] = Form.useForm();

  // Fetch Options
  const { data: classesData } = useGetClassesListQuery();
  const { data: subjectsData } = useGetSubjectsListQuery();

  const subjectOptions = useMemo(() => {
    const collator = new Intl.Collator("id", {
      sensitivity: "base",
      numeric: true,
    });

    return [...(subjectsData || [])]
      .sort((a, b) => collator.compare(a.name || "", b.name || ""))
      .map((subject) => ({
        label: subject.name,
        value: subject.id,
      }));
  }, [subjectsData]);

  const parseClassName = (name = "") => {
    const trimmed = String(name).trim();
    const match = trimmed.match(/^(\d+)\s*(.*)$/);

    if (!match) {
      return {
        grade: Number.MAX_SAFE_INTEGER,
        suffixNumber: Number.MAX_SAFE_INTEGER,
        suffixText: trimmed,
      };
    }

    const suffix = match[2].trim();
    const suffixMatch = suffix.match(/^(\d+)\s*(.*)$/);

    return {
      grade: Number(match[1]),
      suffixNumber: suffixMatch ? Number(suffixMatch[1]) : Number.MAX_SAFE_INTEGER,
      suffixText: (suffixMatch ? suffixMatch[2] : suffix).trim(),
    };
  };

  const classOptions = useMemo(() => {
    const collator = new Intl.Collator("id", {
      sensitivity: "base",
      numeric: true,
    });

    return [...(classesData || [])]
      .filter((classItem) => classItem.is_active)
      .sort((a, b) => {
        const left = parseClassName(a.name);
        const right = parseClassName(b.name);

        if (left.grade !== right.grade) return left.grade - right.grade;
        if (left.suffixNumber !== right.suffixNumber) {
          return left.suffixNumber - right.suffixNumber;
        }

        return collator.compare(left.suffixText, right.suffixText);
      })
      .map((classItem) => ({
        label: classItem.name,
        value: classItem.id,
      }));
  }, [classesData]);

  const classOrderMap = useMemo(
    () =>
      new Map(classOptions.map((option, index) => [option.value, index])),
    [classOptions],
  );

  useEffect(() => {
    if (open) {
      if (initialValues) {
        // --- LOGIKA PERBAIKAN 1: GROUPING DATA UNTUK EDIT ---
        // Backend mengirim: [{subject_id: 1, class_id: 10}, {subject_id: 1, class_id: 11}]
        // Kita ubah jadi:   [{subject_id: 1, class_ids: [10, 11]}]

        const rawAllocations = initialValues.allocations || [];
        const groupedMap = new Map();

        rawAllocations.forEach((item) => {
          if (!groupedMap.has(item.subject_id)) {
            groupedMap.set(item.subject_id, {
              subject_id: item.subject_id,
              class_ids: [], // Array untuk menampung banyak kelas
            });
          }
          groupedMap.get(item.subject_id).class_ids.push(item.class_id);
        });

        const formattedAllocations = Array.from(groupedMap.values()).map(
          (allocation) => ({
            ...allocation,
            class_ids: [...allocation.class_ids].sort(
              (left, right) =>
                (classOrderMap.get(left) ?? Number.MAX_SAFE_INTEGER) -
                (classOrderMap.get(right) ?? Number.MAX_SAFE_INTEGER),
            ),
          }),
        );

        form.setFieldsValue({
          ...initialValues,
          homeroom_class_id: initialValues.homeroom_class?.id,
          allocations: formattedAllocations,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form, classOrderMap]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={750} // Sedikit diperlebar agar nyaman
      centered
      destroyOnHidden
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: { padding: 0 },
      }}
      closable={false}
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
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ allocations: [] }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.96))",
            padding: 28,
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex align="flex-start" gap={16}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                color: "#fff",
                boxShadow: "0 16px 30px rgba(37, 99, 235, 0.28)",
              }}
            >
              {initialValues ? <User size={22} /> : <Plus size={22} />}
            </div>
            <div style={{ flex: 1 }}>
              <Title level={4} style={{ margin: 0 }}>
                {initialValues ? "Edit Data Guru" : "Tambah Guru Baru"}
              </Title>
              <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                Simpan data guru, tugas tambahan, dan alokasi mengajar dalam satu form yang lebih rapi.
              </Text>
            </div>
          </Flex>
        </div>

        <div style={{ padding: 28, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <Card bordered={false} style={{ borderRadius: 20, background: "#fff" }}>
              <Divider titlePlacement="left">
                <Space>
                  <User size={16} /> Data Pribadi
                </Space>
              </Divider>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="full_name"
                    label="Nama Lengkap"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Nama lengkap dengan gelar" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="username"
                    label="Username (Login)"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="Username unik" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="nip" label="NIP / NIY">
                    <Input placeholder="Nomor Induk Pegawai" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label="No. Telepon">
                    <Input placeholder="08..." size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="email" label="Email">
                    <Input placeholder="email@sekolah.sch.id" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card bordered={false} style={{ borderRadius: 20, background: "#fff" }}>
              <Divider titlePlacement="left">
                <Space>
                  <Briefcase size={16} /> Tugas Tambahan
                </Space>
              </Divider>
              <Form.Item
                name="homeroom_class_id"
                label="Wali Kelas (Opsional)"
                help="Pilih kelas jika guru ini adalah wali kelas"
              >
                <Select
                  allowClear
                  placeholder="Pilih Kelas"
                  options={classOptions}
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  virtual={false}
                />
              </Form.Item>
            </Card>

            <Card bordered={false} style={{ borderRadius: 20, background: "#fff" }}>
              <Divider titlePlacement="left">
                <Space>
                  <BookOpen size={16} /> Mata Pelajaran yang Diampu
                </Space>
              </Divider>

              <Form.List name="allocations">
                {(fields, { add, remove }) => (
                  <div style={{ display: "flex", flexDirection: "column", rowGap: 16 }}>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card
                        key={key}
                        size="small"
                        styles={{ body: { padding: "14px", background: "#f8fafc" } }}
                        style={{ borderRadius: 18 }}
                      >
                        <Row gutter={12} align="top">
                          <Col xs={24} md={8}>
                            <Form.Item
                              {...restField}
                              name={[name, "subject_id"]}
                              label="Mata Pelajaran"
                              rules={[{ required: true, message: "Wajib pilih" }]}
                            >
                              <Select
                                placeholder="Pilih Mapel"
                                showSearch
                                optionFilterProp="label"
                                options={subjectOptions}
                                allowClear
                                virtual={false}
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={14}>
                            <Form.Item
                              {...restField}
                              name={[name, "class_ids"]}
                              label="Daftar Kelas Ajar"
                              rules={[
                                { required: true, message: "Pilih minimal 1 kelas" },
                              ]}
                            >
                              <Select
                                mode="multiple"
                                placeholder="Pilih Kelas (Bisa banyak)"
                                allowClear
                                virtual={false}
                                maxTagCount="responsive"
                                showSearch
                                optionFilterProp="label"
                                options={classOptions}
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={2} style={{ textAlign: "right", paddingTop: "30px" }}>
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 size={18} />}
                              onClick={() => remove(name)}
                            />
                          </Col>
                        </Row>
                      </Card>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<Plus size={16} />}
                      size="large"
                      style={{ borderRadius: 14 }}
                    >
                      Tambah Alokasi Mapel
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>

            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                border: "1px solid rgba(14, 165, 233, 0.16)",
              }}
            >
              <Flex align="flex-start" gap={12}>
                <CheckCircle size={18} color="#0284c7" style={{ marginTop: 2 }} />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Tips pengisian
                  </Text>
                  <Text type="secondary">
                    Pastikan username unik, wali kelas sesuai referensi kelas, dan alokasi mapel sudah mencakup semua kelas yang diajar.
                  </Text>
                </div>
              </Flex>
            </Card>

            {!initialValues && (
              <Form.Item name="password" hidden initialValue="123456">
                <Input />
              </Form.Item>
            )}

            <Flex justify="flex-end" gap={10}>
              <Button size="large" onClick={onCancel} style={{ borderRadius: 14, minWidth: 120 }}>
                Batal
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                icon={
                  loading ? <Loader2 className="animate-spin" size={16} /> : <School size={16} />
                }
                style={{
                  borderRadius: 14,
                  minWidth: 190,
                  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
                }}
              >
                {initialValues ? "Simpan Perubahan" : "Buat Data Guru"}
              </Button>
            </Flex>
          </MotionDiv>
        </div>
      </Form>
    </Modal>
  );
};

export default TeacherForm;
