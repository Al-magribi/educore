import { BookOpen, Layers2, ListChecks, Plus, Target as TargetIcon, Trash2 } from "lucide-react";
import {
  Button,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Switch,
  Tooltip,
  Typography,
  theme,
} from "antd";

import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museRadius } from "../../../config/theme";

const { Text } = Typography;

const targetTypeOptions = [
  {
    value: "juz",
    label: (
      <Flex align='center' gap={6}>
        <Layers2 size={14} />
        Juz
      </Flex>
    ),
  },
  {
    value: "surah",
    label: (
      <Flex align='center' gap={6}>
        <BookOpen size={14} />
        Surah
      </Flex>
    ),
  },
];

const TargetPlanDrawer = ({
  isMobile,
  drawerOpen,
  closeDrawer,
  editingPlan,
  form,
  handleSubmit,
  homebaseOptions,
  formPeriodeOptions,
  formGradeOptions,
  formOptionsQuery,
  juzOptions,
  surahOptions,
  saving,
}) => {
  const { token } = theme.useToken();

  return (
    <Drawer
      title={
        <CardTitle
          icon={<TargetIcon size={18} />}
          title={editingPlan ? "Edit Target Plan" : "Buat Target Plan"}
          description={
            isMobile
              ? undefined
              : "Susun target juz atau surah untuk satuan, periode, dan tingkat tertentu."
          }
        />
      }
      width={isMobile ? "100%" : 880}
      open={drawerOpen}
      onClose={closeDrawer}
      destroyOnHidden
      styles={{ body: { background: token.colorBgLayout, padding: isMobile ? 16 : 24 } }}
      footer={
        <Flex justify='flex-end' gap={8}>
          <Button onClick={closeDrawer}>Batal</Button>
          <Button type='primary' onClick={form.submit} loading={saving}>
            Simpan Target
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit}>
        <Flex vertical gap={isMobile ? 16 : 24}>
          <MuseCard title={<CardTitle title='Informasi Plan' />}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Satuan'
                  name='homebase_id'
                  rules={[{ required: true, message: "Satuan wajib dipilih." }]}
                >
                  <Select
                    placeholder='Pilih satuan'
                    options={homebaseOptions}
                    virtual={false}
                    onChange={() => {
                      form.setFieldsValue({ periode_id: undefined, grade_id: undefined });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Periode'
                  name='periode_id'
                  rules={[{ required: true, message: "Periode wajib dipilih." }]}
                >
                  <Select
                    options={formPeriodeOptions}
                    virtual={false}
                    placeholder='Pilih periode'
                    loading={formOptionsQuery.isFetching}
                    disabled={!formPeriodeOptions.length}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Tingkat'
                  name='grade_id'
                  rules={[{ required: true, message: "Tingkat wajib dipilih." }]}
                >
                  <Select
                    options={formGradeOptions}
                    virtual={false}
                    placeholder='Pilih tingkat'
                    loading={formOptionsQuery.isFetching}
                    disabled={!formGradeOptions.length}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item label='Judul Plan' name='title'>
                  <Input placeholder='Contoh: Target Tahfiz Kelas 7 Semester Ganjil' />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label='Status' name='is_active' valuePropName='checked'>
                  <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label='Catatan Plan' name='notes' style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} placeholder='Catatan tambahan (opsional)' />
                </Form.Item>
              </Col>
            </Row>
          </MuseCard>

          <Form.List name='items'>
            {(fields, { add, remove }) => (
              <MuseCard
                title={
                  <CardTitle
                    icon={<ListChecks size={18} />}
                    title='Item Target'
                    description={`${fields.length} item`}
                  />
                }
                extra={
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => add({ target_type: "juz", is_mandatory: true })}
                  >
                    Tambah Item
                  </Button>
                }
              >
                {fields.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='Belum ada item. Tambahkan minimal satu juz atau surah.'
                  />
                ) : (
                  <Flex vertical gap={12}>
                    {fields.map(({ key, name }, index) => (
                      <div
                        key={key}
                        style={{
                          border: `1px solid ${token.colorBorderSecondary}`,
                          borderRadius: museRadius.item,
                          padding: isMobile ? 12 : 16,
                        }}
                      >
                        <Flex justify='space-between' align='center' style={{ marginBottom: 8 }}>
                          <Text strong>Item {index + 1}</Text>
                          <Tooltip title='Hapus item'>
                            <Button
                              type='text'
                              danger
                              aria-label={`Hapus item ${index + 1}`}
                              icon={<Trash2 size={16} />}
                              onClick={() => remove(name)}
                            />
                          </Tooltip>
                        </Flex>
                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Form.Item
                              label='Tipe'
                              name={[name, "target_type"]}
                              rules={[{ required: true, message: "Pilih tipe target." }]}
                            >
                              <Select virtual={false} options={targetTypeOptions} />
                            </Form.Item>
                          </Col>

                          <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                              const type = getFieldValue(["items", name, "target_type"]);
                              return type === "surah" ? (
                                <Col xs={24} md={13}>
                                  <Form.Item
                                    label='Pilih Surah'
                                    name={[name, "surah_ids"]}
                                    rules={[{ required: true, message: "Surah wajib dipilih." }]}
                                  >
                                    <Select
                                      mode='multiple'
                                      virtual={false}
                                      showSearch
                                      optionFilterProp='label'
                                      placeholder='Pilih satu atau lebih surah'
                                      options={surahOptions}
                                      maxTagCount='responsive'
                                    />
                                  </Form.Item>
                                </Col>
                              ) : (
                                <Col xs={24} md={13}>
                                  <Form.Item
                                    label='Pilih Juz'
                                    name={[name, "juz_ids"]}
                                    rules={[{ required: true, message: "Juz wajib dipilih." }]}
                                  >
                                    <Select
                                      mode='multiple'
                                      options={juzOptions}
                                      virtual={false}
                                      placeholder='Pilih satu atau lebih juz'
                                      maxTagCount='responsive'
                                    />
                                  </Form.Item>
                                </Col>
                              );
                            }}
                          </Form.Item>

                          <Col xs={24} md={5}>
                            <Form.Item
                              label='Sifat'
                              name={[name, "is_mandatory"]}
                              valuePropName='checked'
                              initialValue
                            >
                              <Switch checkedChildren='Wajib' unCheckedChildren='Opsional' />
                            </Form.Item>
                          </Col>

                          <Col span={24}>
                            <Form.Item
                              label='Catatan Item'
                              name={[name, "notes"]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder='Opsional: target khusus, metode, dll.' />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </Flex>
                )}
              </MuseCard>
            )}
          </Form.List>
        </Flex>
      </Form>
    </Drawer>
  );
};

export default TargetPlanDrawer;
