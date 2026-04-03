import React, { useEffect, useMemo } from "react";
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
} from "antd";
import { Plus, Trash2, User, Briefcase, BookOpen } from "lucide-react";
import {
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} from "../../../../service/academic/ApiTeacher"; // Sesuaikan path import

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
      title={initialValues ? "Edit Data Guru" : "Tambah Guru Baru"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={750} // Sedikit diperlebar agar nyaman
      centered
      destroyOnHidden
      styles={{
        body: {
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          paddingRight: 8,
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ allocations: [] }}
      >
        {/* --- SECTION 1: DATA PRIBADI --- */}
        <Divider titlePlacement="left">
          <Space>
            <User size={16} /> Data Pribadi
          </Space>
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="full_name"
              label="Nama Lengkap"
              rules={[{ required: true }]}
            >
              <Input placeholder="Nama lengkap dengan gelar" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username (Login)"
              rules={[{ required: true }]}
            >
              <Input placeholder="Username unik" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nip" label="NIP / NIY">
              <Input placeholder="Nomor Induk Pegawai" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="No. Telepon">
              <Input placeholder="08..." />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="email" label="Email">
              <Input placeholder="email@sekolah.sch.id" />
            </Form.Item>
          </Col>
        </Row>

        {/* --- SECTION 2: TUGAS TAMBAHAN --- */}
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
          />
        </Form.Item>

        {/* --- SECTION 3: ALOKASI MENGAJAR (MULTI-SELECT) --- */}
        <Divider titlePlacement="left">
          <Space>
            <BookOpen size={16} /> Mata Pelajaran yang Diampu
          </Space>
        </Divider>

        <Form.List name="allocations">
          {(fields, { add, remove }) => (
            <div
              style={{ display: "flex", flexDirection: "column", rowGap: 16 }}
            >
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  type="inner"
                  styles={{ body: { padding: "12px", background: "#f9f9f9" } }}
                >
                  <Row gutter={12} align="top">
                    {" "}
                    {/* Align top agar rapi jika select membesar */}
                    <Col span={8}>
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
                        />
                      </Form.Item>
                    </Col>
                    {/* --- PERBAIKAN 2: MULTI SELECT CLASS --- */}
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        name={[name, "class_ids"]} // Perhatikan nama field jamak
                        label="Daftar Kelas Ajar"
                        rules={[
                          { required: true, message: "Pilih minimal 1 kelas" },
                        ]}
                      >
                        <Select
                          mode="multiple" // Fitur Kunci: Multi Select
                          placeholder="Pilih Kelas (Bisa banyak)"
                          allowClear
                          virtual={false}
                          maxTagCount="responsive" // Agar tidak merusak layout jika banyak
                          showSearch
                          optionFilterProp="label"
                          options={classOptions}
                        />
                      </Form.Item>
                    </Col>
                    <Col
                      span={2}
                      style={{ textAlign: "right", paddingTop: "30px" }}
                    >
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
              >
                Tambah Alokasi Mapel
              </Button>
            </div>
          )}
        </Form.List>

        {!initialValues && (
          <Form.Item name="password" hidden initialValue="123456">
            <Input />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default TeacherForm;
