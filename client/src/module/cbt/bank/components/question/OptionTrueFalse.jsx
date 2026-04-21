import React from "react";
import { motion } from "framer-motion";
import { Form, Card, Input, Checkbox, Grid, Typography, Flex } from "antd";
import { Check, X } from "lucide-react";

const { useBreakpoint } = Grid;
const { Text } = Typography;
const MotionDiv = motion.div;

const OptionTrueFalse = ({ form }) => {
  const screens = useBreakpoint();

  const handleSelect = (index) => {
    const newOpts = form.getFieldValue("options").map((o, i) => ({
      ...o,
      is_correct: i === index,
    }));
    form.setFieldsValue({ options: newOpts });
  };

  return (
    <Form.List name="options">
      {(fields) => (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.md ? "1fr 1fr" : "1fr",
            gap: 16,
          }}
        >
          {fields.map(({ key, name }, index) => {
            const label = form.getFieldValue(["options", index, "content"]);
            const isCorrect = form.getFieldValue(["options", index, "is_correct"]);

            return (
              <MotionDiv
                key={key}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  hoverable
                  onClick={() => handleSelect(index)}
                  style={{
                    textAlign: "center",
                    borderRadius: 18,
                    borderColor: isCorrect
                      ? index === 0
                        ? "#52c41a"
                        : "#ff4d4f"
                      : "#d9d9d9",
                    backgroundColor: isCorrect
                      ? index === 0
                        ? "#f6ffed"
                        : "#fff1f0"
                      : "#fff",
                    transition: "all 0.3s",
                    boxShadow: "0 10px 22px rgba(15,23,42,.05)",
                  }}
                  styles={{ body: { padding: 22 } }}
                >
                  <Flex vertical align="center" gap={8}>
                    <div
                      style={{
                        fontSize: 24,
                        color: isCorrect
                          ? index === 0
                            ? "#52c41a"
                            : "#ff4d4f"
                          : "#ccc",
                      }}
                    >
                      {index === 0 ? <Check size={32} /> : <X size={32} />}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: "bold" }}>{label}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isCorrect ? "Dipilih sebagai jawaban benar" : "Klik untuk menjadikan ini jawaban benar"}
                    </Text>
                  </Flex>

                  <Form.Item name={[name, "content"]} hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name={[name, "is_correct"]}
                    hidden
                    valuePropName="checked"
                  >
                    <Checkbox />
                  </Form.Item>
                </Card>
              </MotionDiv>
            );
          })}
        </div>
      )}
    </Form.List>
  );
};

export default OptionTrueFalse;
