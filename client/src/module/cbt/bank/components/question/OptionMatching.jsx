import React from "react";
import { Form, Input, Button, Alert, Typography, Space, Grid } from "antd";
import { Plus, Trash2, GitMerge } from "lucide-react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const OptionMatching = () => {
  const screens = useBreakpoint();
  return (
    <div
      style={{
        background: "#FAFAFA",
        padding: 16,
        borderRadius: 8,
        border: "1px solid #f0f0f0",
      }}
    >
      <Alert
        title="Instruksi Matematika"
        description={
          <span>
            Gunakan simbol <b>$</b> untuk menulis rumus. Contoh:{" "}
            <code>$E=mc^2$</code>.
          </span>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Sisi kanan akan diacak saat ujian. Siswa akan menarik jawaban ke premis
        di sebelah kiri.
      </Text>

      <Form.List name="options">
        {(fields, { add, remove }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fields.map(({ key, name, ...restField }) => (
              <div
                key={key}
                style={{
                  borderBottom: "1px dashed #e8e8e8",
                  paddingBottom: 12,
                }}
              >
                {/* Baris Input */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: screens.sm ? "row" : "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {/* Sisi Kiri (Premis) */}
                  <Form.Item
                    {...restField}
                    name={[name, "label"]}
                    rules={[{ required: true, message: "Isi premis" }]}
                    style={{ marginBottom: 0, flex: 1, width: "100%" }}
                  >
                    <Input placeholder="Premis" />
                  </Form.Item>

                  <div
                    style={{
                      background: "#e6f7ff",
                      padding: 4,
                      borderRadius: "50%",
                      transform: screens.sm ? "none" : "rotate(90deg)",
                    }}
                  >
                    <GitMerge size={16} color="#1890ff" />
                  </div>

                  {/* Sisi Kanan (Jawaban) */}
                  <Form.Item
                    {...restField}
                    name={[name, "content"]}
                    rules={[{ required: true, message: "Isi pasangan" }]}
                    style={{ marginBottom: 0, flex: 1, width: "100%" }}
                  >
                    <Input placeholder="Jawaban" />
                  </Form.Item>

                  <Button
                    danger
                    type="text"
                    icon={<Trash2 size={16} />}
                    onClick={() => remove(name)}
                  />
                </div>

                {/* Baris Preview (Sejajar di bawah masing-masing input) */}
                <Form.Item
                  shouldUpdate={(prevValues, curValues) =>
                    prevValues.options !== curValues.options
                  }
                  style={{ marginBottom: 0, marginTop: 4 }}
                >
                  {({ getFieldValue }) => {
                    const label = getFieldValue(["options", name, "label"]);
                    const content = getFieldValue(["options", name, "content"]);
                    return (
                      <div
                        style={{ display: "flex", gap: 8, paddingRight: 32 }}
                      >
                        {/* Preview Kiri */}
                        <div style={{ flex: 1, paddingLeft: 4 }}>
                          {label?.includes("$") && (
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              Preview:{" "}
                              <InlineMath math={label.replaceAll("$", "")} />
                            </Text>
                          )}
                        </div>

                        {/* Spacer Tengah (sesuai lebar icon GitMerge) */}
                        <div style={{ width: 24 }}></div>

                        {/* Preview Kanan */}
                        <div style={{ flex: 1 }}>
                          {content?.includes("$") && (
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              Preview:{" "}
                              <InlineMath math={content.replaceAll("$", "")} />
                            </Text>
                          )}
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>

                {/* Hidden field is_correct */}
                <Form.Item
                  name={[name, "is_correct"]}
                  initialValue={true}
                  hidden
                >
                  <Input />
                </Form.Item>
              </div>
            ))}

            <Button
              type="dashed"
              onClick={() => add({ label: "", content: "", is_correct: true })}
              block
              icon={<Plus size={16} />}
            >
              Tambah Pasangan
            </Button>
          </div>
        )}
      </Form.List>
    </div>
  );
};

export default OptionMatching;
