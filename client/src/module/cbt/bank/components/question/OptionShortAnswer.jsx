import { Form, Input, Button, Alert, Typography, theme } from "antd";
import { Plus, Trash2, Type } from "lucide-react";
import TextEditor from "./TextEditor";

const { Text } = Typography;

const OptionShortAnswer = () => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        background: token.colorFillAlter,
        padding: 20,
        borderRadius: token.borderRadiusLG,
        border: `1px dashed ${token.colorBorder}`,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong>
          <Type size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Kunci Jawaban Isian Singkat
        </Text>
        <Alert
          message="Petunjuk"
          description="Masukkan variasi jawaban yang dianggap benar. Sistem akan melakukan pencocokan teks secara otomatis. Contoh: jika jawabannya adalah 10, Anda bisa menambah variasi '10' dan 'Sepuluh'."
          type="info"
          showIcon
          style={{ marginTop: 8 }}
        />
      </div>

      <Form.List
        name="options"
        rules={[
          {
            validator: async (_, names) => {
              if (!names || names.length < 1) {
                return Promise.reject(
                  new Error("Minimal harus ada 1 kunci jawaban"),
                );
              }
            },
          },
        ]}
      >
        {(fields, { add, remove }, { errors }) => (
          <>
            {fields.map(({ key, name, ...restField }, index) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <Form.Item
                  {...restField}
                  name={[name, "content"]}
                  rules={[
                    { required: true, message: "Masukkan teks kunci jawaban" },
                  ]}
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <TextEditor
                    variant="short"
                    placeholder={`Variasi jawaban benar ke-${index + 1}...`}
                    showCount
                    maxLength={200}
                  />
                </Form.Item>

                {/* Field tersembunyi untuk is_correct agar sinkron dengan skema database */}
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
                    style={{ marginTop: 4 }}
                  />
                )}
              </div>
            ))}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="dashed"
                onClick={() => add({ content: "", is_correct: true })}
                block
                icon={<Plus size={16} />}
                style={{ height: 45 }}
              >
                Tambah Variasi Jawaban
              </Button>
              <Form.ErrorList errors={errors} />
            </Form.Item>
          </>
        )}
      </Form.List>
    </div>
  );
};

export default OptionShortAnswer;
