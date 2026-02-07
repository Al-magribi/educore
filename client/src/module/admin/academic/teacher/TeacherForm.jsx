import React, { useEffect } from "react";
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

        const formattedAllocations = Array.from(groupedMap.values());

        form.setFieldsValue({
          ...initialValues,
          homeroom_class_id: initialValues.homeroom_class?.id,
          allocations: formattedAllocations,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  return (
    <Modal
      title={initialValues ? "Edit Data Guru" : "Tambah Guru Baru"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={750} // Sedikit diperlebar agar nyaman
      centered
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        initialValues={{ allocations: [] }}
      >
        {/* --- SECTION 1: DATA PRIBADI --- */}
        <Divider titlePlacement='left'>
          <Space>
            <User size={16} /> Data Pribadi
          </Space>
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='full_name'
              label='Nama Lengkap'
              rules={[{ required: true }]}
            >
              <Input placeholder='Nama lengkap dengan gelar' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='username'
              label='Username (Login)'
              rules={[{ required: true }]}
            >
              <Input placeholder='Username unik' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='nip' label='NIP / NIY'>
              <Input placeholder='Nomor Induk Pegawai' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='phone' label='No. Telepon'>
              <Input placeholder='08...' />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='email' label='Email'>
              <Input placeholder='email@sekolah.sch.id' />
            </Form.Item>
          </Col>
        </Row>

        {/* --- SECTION 2: TUGAS TAMBAHAN --- */}
        <Divider titlePlacement='left'>
          <Space>
            <Briefcase size={16} /> Tugas Tambahan
          </Space>
        </Divider>
        <Form.Item
          name='homeroom_class_id'
          label='Wali Kelas (Opsional)'
          help='Pilih kelas jika guru ini adalah wali kelas'
        >
          <Select
            allowClear
            placeholder='Pilih Kelas'
            options={classesData?.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
        </Form.Item>

        {/* --- SECTION 3: ALOKASI MENGAJAR (MULTI-SELECT) --- */}
        <Divider titlePlacement='left'>
          <Space>
            <BookOpen size={16} /> Mata Pelajaran yang Diampu
          </Space>
        </Divider>

        <Form.List name='allocations'>
          {(fields, { add, remove }) => (
            <div
              style={{ display: "flex", flexDirection: "column", rowGap: 16 }}
            >
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size='small'
                  type='inner'
                  styles={{ body: { padding: "12px", background: "#f9f9f9" } }}
                >
                  <Row gutter={12} align='top'>
                    {" "}
                    {/* Align top agar rapi jika select membesar */}
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, "subject_id"]}
                        label='Mata Pelajaran'
                        rules={[{ required: true, message: "Wajib pilih" }]}
                      >
                        <Select
                          placeholder='Pilih Mapel'
                          showSearch={{ optionFilterProp: ["label"] }}
                          options={subjectsData?.map((s) => ({
                            label: s.name,
                            value: s.id,
                          }))}
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
                        label='Daftar Kelas Ajar'
                        rules={[
                          { required: true, message: "Pilih minimal 1 kelas" },
                        ]}
                      >
                        <Select
                          mode='multiple' // Fitur Kunci: Multi Select
                          placeholder='Pilih Kelas (Bisa banyak)'
                          allowClear
                          virtual={false}
                          maxTagCount='responsive' // Agar tidak merusak layout jika banyak
                          options={classesData?.map((c) => ({
                            label: c.name,
                            value: c.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col
                      span={2}
                      style={{ textAlign: "right", paddingTop: "30px" }}
                    >
                      <Button
                        type='text'
                        danger
                        icon={<Trash2 size={18} />}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}

              <Button
                type='dashed'
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
          <Form.Item name='password' hidden initialValue='123456'>
            <Input />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default TeacherForm;
