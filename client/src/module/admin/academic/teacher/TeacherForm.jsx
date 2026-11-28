import React, { useEffect, useMemo } from "react";
import { Button, Col, Divider, Flex, Form, Input, Row, Select, Space, Tooltip } from "antd";
import { BookOpen, Briefcase, Plus, Trash2, User } from "lucide-react";
import { FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors, museRadius } from "../../../../config/theme";
import {
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} from "../../../../service/academic/ApiTeacher"; // Sesuaikan path import

const TeacherForm = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  loading,
  classesData: classesProp,
  subjectsData: subjectsProp,
}) => {
  const [form] = Form.useForm();

  // Fetch Options (skip jika data sudah disuplai dari parent, mis. admin pusat)
  const { data: classesFromApi } = useGetClassesListQuery(undefined, {
    skip: Array.isArray(classesProp),
  });
  const { data: subjectsFromApi } = useGetSubjectsListQuery(undefined, {
    skip: Array.isArray(subjectsProp),
  });

  const classesData = Array.isArray(classesProp) ? classesProp : classesFromApi;
  const subjectsData = Array.isArray(subjectsProp) ? subjectsProp : subjectsFromApi;

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
          password: "",
          homeroom_class_id: initialValues.homeroom_class?.id,
          allocations: formattedAllocations,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ password: "123456" });
      }
    }
  }, [open, initialValues, form, classOrderMap]);

  const sectionTitle = (icon, label) => (
    <Divider titlePlacement="left" style={{ marginTop: 8 }}>
      <Space style={{ color: museColors.navy, fontWeight: 600 }}>
        {icon} {label}
      </Space>
    </Divider>
  );

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={760}
      icon={initialValues ? <User size={16} /> : <Plus size={16} />}
      title={initialValues ? "Edit Data Guru" : "Tambah Guru Baru"}
      description="Data pribadi, tugas tambahan, dan alokasi mengajar."
      okText={initialValues ? "Simpan Perubahan" : "Buat Data Guru"}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ allocations: [], password: "123456" }}
      >
        {sectionTitle(<User size={16} />, "Data Pribadi")}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="full_name"
              label="Nama Lengkap"
              rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
            >
              <Input placeholder="Nama lengkap dengan gelar" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="username"
              label="Username (login)"
              rules={[{ required: true, message: "Username wajib diisi" }]}
            >
              <Input placeholder="Username unik" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="password"
              label={initialValues ? "Password Baru" : "Password"}
              rules={[
                {
                  validator: (_, value) => {
                    const next = String(value || "").trim();
                    if (!next) {
                      return initialValues
                        ? Promise.resolve()
                        : Promise.reject(new Error("Password wajib diisi"));
                    }
                    if (next.length < 6) {
                      return Promise.reject(new Error("Minimal 6 karakter"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={
                initialValues
                  ? "Kosongkan jika tidak ingin mengubah password"
                  : "Default 123456, bisa diganti sebelum disimpan"
              }
            >
              <Input.Password
                placeholder={initialValues ? "Kosongkan jika tidak diubah" : "Password login guru"}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="nip" label="NIP / NIY">
              <Input placeholder="Nomor Induk Pegawai" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="rfid_no" label="No RFID (opsional)">
              <Input placeholder="Nomor RFID kartu guru" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="No. Telepon">
              <Input placeholder="08..." />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="email" label="Email">
              <Input placeholder="email@sekolah.sch.id" />
            </Form.Item>
          </Col>
        </Row>

        {sectionTitle(<Briefcase size={16} />, "Tugas Tambahan")}
        <Form.Item
          name="homeroom_class_id"
          label="Wali Kelas Periode Aktif (opsional)"
          extra="Berlaku untuk periode aktif saja. Periode lain tidak berubah, dan wali kelas diatur ulang setiap periode."
        >
          <Select
            allowClear
            placeholder="Pilih kelas"
            options={classOptions}
            showSearch
            optionFilterProp="label"
            virtual={false}
          />
        </Form.Item>

        {sectionTitle(<BookOpen size={16} />, "Mata Pelajaran yang Diampu")}
        <Form.List name="allocations">
          {(fields, { add, remove }) => (
            <Flex vertical gap={12}>
              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  style={{
                    padding: "12px 12px 0",
                    borderRadius: museRadius.item,
                    background: museColors.bgLayout,
                    border: `1px solid ${museColors.divider}`,
                  }}
                >
                  <Row gutter={12} align="top">
                    <Col xs={24} md={9}>
                      <Form.Item
                        {...restField}
                        name={[name, "subject_id"]}
                        label="Mata Pelajaran"
                        rules={[{ required: true, message: "Wajib pilih" }]}
                      >
                        <Select
                          placeholder="Pilih mapel"
                          showSearch
                          optionFilterProp="label"
                          options={subjectOptions}
                          allowClear
                          virtual={false}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={21} md={13}>
                      <Form.Item
                        {...restField}
                        name={[name, "class_ids"]}
                        label="Kelas yang diajar"
                        rules={[{ required: true, message: "Pilih minimal 1 kelas" }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="Pilih kelas (bisa banyak)"
                          allowClear
                          virtual={false}
                          maxTagCount="responsive"
                          showSearch
                          optionFilterProp="label"
                          options={classOptions}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={3} md={2} style={{ textAlign: "right", paddingTop: 30 }}>
                      <Tooltip title="Hapus alokasi">
                        <Button
                          type="text"
                          danger
                          aria-label="Hapus alokasi"
                          icon={<Trash2 size={16} />}
                          onClick={() => remove(name)}
                        />
                      </Tooltip>
                    </Col>
                  </Row>
                </div>
              ))}

              <Button type="dashed" onClick={() => add()} block icon={<Plus size={16} />}>
                Tambah Alokasi Mapel
              </Button>
            </Flex>
          )}
        </Form.List>
      </Form>
    </FormModal>
  );
};

export default TeacherForm;
