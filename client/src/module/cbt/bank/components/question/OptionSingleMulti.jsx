// components/options/OptionSingleMulti.jsx
import React from "react";
import { Form, Button, Checkbox, theme, Typography, Grid } from "antd";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import TextEditor from "./TextEditor";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const OptionSingleMulti = ({ form, isMulti }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  // Fungsi untuk menangani seleksi Single Choice (Radio logic)
  const handleSelectCorrect = (index) => {
    if (isMulti) return; // Jika multi-choice, serahkan pada Checkbox

    const currentOptions = form.getFieldValue("options") || [];

    // Setel semua menjadi false kecuali yang diklik
    const updatedOptions = currentOptions.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));

    form.setFieldsValue({ options: updatedOptions });
  };

  const getOptionContainerStyle = (isCorrect) => ({
    display: "flex",
    // Perubahan: Gunakan flex-wrap agar editor turun ke bawah jika layar sempit
    flexWrap: "wrap",
    alignItems: "stretch",
    border: `1px solid ${isCorrect ? token.colorPrimary : token.colorSplit}`,
    borderRadius: token.borderRadiusLG,
    backgroundColor: isCorrect ? token.colorPrimaryBg : token.colorBgContainer,
    transition: "all 0.2s ease",
    overflow: "hidden",
    marginBottom: 16,
  });

  const getSidebarStyle = (isCorrect) => ({
    display: "flex",
    // Perubahan: Sesuaikan layout sidebar untuk mobile
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    backgroundColor: isCorrect ? token.colorPrimaryBgHover : "rgba(0,0,0,0.02)",
    borderRight:
      window.innerWidth > 576
        ? `1px solid ${isCorrect ? token.colorPrimaryBorder : token.colorSplit}`
        : "none",
    borderBottom:
      window.innerWidth <= 576
        ? `1px solid ${isCorrect ? token.colorPrimaryBorder : token.colorSplit}`
        : "none",
    cursor: "pointer",
    minWidth: window.innerWidth <= 576 ? "100%" : 70, // Full width di mobile
  });

  return (
    <Form.List name="options">
      {(fields, { add, remove }) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {fields.map(({ key, name, ...restField }, index) => {
            // Watch value is_correct secara real-time untuk styling
            const options = form.getFieldValue("options");
            const isCorrect = options?.[index]?.is_correct || false;
            const optionLetter = String.fromCharCode(65 + index);

            return (
              <div key={key} style={getOptionContainerStyle(isCorrect)}>
                {/* --- SIDEBAR: Area Klik Kunci Jawaban --- */}
                <div
                  style={getSidebarStyle(isCorrect)}
                  onClick={() => handleSelectCorrect(index)}
                >
                  <Text
                    strong
                    style={{
                      fontSize: 18,
                      color: isCorrect
                        ? token.colorPrimaryText
                        : token.colorTextSecondary,
                      marginBottom: 8,
                    }}
                  >
                    {optionLetter}
                  </Text>

                  <Form.Item
                    {...restField}
                    name={[name, "is_correct"]}
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    {isMulti ? (
                      <Checkbox
                        onChange={(e) => {
                          // Untuk multi, biarkan checkbox mengupdate state secara natural
                        }}
                        style={{ transform: "scale(1.2)" }}
                      />
                    ) : (
                      <div style={{ pointerEvents: "none" }}>
                        {isCorrect ? (
                          <CheckCircle2
                            size={24}
                            color={token.colorPrimary}
                            fill={token.colorPrimaryBg}
                          />
                        ) : (
                          <Circle size={24} color={token.colorTextQuaternary} />
                        )}
                      </div>
                    )}
                  </Form.Item>
                </div>

                {/* --- KONTEN: Editor --- */}
                <div
                  style={{
                    flex: 1,
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: "300px",
                    gap: 12,
                  }}
                >
                  <Form.Item
                    {...restField}
                    name={[name, "content"]}
                    rules={[{ required: true, message: "Isi teks opsi" }]}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <TextEditor
                      placeholder={`Jawaban ${optionLetter}...`}
                      height={screens.sm ? "180px" : "250px"}
                    />
                  </Form.Item>

                  <Button
                    type="text"
                    danger
                    icon={<Trash2 size={18} />}
                    onClick={() => remove(name)}
                    disabled={fields.length <= 2}
                    style={{ alignSelf: "flex-end", marginTop: 4 }}
                  />
                </div>
              </div>
            );
          })}

          <Button
            type="dashed"
            onClick={() => add({ content: "", is_correct: false })}
            block
            icon={<Plus size={18} />}
            style={{ height: 45, marginTop: 8 }}
          >
            Tambah Opsi Jawaban
          </Button>
        </div>
      )}
    </Form.List>
  );
};

export default OptionSingleMulti;
