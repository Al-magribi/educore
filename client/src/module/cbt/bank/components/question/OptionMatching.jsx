import React from "react";
import { motion } from "framer-motion";
import { Form, Input, Button, Alert, Typography, Grid, Card, Flex } from "antd";
import { Plus, Trash2, GitMerge } from "lucide-react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const OptionMatching = () => {
  const screens = useBreakpoint();
  return (
    <Card
      bordered={false}
      style={{
        background: "linear-gradient(135deg, #fafafa, #f8fbff)",
        borderRadius: 18,
        border: "1px solid #f0f0f0",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Alert
        message="Instruksi Matematika"
        description={
          <span>
            Gunakan simbol <b>$</b> untuk menulis rumus. Contoh:{" "}
            <code>$E=mc^2$</code>.
          </span>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 14 }}
      />
      <Text type="secondary" style={{ display: "block", marginBottom: 14 }}>
        Sisi kanan akan diacak saat ujian. Peserta akan mencocokkan jawaban dengan
        premis pada sisi kiri.
      </Text>

      <Form.List name="options">
        {(fields, { add, remove }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fields.map(({ key, name, ...restField }) => (
              <MotionDiv
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  size="small"
                  style={{ borderRadius: 16 }}
                  styles={{ body: { padding: 14 } }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: screens.sm ? "row" : "column",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "label"]}
                      label="Premis"
                      rules={[{ required: true, message: "Isi premis" }]}
                      style={{ marginBottom: 0, flex: 1, width: "100%" }}
                    >
                      <Input placeholder="Premis" size="large" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <div
                      style={{
                        background: "#e6f7ff",
                        padding: 8,
                        borderRadius: "50%",
                        transform: screens.sm ? "none" : "rotate(90deg)",
                        flexShrink: 0,
                      }}
                    >
                      <GitMerge size={16} color="#1890ff" />
                    </div>

                    <Form.Item
                      {...restField}
                      name={[name, "content"]}
                      label="Pasangan Jawaban"
                      rules={[{ required: true, message: "Isi pasangan" }]}
                      style={{ marginBottom: 0, flex: 1, width: "100%" }}
                    >
                      <Input placeholder="Jawaban" size="large" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Button
                      danger
                      type="text"
                      icon={<Trash2 size={16} />}
                      onClick={() => remove(name)}
                    />
                  </div>

                  <Form.Item
                    shouldUpdate={(prevValues, curValues) =>
                      prevValues.options !== curValues.options
                    }
                    style={{ marginBottom: 0, marginTop: 10 }}
                  >
                    {({ getFieldValue }) => {
                      const label = getFieldValue(["options", name, "label"]);
                      const content = getFieldValue(["options", name, "content"]);
                      return (
                        <div style={{ display: "flex", gap: 10, paddingRight: 32 }}>
                          <div style={{ flex: 1 }}>
                            {label?.includes("$") && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Preview: <InlineMath math={label.replaceAll("$", "")} />
                              </Text>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            {content?.includes("$") && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Preview: <InlineMath math={content.replaceAll("$", "")} />
                              </Text>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  </Form.Item>

                  <Form.Item
                    name={[name, "is_correct"]}
                    initialValue={true}
                    hidden
                  >
                    <Input />
                  </Form.Item>
                </Card>
              </MotionDiv>
            ))}

            <Button
              type="dashed"
              onClick={() => add({ label: "", content: "", is_correct: true })}
              block
              icon={<Plus size={16} />}
              size="large"
              style={{ borderRadius: 14 }}
            >
              Tambah Pasangan
            </Button>
          </div>
        )}
      </Form.List>
    </Card>
  );
};

export default OptionMatching;
