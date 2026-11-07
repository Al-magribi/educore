import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Form,
  Grid,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Plus, Wand2 } from "lucide-react";

import {
  benefitTargetLabel,
  benefitTypeLabel,
  monthKey,
  parseMonthKey,
  rupiahInputProps,
} from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const ScholarshipBenefitModal = ({
  open,
  editing,
  form,
  confirmLoading,
  periodes = [],
  months = [],
  otherTypes = [],
  onCancel,
  onSubmit,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const benefitTarget = Form.useWatch("benefit_target", form) || "spp";
  const benefitType = Form.useWatch("benefit_type", form) || "fixed";
  const selectedMonthKeys = Form.useWatch("month_keys", form) || [];
  const draftPeriodeId = Form.useWatch("draft_periode_id", form);
  const draftMonths = Form.useWatch("draft_months", form) || [];

  const periodeNameMap = Object.fromEntries(
    periodes.map((item) => [Number(item.id), item.name]),
  );
  const monthLabelMap = Object.fromEntries(
    months.map((item) => [Number(item.value), item.label]),
  );

  const addDraftMonths = () => {
    if (!draftPeriodeId || draftMonths.length === 0) {
      return;
    }

    const next = new Set(selectedMonthKeys);
    draftMonths.forEach((monthNum) => {
      next.add(monthKey(draftPeriodeId, monthNum));
    });
    form.setFieldsValue({
      month_keys: [...next],
      draft_months: [],
    });
  };

  const removeMonthKey = (key) => {
    form.setFieldsValue({
      month_keys: selectedMonthKeys.filter((item) => item !== key),
    });
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      width={isMobile ? "calc(100vw - 24px)" : 680}
      destroyOnClose
      centered
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 20 : 28,
        },
        body: { padding: 0 },
        footer: { padding: isMobile ? "0 16px 16px" : "0 24px 22px" },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <div
        style={{
          padding: isMobile ? "18px 16px 8px" : "22px 24px 10px",
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(56,189,248,0.06))",
        }}
      >
        <Space align='start' size={12}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff",
            }}
          >
            <Wand2 size={18} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {editing ? "Edit Aturan Potongan" : "Tambah Aturan Potongan"}
            </Text>
            <div>
              <Text type='secondary'>
                Tentukan potongan SPP (bulan lintas periode) atau pembayaran
                lainnya.
              </Text>
            </div>
          </div>
        </Space>
      </div>

      <Form
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        style={{ padding: isMobile ? "8px 16px 0" : "10px 24px 0" }}
        initialValues={{
          benefit_target: "spp",
          benefit_type: "fixed",
          month_keys: [],
          draft_months: [],
        }}
      >
        <Form.Item
          name='benefit_target'
          label='Target'
          rules={[{ required: true }]}
        >
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            options={[
              { value: "spp", label: benefitTargetLabel.spp },
              { value: "other", label: benefitTargetLabel.other },
            ]}
          />
        </Form.Item>

        <Form.Item
          name='benefit_type'
          label='Jenis potongan'
          rules={[{ required: true }]}
        >
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            options={[
              { value: "fixed", label: benefitTypeLabel.fixed },
              { value: "full", label: benefitTypeLabel.full },
            ]}
          />
        </Form.Item>

        {benefitType === "fixed" ? (
          <Form.Item
            name='amount'
            label='Nominal potongan'
            rules={[
              { required: true, message: "Nominal wajib diisi" },
              {
                type: "number",
                min: 1,
                message: "Nominal harus lebih dari 0",
              },
            ]}
          >
            <InputNumber {...rupiahInputProps} placeholder='Contoh: 50000' />
          </Form.Item>
        ) : null}

        {benefitTarget === "other" ? (
          <>
            <Form.Item
              name='component_id'
              label='Jenis pembayaran'
              rules={[{ required: true, message: "Jenis biaya wajib dipilih" }]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                placeholder='Pilih jenis pembayaran lainnya'
                options={otherTypes.map((item) => ({
                  value: Number(item.id),
                  label: `${item.name}${item.is_active === false ? " (nonaktif)" : ""}`,
                }))}
                virtual={false}
              />
            </Form.Item>
            <Form.Item name='periode_id' label='Batasi periode (opsional)'>
              <Select
                allowClear
                placeholder='Semua periode'
                options={periodes.map((item) => ({
                  value: Number(item.id),
                  label: item.name,
                }))}
                virtual={false}
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name='month_keys' hidden>
              <Select mode='multiple' />
            </Form.Item>

            <Space direction='vertical' size={10} style={{ width: "100%" }}>
              <Text strong>Pilih bulan (bisa lintas periode)</Text>
              <Flex gap={8} wrap='wrap' align='start'>
                <Form.Item
                  name='draft_periode_id'
                  style={{ marginBottom: 0, minWidth: isMobile ? "100%" : 200 }}
                >
                  <Select
                    placeholder='Periode'
                    options={periodes.map((item) => ({
                      value: Number(item.id),
                      label: item.name,
                    }))}
                    virtual={false}
                  />
                </Form.Item>
                <Form.Item
                  name='draft_months'
                  style={{ marginBottom: 0, flex: 1, minWidth: 180 }}
                >
                  <Select
                    mode='multiple'
                    placeholder='Bulan'
                    maxTagCount='responsive'
                    options={months.map((item) => ({
                      value: Number(item.value),
                      label: item.label,
                    }))}
                    virtual={false}
                  />
                </Form.Item>
                <Button icon={<Plus size={14} />} onClick={addDraftMonths}>
                  Tambah
                </Button>
              </Flex>

              {selectedMonthKeys.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='Belum ada bulan dipilih'
                />
              ) : (
                <Space wrap size={[6, 6]}>
                  {selectedMonthKeys.map((key) => {
                    const parsed = parseMonthKey(key);
                    return (
                      <Tag
                        key={key}
                        closable
                        onClose={() => removeMonthKey(key)}
                        style={{ borderRadius: 999 }}
                      >
                        {periodeNameMap[parsed.periode_id] ||
                          `Periode ${parsed.periode_id}`}{" "}
                        · {monthLabelMap[parsed.month_num] || parsed.month_num}
                      </Tag>
                    );
                  })}
                </Space>
              )}

              <Form.Item
                name='month_keys_validator'
                rules={[
                  {
                    validator: async () => {
                      if (
                        benefitTarget === "spp" &&
                        (!selectedMonthKeys || selectedMonthKeys.length === 0)
                      ) {
                        throw new Error("Minimal satu bulan wajib dipilih");
                      }
                    },
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Checkbox style={{ display: "none" }} />
              </Form.Item>
            </Space>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ScholarshipBenefitModal;
