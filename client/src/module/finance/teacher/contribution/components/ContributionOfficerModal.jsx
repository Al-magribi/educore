import { Form, Input, Modal, Select } from "antd";

const { TextArea } = Input;

const ContributionOfficerModal = ({
  open,
  form,
  officerCandidates,
  onCancel,
  onSubmit,
  confirmLoading,
}) => (
  <Modal
    title='Tentukan Petugas Kas Kelas'
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
  >
    <Form form={form} layout='vertical' onFinish={onSubmit}>
      <Form.Item
        name='student_id'
        label='Siswa'
        rules={[{ required: true, message: "Siswa wajib dipilih" }]}
      >
        <Select
          showSearch
          optionFilterProp='label'
          options={officerCandidates.map((item) => ({
            value: item.student_id,
            label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
          }))}
          placeholder='Pilih siswa petugas'
          notFoundContent='Semua siswa di kelas ini sudah menjadi petugas aktif.'
          virtual={false}
        />
      </Form.Item>

      <Form.Item name='notes' label='Catatan'>
        <TextArea
          rows={3}
          placeholder='Opsional, misalnya pembagian tugas atau catatan wali kelas.'
        />
      </Form.Item>
    </Form>
  </Modal>
);

export default ContributionOfficerModal;
