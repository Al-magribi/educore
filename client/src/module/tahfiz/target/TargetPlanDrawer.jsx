import React from "react";
import {
  BookOpen,
  CircleDot,
  Layers2,
  Plus,
  Save,
  Target as TargetIcon,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

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
}) => (
  <Drawer
    title={null}
    width={isMobile ? "100%" : 960}
    open={drawerOpen}
    onClose={closeDrawer}
    destroyOnHidden
    closable={false}
    styles={{
      body: { padding: 0, background: "#f8fafc" },
      header: { display: "none" },
    }}
  >
    <MotionDiv
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          padding: isMobile ? 18 : 24,
          background:
            "linear-gradient(135deg, rgba(239,246,255,1), rgba(224,242,254,0.98))",
          borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
        }}
      >
        <Flex justify='space-between' align='flex-start' gap={16}>
          <Flex align='flex-start' gap={14}>
            <div
              style={{
                width: isMobile ? 50 : 56,
                height: isMobile ? 50 : 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
                color: "#fff",
                boxShadow: "0 18px 32px rgba(29, 78, 216, 0.24)",
                flexShrink: 0,
              }}
            >
              <TargetIcon size={24} />
            </div>

            <div>
              <Flex
                align={isMobile ? "flex-start" : "center"}
                vertical={isMobile}
                gap={10}
                style={{ marginBottom: 6 }}
              >
                <Title level={3} style={{ margin: 0 }}>
                  {editingPlan ? "Edit Target Plan" : "Buat Target Plan"}
                </Title>
                <Tag
                  style={{
                    marginInlineEnd: 0,
                    borderRadius: 999,
                    padding: "6px 12px",
                    background: "rgba(3, 105, 161, 0.10)",
                    color: "#0369a1",
                    border: "1px solid rgba(3, 105, 161, 0.16)",
                    fontWeight: 600,
                  }}
                >
                  Tahfiz Targeting
                </Tag>
              </Flex>

              <Text type='secondary' style={{ display: "block", maxWidth: 620 }}>
                Susun target plan beserta item Juz atau Surah untuk setiap satuan,
                periode, dan tingkat dalam satu panel kerja.
              </Text>
            </div>
          </Flex>

          <Button onClick={closeDrawer} icon={<X size={16} />} style={{ borderRadius: 12 }}>
            Tutup
          </Button>
        </Flex>
      </div>

      <div style={{ padding: isMobile ? 14 : 20, flex: 1, overflow: "auto" }}>
        <Card
          bordered={false}
          style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
          styles={{ body: { padding: isMobile ? 14 : 20 } }}
        >
          <Form form={form} layout='vertical' onFinish={handleSubmit}>
            <Row gutter={[12, 12]}>
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
                <Form.Item label='Status Aktif' name='is_active' valuePropName='checked'>
                  <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label='Catatan Plan' name='notes'>
                  <Input.TextArea rows={2} placeholder='Catatan tambahan plan...' />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation='left'>Item Target</Divider>

            <Form.List name='items'>
              {(fields, { add, remove }) => (
                <Space direction='vertical' size={12} style={{ width: "100%" }}>
                  {fields.map(({ key, name }, index) => (
                    <Card
                      key={key}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #dbeafe",
                        background:
                          "linear-gradient(180deg, #ffffff 0%, rgba(239,246,255,0.5) 100%)",
                      }}
                      styles={{ body: { padding: 14 } }}
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={4}>
                          <Form.Item
                            label={`Item #${index + 1}`}
                            name={[name, "target_type"]}
                            rules={[{ required: true, message: "Pilih tipe target." }]}
                          >
                            <Select
                              virtual={false}
                              options={[
                                {
                                  value: "juz",
                                  label: (
                                    <Space size={6}>
                                      <Layers2 size={14} />
                                      Juz
                                    </Space>
                                  ),
                                },
                                {
                                  value: "surah",
                                  label: (
                                    <Space size={6}>
                                      <BookOpen size={14} />
                                      Surah
                                    </Space>
                                  ),
                                },
                              ]}
                            />
                          </Form.Item>
                        </Col>

                        <Form.Item shouldUpdate noStyle>
                          {({ getFieldValue }) => {
                            const type = getFieldValue(["items", name, "target_type"]);

                            return (
                              <>
                                {type === "juz" ? (
                                  <Col xs={24} md={8}>
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
                                      />
                                    </Form.Item>
                                  </Col>
                                ) : null}

                                {type === "surah" ? (
                                  <Col xs={24} md={8}>
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
                                      />
                                    </Form.Item>
                                  </Col>
                                ) : null}
                              </>
                            );
                          }}
                        </Form.Item>

                        <Col xs={24} md={4}>
                          <Form.Item
                            label='Wajib'
                            name={[name, "is_mandatory"]}
                            valuePropName='checked'
                            initialValue
                          >
                            <Switch
                              checkedChildren={<CircleDot size={12} />}
                              unCheckedChildren={<CircleDot size={12} />}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={20}>
                          <Form.Item label='Catatan Item' name={[name, "notes"]}>
                            <Input placeholder='Opsional: target khusus, metode, dll.' />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Button
                            danger
                            icon={<Trash2 size={14} />}
                            style={{ marginTop: 30 }}
                            onClick={() => remove(name)}
                            block
                          >
                            Hapus
                          </Button>
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Button
                    icon={<Plus size={15} />}
                    onClick={() => add({ target_type: "juz", is_mandatory: true })}
                  >
                    Tambah Item Target
                  </Button>
                </Space>
              )}
            </Form.List>

            <Divider />

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={closeDrawer}>Batal</Button>
              <Button type='primary' htmlType='submit' icon={<Save size={15} />} loading={saving}>
                Simpan Target Plan
              </Button>
            </Space>
          </Form>
        </Card>
      </div>
    </MotionDiv>
  </Drawer>
);

export default TargetPlanDrawer;
