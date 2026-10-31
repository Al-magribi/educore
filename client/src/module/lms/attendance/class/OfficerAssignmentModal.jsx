import { useMemo, useState } from 'react';
import { Checkbox, Empty, Flex, Input, Modal, Tag, Typography, message } from 'antd';
import { Search } from 'lucide-react';
import { useSaveClassAttendanceOfficersMutation } from '../../../../service/lms/ApiAttendance';
import { modalWidth } from '../report/reportShared';

const { Text } = Typography;

const OfficerAssignmentModal = ({ onClose, className, students, isMobile }) => {
  const [selectedIds, setSelectedIds] = useState(() =>
    students.filter((item) => item.is_officer).map((item) => item.user_id),
  );
  const [keyword, setKeyword] = useState('');
  const [saveOfficers, { isLoading }] = useSaveClassAttendanceOfficersMutation();

  const visibleStudents = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return students;
    return students.filter((item) =>
      `${item.full_name} ${item.nis || ''}`.toLowerCase().includes(term),
    );
  }, [keyword, students]);

  const toggleStudent = (userId, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  };

  const handleSave = async () => {
    try {
      const result = await saveOfficers(selectedIds).unwrap();
      message.success(result?.message || 'Petugas presensi berhasil disimpan.');
      onClose();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan petugas presensi.');
    }
  };

  return (
    <Modal
      title={`Penugasan Petugas Presensi ${className || ''}`}
      centered
      open
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={isLoading}
      okText="Simpan"
      cancelText="Batal"
      width={modalWidth(isMobile, 520)}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}>
      <Flex vertical gap={12} style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Siswa terpilih akan mendapat menu Presensi untuk mengelola presensi kelas ini. Menu tampil
          setelah siswa memuat ulang halaman atau masuk kembali.
        </Text>
        <Input
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Cari nama atau NIS"
          prefix={<Search size={16} />}
        />
        <Tag color="blue" style={{ alignSelf: 'flex-start', margin: 0 }}>
          {selectedIds.length} petugas dipilih
        </Tag>
        {visibleStudents.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Siswa tidak ditemukan." />
        ) : (
          <Flex vertical gap={6}>
            {visibleStudents.map((student) => (
              <Checkbox
                key={student.user_id}
                checked={selectedIds.includes(student.user_id)}
                onChange={(event) => toggleStudent(student.user_id, event.target.checked)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #eef2f7',
                  background: '#f8fafc',
                  marginInlineStart: 0,
                }}>
                <span style={{ wordBreak: 'break-word' }}>
                  {student.full_name}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {' '}
                    · NIS {student.nis || '-'}
                  </Text>
                </span>
              </Checkbox>
            ))}
          </Flex>
        )}
      </Flex>
    </Modal>
  );
};

export default OfficerAssignmentModal;
