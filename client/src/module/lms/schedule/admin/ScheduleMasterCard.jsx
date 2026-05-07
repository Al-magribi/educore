import React, { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  SCHEDULE_CARD_BODY,
  SCHEDULE_CARD_STYLE,
  SCHEDULE_INNER_CARD_BODY,
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
} from "./scheduleAdminStyles";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ScheduleMasterCard = ({
  canManage,
  scheduleConfigs,
  selectedConfig,
  configOptions,
  configGroups,
  unmappedGroupClasses,
  activeConfigId,
  loading,
  activatingConfig,
  onSelectConfig,
  onSaveConfig,
  onActivateConfig,
  onDeleteConfig,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState(null);
  const [configForm] = Form.useForm();

  const isSelectedConfigActive = selectedConfig?.is_active === true;

  useEffect(() => {
    if (!configModalOpen) {
      setEditingConfig(null);
      configForm.resetFields();
    }
  }, [configForm, configModalOpen]);

  const openCreateConfig = () => {
    setEditingConfig(null);
    configForm.setFieldsValue({
      name: "",
      description: "",
      is_active: scheduleConfigs.length === 0,
    });
    setConfigModalOpen(true);
  };

  const openEditConfig = () => {
    if (!selectedConfig) return;
    setEditingConfig(selectedConfig);
    configForm.setFieldsValue({
      name: selectedConfig.name,
      description: selectedConfig.description || "",
      is_active: selectedConfig.is_active === true,
    });
    setConfigModalOpen(true);
  };

  const handleSaveConfigMeta = async () => {
    const values = await configForm.validateFields();
    const success = await onSaveConfig({
      id: editingConfig?.id,
      name: values.name,
      description: values.description || null,
      is_active: values.is_active,
    });
    if (success) {
      setConfigModalOpen(false);
    }
  };

  const renderInactiveConfigAlert = () =>
    !selectedConfig ? (
      <Alert
        showIcon
        type="warning"
        message="Belum ada master jadwal"
        description="Buat dan pilih jadwal terlebih dahulu sebelum mengakses tab lain."
      />
    ) : !isSelectedConfigActive ? (
      <Alert
        showIcon
        type="info"
        message="Jadwal yang dipilih masih nonaktif"
        description={`Tab operasional tetap mengikuti jadwal aktif. Untuk memakai jadwal ini pada beban ajar, kegiatan, ketentuan guru, dan jadwal final, aktifkan terlebih dahulu. Jadwal aktif saat ini: ${
          scheduleConfigs.find((item) => Number(item.id) === activeConfigId)
            ?.name || "belum ditentukan"
        }.`}
      />
    ) : null;

  return (
    <>
      <Card
        style={{ ...SCHEDULE_CARD_STYLE, width: "100%", maxWidth: "100%" }}
        styles={{ body: SCHEDULE_CARD_BODY }}
        title="Master Jadwal"
      >
        <Flex vertical gap={12}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Space wrap>
              <Select
                style={{
                  minWidth: isMobile ? undefined : 260,
                  width: isMobile ? "100%" : undefined,
                  maxWidth: "100%",
                }}
                placeholder="Pilih jadwal"
                options={configOptions}
                value={selectedConfig ? Number(selectedConfig.id) : undefined}
                onChange={onSelectConfig}
              />
              {canManage ? (
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={openCreateConfig}
                >
                  Tambah Jadwal
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  icon={<Pencil size={14} />}
                  disabled={!selectedConfig}
                  onClick={openEditConfig}
                >
                  Ubah Info
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  disabled={!selectedConfig || selectedConfig.is_active === true}
                  loading={activatingConfig}
                  onClick={onActivateConfig}
                >
                  Jadikan Aktif
                </Button>
              ) : null}
              {canManage ? (
                <Popconfirm
                  title="Hapus master jadwal ini?"
                  description="Jadwal yang aktif atau masih dipakai data operasional tidak bisa dihapus."
                  onConfirm={onDeleteConfig}
                  okText="Hapus"
                  cancelText="Batal"
                >
                  <Button
                    danger
                    icon={<Trash2 size={14} />}
                    disabled={!selectedConfig}
                  >
                    Hapus
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>

            {selectedConfig ? (
              <Space wrap>
                <Tag
                  color={selectedConfig.is_active ? "green" : "default"}
                  style={SCHEDULE_TAG_STYLE}
                >
                  {selectedConfig.is_active ? "Aktif" : "Nonaktif"}
                </Tag>
                <Tag color="blue" style={SCHEDULE_TAG_STYLE}>
                  {selectedConfig.name || `Jadwal ${selectedConfig.id}`}
                </Tag>
              </Space>
            ) : null}
          </Flex>

          {selectedConfig ? (
            <Flex vertical gap={4}>
              <Text strong>{selectedConfig.name}</Text>
              <Text type="secondary">
                {selectedConfig.description || "Belum ada deskripsi jadwal."}
              </Text>
            </Flex>
          ) : (
            <Alert
              showIcon
              type="warning"
              message="Belum ada master jadwal"
              description="Buat minimal satu jadwal sebelum mengatur template harian."
            />
          )}

          {renderInactiveConfigAlert()}

          {selectedConfig ? (
            unmappedGroupClasses.length > 0 ? (
              <Alert
                showIcon
                type="warning"
                message="Masih ada kelas aktif yang belum masuk group jadwal"
                description={`Penyusunan jadwal final akan lebih aman jika mapping shift lengkap. Kelas yang belum dipetakan: ${unmappedGroupClasses
                  .map((item) => item.name)
                  .join(", ")}.`}
              />
            ) : configGroups.length > 0 ? (
              <Alert
                showIcon
                type="success"
                message="Mapping group kelas lengkap"
                description="Semua kelas aktif pada satuan ini sudah memiliki group jadwal pada master yang sedang dipilih."
              />
            ) : null
          ) : null}

          {selectedConfig ? (
            <Card
              size="small"
              style={SCHEDULE_INNER_CARD_STYLE}
              styles={{ body: SCHEDULE_INNER_CARD_BODY }}
            >
              <Space size={[8, 8]} wrap>
                <Tag color="geekblue" style={SCHEDULE_TAG_STYLE}>
                  Total master: {scheduleConfigs.length}
                </Tag>
                <Tag color="cyan" style={SCHEDULE_TAG_STYLE}>
                  Shift: {configGroups.length}
                </Tag>
                <Tag color="gold" style={SCHEDULE_TAG_STYLE}>
                  Kelas belum terpetakan: {unmappedGroupClasses.length}
                </Tag>
              </Space>
            </Card>
          ) : null}
        </Flex>
      </Card>

      <Modal
        open={configModalOpen}
        title={editingConfig ? "Ubah Master Jadwal" : "Tambah Master Jadwal"}
        onCancel={() => setConfigModalOpen(false)}
        onOk={handleSaveConfigMeta}
        okText="Simpan"
        confirmLoading={loading}
      >
        <Form form={configForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nama Jadwal"
            rules={[{ required: true, message: "Nama jadwal wajib diisi." }]}
          >
            <Input placeholder="Contoh: Jadwal Reguler" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea
              rows={3}
              placeholder="Contoh: Jadwal operasional reguler semester genap."
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Status"
            rules={[{ required: true, message: "Status wajib dipilih." }]}
          >
            <Select
              options={[
                { value: true, label: "Aktif" },
                { value: false, label: "Nonaktif" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ScheduleMasterCard;
