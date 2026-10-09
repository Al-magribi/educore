import {
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Award } from "lucide-react";

const { Text } = Typography;
const MotionDiv = motion.div;
const { TextArea } = Input;

const ScholarshipFormModal = ({
  open,
  editing,
  form,
  confirmLoading,
  homebases = [],
  lockHomebase = false,
  onCancel,
  onSubmit,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      width={isMobile ? "calc(100vw - 24px)" : 560}
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
            <Award size={18} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {editing ? "Edit Beasiswa" : "Tambah Beasiswa"}
            </Text>
            <div>
              <Text type='secondary'>
                Definisikan program beasiswa sebelum menambah aturan potongan.
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
        initialValues={{ is_active: true }}
      >
        {!lockHomebase ? (
          <Form.Item
            name='homebase_id'
            label='Satuan'
            rules={[{ required: true, message: "Satuan wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih satuan'
              options={homebases.map((item) => ({
                value: Number(item.id),
                label: item.name,
              }))}
              disabled={Boolean(editing)}
              virtual={false}
            />
          </Form.Item>
        ) : (
          <Form.Item name='homebase_id' hidden>
            <Input />
          </Form.Item>
        )}

        <Form.Item
          name='name'
          label='Nama Beasiswa'
          rules={[{ required: true, message: "Nama wajib diisi" }]}
        >
          <Input placeholder='Contoh: Beasiswa Prestasi 2026' maxLength={150} />
        </Form.Item>

        <Form.Item name='code' label='Kode (opsional)'>
          <Input placeholder='Contoh: BSP-2026' maxLength={50} />
        </Form.Item>

        <Form.Item name='description' label='Keterangan'>
          <TextArea rows={3} placeholder='Catatan singkat program beasiswa' />
        </Form.Item>

        <Form.Item
          name='is_active'
          label='Status aktif'
          valuePropName='checked'
        >
          <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ScholarshipFormModal;
