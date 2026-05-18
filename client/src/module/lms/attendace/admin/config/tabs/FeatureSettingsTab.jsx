import { useMemo } from "react";
import { Button, Card, Form, Input, Space, Switch, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Save, ShieldCheck } from "lucide-react";
import { useUpdateAttendanceFeaturesMutation } from "../../../../../../service/lms/ApiAttendance";
import { FEATURE_META, innerCardStyle, itemVariants } from "../configShared";

const MotionDiv = motion.div;

const FeatureSettingsTab = ({ featureRows = [] }) => {
  const [featureForm] = Form.useForm();
  const [updateAttendanceFeatures, { isLoading: savingFeatures }] =
    useUpdateAttendanceFeaturesMutation();

  const featureInitialValues = useMemo(() => {
    const values = {};
    featureRows.forEach((item) => {
      values[item.feature_code] = item.is_enabled === true;
      values[`${item.feature_code}__notes`] = item.notes || "";
    });
    return values;
  }, [featureRows]);

  const handleSaveFeatures = async () => {
    try {
      const values = await featureForm.validateFields();
      const items = featureRows.map((item) => ({
        feature_code: item.feature_code,
        is_enabled: values[item.feature_code] === true,
        notes: values[`${item.feature_code}__notes`] || null,
      }));
      await updateAttendanceFeatures({ items }).unwrap();
      message.success("Konfigurasi fitur absensi berhasil disimpan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan konfigurasi fitur.");
    }
  };

  return (
    <Card
      title='Toggle Fitur Absensi'
      style={innerCardStyle}
      extra={
        <Button
          type='primary'
          icon={<Save size={14} />}
          loading={savingFeatures}
          onClick={handleSaveFeatures}
        >
          Simpan Fitur
        </Button>
      }
    >
      <Form
        form={featureForm}
        layout='vertical'
        initialValues={featureInitialValues}
        key={JSON.stringify(featureInitialValues)}
      >
        <Space direction='vertical' style={{ width: "100%" }} size={14}>
          {featureRows.map((item, index) => (
            <MotionDiv
              key={item.feature_code}
              variants={itemVariants}
              initial='hidden'
              animate='show'
              transition={{ delay: index * 0.04 }}
            >
              <Card
                size='small'
                title={FEATURE_META[item.feature_code]?.title || item.feature_code}
                extra={<ShieldCheck size={16} color='#2563eb' />}
                style={{ borderRadius: 12 }}
              >
                <Typography.Paragraph type='secondary'>
                  {FEATURE_META[item.feature_code]?.description || "-"}
                </Typography.Paragraph>
                <Form.Item
                  name={item.feature_code}
                  valuePropName='checked'
                  style={{ marginBottom: 8 }}
                >
                  <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
                </Form.Item>
                <Form.Item name={`${item.feature_code}__notes`} label='Catatan'>
                  <Input placeholder='Catatan opsional untuk fitur ini' />
                </Form.Item>
              </Card>
            </MotionDiv>
          ))}
        </Space>
      </Form>
    </Card>
  );
};

export default FeatureSettingsTab;
