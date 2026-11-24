import { Card, Form, Input, Modal, Select, Space, Typography } from "antd";
import { motion } from "framer-motion";

import { museColors, museRadius, museShadow } from "../../../../../config/theme";
const { TextArea } = Input;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const ContributionOfficerModal = ({
  open,
  form,
  officerCandidates,
  onCancel,
  onSubmit,
  confirmLoading,
}) => (
  <Modal
    title={null}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
    okText="Simpan Petugas"
    cancelText="Batal"
    styles={{
      body: {
        padding: 16,
        background: museColors.bgLayout,
      },
    }}
    modalRender={(node) => (
      <MotionDiv
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ borderRadius: museRadius.card, overflow: "hidden" }}
      >
        {node}
      </MotionDiv>
    )}
  >
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        variant="borderless"
        style={{
          borderRadius: museRadius.card,
          background:
            museColors.primary,
          boxShadow: museShadow.card,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0, color: museColors.bgLayout }}>
            Tentukan Petugas Kas Kelas
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.86)" }}>
            Pilih siswa yang akan membantu pencatatan kas kelas pada periode aktif.
          </Text>
        </Space>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: museRadius.card,
          border: `1px solid ${museColors.divider}`,
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item
            name="student_id"
            label="Siswa"
            rules={[{ required: true, message: "Siswa wajib dipilih" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={officerCandidates.map((item) => ({
                value: item.student_id,
                label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
              }))}
              placeholder="Pilih siswa petugas"
              notFoundContent="Semua siswa di kelas ini sudah menjadi petugas aktif."
              virtual={false}
            />
          </Form.Item>

          <Form.Item name="notes" label="Catatan">
            <TextArea
              rows={3}
              placeholder="Opsional, misalnya pembagian tugas atau catatan wali kelas."
            />
          </Form.Item>
        </Form>
      </Card>
    </Space>
  </Modal>
);

export default ContributionOfficerModal;
