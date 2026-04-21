import { motion } from "framer-motion";
import { Form, Input, Button, Alert, Typography, theme, Card, Flex } from "antd";
import { Plus, Trash2, Type, CheckCircle2 } from "lucide-react";
import TextEditor from "./TextEditor";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const OptionShortAnswer = () => {
  const { token } = theme.useToken();

  return (
    <Card
      bordered={false}
      style={{
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
        border: `1px dashed ${token.colorBorder}`,
      }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
          <Type size={16} />
          <Title level={5} style={{ margin: 0 }}>
            Kunci Jawaban Isian Singkat
          </Title>
        </Flex>
        <Alert
          message="Petunjuk"
          description="Masukkan variasi jawaban yang dianggap benar. Sistem akan melakukan pencocokan teks secara otomatis saat pemeriksaan."
          type="info"
          showIcon
          style={{ marginTop: 8, borderRadius: 14 }}
        />
      </div>

      <Form.List
        name="options"
        rules={[
          {
            validator: async (_, names) => {
              if (!names || names.length < 1) {
                return Promise.reject(new Error("Minimal harus ada 1 kunci jawaban"));
              }
            },
          },
        ]}
      >
        {(fields, { add, remove }, { errors }) => (
          <>
            {fields.map(({ key, name, ...restField }, index) => (
              <MotionDiv
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  size="small"
                  style={{ marginBottom: 12, borderRadius: 16 }}
                  styles={{ body: { padding: 14 } }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: "block", marginBottom: 8 }}>
                        Variasi Jawaban {index + 1}
                      </Text>
                      <Form.Item
                        {...restField}
                        name={[name, "content"]}
                        rules={[{ required: true, message: "Masukkan teks kunci jawaban" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <TextEditor
                          variant="short"
                          placeholder={`Variasi jawaban benar ke-${index + 1}...`}
                          showCount
                          maxLength={200}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      {...restField}
                      name={[name, "is_correct"]}
                      initialValue={true}
                      hidden
                    >
                      <Input />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={18} />}
                        onClick={() => remove(name)}
                        style={{ marginTop: 28 }}
                      />
                    )}
                  </div>
                </Card>
              </MotionDiv>
            ))}

            <Card
              bordered={false}
              style={{
                marginBottom: 12,
                borderRadius: 16,
                background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                border: "1px solid rgba(14, 165, 233, 0.16)",
              }}
            >
              <Flex align="flex-start" gap={12}>
                <CheckCircle2 size={18} color="#0284c7" style={{ marginTop: 2 }} />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Rekomendasi
                  </Text>
                  <Text type="secondary">
                    Tambahkan variasi penulisan yang umum digunakan agar sistem tetap toleran terhadap perbedaan format jawaban siswa.
                  </Text>
                </div>
              </Flex>
            </Card>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="dashed"
                onClick={() => add({ content: "", is_correct: true })}
                block
                icon={<Plus size={16} />}
                style={{ height: 45, borderRadius: 14 }}
              >
                Tambah Variasi Jawaban
              </Button>
              <Form.ErrorList errors={errors} />
            </Form.Item>
          </>
        )}
      </Form.List>
    </Card>
  );
};

export default OptionShortAnswer;
