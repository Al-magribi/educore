// components/options/OptionTrueFalse.jsx
import React from "react";
import { Form, Card, Input, Checkbox } from "antd";
import { Check, X } from "lucide-react";

const OptionTrueFalse = ({ form }) => {
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
        <div style={{ display: "flex", gap: 16 }}>
          {fields.map(({ key, name }, index) => {
            const label = form.getFieldValue(["options", index, "content"]);
            const isCorrect = form.getFieldValue([
              "options",
              index,
              "is_correct",
            ]);

            return (
              <Card
                key={key}
                hoverable
                onClick={() => handleSelect(index)}
                style={{
                  flex: 1,
                  textAlign: "center",
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
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    marginBottom: 8,
                    color: isCorrect
                      ? index === 0
                        ? "#52c41a"
                        : "#ff4d4f"
                      : "#ccc",
                  }}
                >
                  {index === 0 ? <Check size={32} /> : <X size={32} />}
                </div>
                <div style={{ fontSize: 16, fontWeight: "bold" }}>{label}</div>

                {/* Hidden Fields untuk menjaga value form */}
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
            );
          })}
        </div>
      )}
    </Form.List>
  );
};

export default OptionTrueFalse;
