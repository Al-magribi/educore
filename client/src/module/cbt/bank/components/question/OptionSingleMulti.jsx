import React from "react";
import { motion } from "framer-motion";
import { Form, Button, Checkbox, theme, Typography, Grid, Card, Flex } from "antd";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import TextEditor from "./TextEditor";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const OptionSingleMulti = ({ form, isMulti }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const handleSelectCorrect = (index) => {
    if (isMulti) return;

    const currentOptions = form.getFieldValue("options") || [];
    const updatedOptions = currentOptions.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));

    form.setFieldsValue({ options: updatedOptions });
  };

  const getOptionContainerStyle = (isCorrect) => ({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "stretch",
    border: `1px solid ${isCorrect ? token.colorPrimary : token.colorSplit}`,
    borderRadius: 18,
    backgroundColor: isCorrect ? token.colorPrimaryBg : token.colorBgContainer,
    transition: "all 0.2s ease",
    overflow: "hidden",
    marginBottom: 16,
    boxShadow: "0 10px 22px rgba(15,23,42,.04)",
  });

  const getSidebarStyle = (isCorrect) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 16px",
    backgroundColor: isCorrect ? token.colorPrimaryBgHover : "rgba(0,0,0,0.02)",
    borderRight: !isMobile
      ? `1px solid ${isCorrect ? token.colorPrimaryBorder : token.colorSplit}`
      : "none",
    borderBottom: isMobile
      ? `1px solid ${isCorrect ? token.colorPrimaryBorder : token.colorSplit}`
      : "none",
    cursor: "pointer",
    minWidth: isMobile ? "100%" : 82,
    gap: 8,
  });

  return (
    <Form.List name="options">
      {(fields, { add, remove }) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {fields.map(({ key, name, ...restField }, index) => {
            const options = form.getFieldValue("options");
            const isCorrect = options?.[index]?.is_correct || false;
            const optionLetter = String.fromCharCode(65 + index);

            return (
              <MotionDiv
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={getOptionContainerStyle(isCorrect)}>
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
                        marginBottom: 0,
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
                        <Checkbox style={{ transform: "scale(1.2)" }} />
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

                    <Text type="secondary" style={{ fontSize: 11, textAlign: "center" }}>
                      {isMulti ? "Tandai jika benar" : "Klik untuk jadikan kunci"}
                    </Text>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      padding: "14px",
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
              </MotionDiv>
            );
          })}

          <Button
            type="dashed"
            onClick={() => add({ content: "", is_correct: false })}
            block
            icon={<Plus size={18} />}
            size="large"
            style={{ height: 45, marginTop: 8, borderRadius: 14 }}
          >
            Tambah Opsi Jawaban
          </Button>
        </div>
      )}
    </Form.List>
  );
};

export default OptionSingleMulti;
