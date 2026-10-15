import React, { useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  Download,
  ExternalLink,
  FileText,
  FileUp,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useDeleteTeachingModuleMutation,
  useGetTeachingModuleMetaQuery,
  useGetTeachingModulesQuery,
} from "../../../service/lms/ApiTeachingModule";
import TeachingModuleFormDrawer from "./TeachingModuleFormDrawer";
import TeachingModuleUploadModal from "./TeachingModuleUploadModal";
import useTeachingModuleActions from "./useTeachingModuleActions";
import { formatFileSize } from "./moduleSchema";
import { SOURCE_META, fileExtension } from "./sourceMeta";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const EMPTY_LIST = [];

const TeachingModuleTab = ({ subjectId, gradeOptions }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [gradeId, setGradeId] = useState(null);
  const [formState, setFormState] = useState({ open: false, moduleId: null });
  const [uploadState, setUploadState] = useState({ open: false, module: null });

  const { data: modulesRes, isLoading } = useGetTeachingModulesQuery(
    { subjectId, gradeId },
    { skip: !subjectId },
  );
  const { data: metaRes } = useGetTeachingModuleMetaQuery(
    { subjectId },
    { skip: !subjectId },
  );
  const [deleteModule] = useDeleteTeachingModuleMutation();
  const { openModule, downloadModule, isBusy } = useTeachingModuleActions();

  const modules = modulesRes?.data ?? EMPTY_LIST;

  const handleEdit = (module) => {
    if (module.source_type === "uploaded") {
      setUploadState({ open: true, module });
    } else {
      setFormState({ open: true, moduleId: module.id });
    }
  };

  const handleDelete = async (module) => {
    try {
      await deleteModule(module.id).unwrap();
      message.success("Modul ajar dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus modul ajar.");
    }
  };

  return (
    <Flex vertical gap={16}>
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          gap={12}
          wrap='wrap'
          vertical={isMobile}
        >
          <Flex
            align={isMobile ? "stretch" : "center"}
            gap={12}
            vertical={isMobile}
          >
            <Space size={8} style={{ flexShrink: 0 }}>
              <Layers size={16} />
              <Text strong>Filter</Text>
            </Space>
            <Select
              allowClear
              placeholder='Semua tingkat'
              options={gradeOptions}
              value={gradeId}
              onChange={(value) => setGradeId(value || null)}
              style={isMobile ? { width: "100%" } : { width: 220 }}
            />
          </Flex>
          <Flex gap={8} vertical={isMobile}>
            <Button
              icon={<FileUp size={16} />}
              onClick={() => setUploadState({ open: true, module: null })}
              block={isMobile}
            >
              Upload Modul
            </Button>
            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={() => setFormState({ open: true, moduleId: null })}
              block={isMobile}
            >
              Buat Modul
            </Button>
          </Flex>
        </Flex>
      </Card>

      {isLoading ? (
        <Card style={{ borderRadius: 12 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ) : modules.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              gradeId
                ? "Belum ada modul ajar untuk tingkat ini."
                : "Belum ada modul ajar. Buat modul langsung di aplikasi atau upload file modul yang sudah ada."
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {modules.map((module) => {
            const source = SOURCE_META[module.source_type] || SOURCE_META.created;
            const SourceIcon = source.icon;
            const isUploaded = module.source_type === "uploaded";
            return (
              <Col xs={24} md={12} xl={8} key={module.id}>
                <Card
                  style={{ borderRadius: 12, height: "100%" }}
                  styles={{
                    body: {
                      padding: 16,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    },
                  }}
                >
                  <Flex gap={12} align='start'>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: source.bg,
                        color: source.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SourceIcon size={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        strong
                        style={{ display: "block", lineHeight: 1.4 }}
                        title={module.title}
                      >
                        {module.title}
                      </Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        Diperbarui{" "}
                        {dayjs(module.updated_at).format("DD MMM YYYY HH:mm")}
                      </Text>
                    </div>
                  </Flex>

                  <Space size={[6, 6]} wrap>
                    <Tag color='geekblue' style={{ marginRight: 0 }}>
                      Tingkat {module.grade_name || "-"}
                    </Tag>
                    <Tag color={source.color} style={{ marginRight: 0 }}>
                      {source.label}
                    </Tag>
                    {isUploaded ? (
                      <Tag style={{ marginRight: 0 }} icon={<FileText size={12} />}>
                        {fileExtension(module.file_name)} ·{" "}
                        {formatFileSize(module.file_size)}
                      </Tag>
                    ) : null}
                  </Space>

                  <Flex
                    gap={6}
                    wrap='wrap'
                    justify='space-between'
                    style={{ marginTop: "auto" }}
                  >
                    <Space size={6} wrap>
                      <Button
                        size='small'
                        icon={<ExternalLink size={14} />}
                        loading={isBusy(module, "open")}
                        onClick={() => openModule(module)}
                      >
                        {isUploaded ? "Buka File" : "Lihat PDF"}
                      </Button>
                      <Button
                        size='small'
                        type='primary'
                        ghost
                        icon={<Download size={14} />}
                        loading={isBusy(module, "download")}
                        onClick={() => downloadModule(module)}
                      >
                        {isUploaded ? "Unduh" : "Unduh PDF"}
                      </Button>
                    </Space>
                    <Space size={4}>
                      <Tooltip title='Edit'>
                        <Button
                          size='small'
                          type='text'
                          icon={<Pencil size={14} />}
                          onClick={() => handleEdit(module)}
                        />
                      </Tooltip>
                      <Popconfirm
                        title='Hapus modul ajar?'
                        description={
                          isUploaded
                            ? "File modul juga akan dihapus dari server."
                            : "Isi modul akan dihapus permanen."
                        }
                        okText='Hapus'
                        cancelText='Batal'
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(module)}
                      >
                        <Tooltip title='Hapus'>
                          <Button
                            size='small'
                            type='text'
                            danger
                            icon={<Trash2 size={14} />}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  </Flex>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <TeachingModuleFormDrawer
        open={formState.open}
        moduleId={formState.moduleId}
        subjectId={subjectId}
        meta={metaRes?.data}
        gradeOptions={gradeOptions}
        defaultGradeId={gradeId}
        onClose={() => setFormState({ open: false, moduleId: null })}
      />
      <TeachingModuleUploadModal
        open={uploadState.open}
        module={uploadState.module}
        subjectId={subjectId}
        gradeOptions={gradeOptions}
        defaultGradeId={gradeId}
        onClose={() => setUploadState({ open: false, module: null })}
      />
    </Flex>
  );
};

export default TeachingModuleTab;
