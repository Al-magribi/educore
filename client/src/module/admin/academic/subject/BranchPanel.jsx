import React, { useState } from "react";
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Select,
  Typography,
  Flex,
  Badge,
  Tooltip,
} from "antd";
import { Plus, Trash2, Search, GitBranch } from "lucide-react";
import {
  useGetSubjectBranchesQuery,
  useAddSubjectBranchMutation,
  useDeleteSubjectBranchMutation,
  useGetSubjectCategoriesQuery,
} from "../../../../service/academic/ApiSubject";
import { InfiniteScrollList } from "../../../../components";

const { Text, Paragraph } = Typography;

const BranchPanel = ({ screens }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  // Fetch Data
  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData, isLoading } = useGetSubjectBranchesQuery(null);

  const [addBranch, { isLoading: isAdding }] = useAddSubjectBranchMutation();
  const [deleteBranch] = useDeleteSubjectBranchMutation();

  const handleAdd = async (values) => {
    try {
      await addBranch(values).unwrap();
      message.success("Cabang berhasil dibuat");
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error("Gagal membuat cabang");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBranch(id).unwrap();
      message.success("Cabang dihapus");
    } catch (error) {
      message.error("Gagal menghapus");
    }
  };

  // Client-side filtering
  const filteredData =
    branchesData?.data?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category_name?.toLowerCase().includes(searchText.toLowerCase()),
    ) || [];

  // --- Styles ---
  const styles = {
    header: {
      background: "#fff",
      padding: 16,
      borderRadius: 12,
      border: "1px solid #f0f0f0",
      marginBottom: 24,
      boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
    },

    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "#f6ffed", // Green tint
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#52c41a",
      marginRight: 16,
      flexShrink: 0,
    },
  };

  return (
    <div>
      {/* --- HEADER --- */}
      <div style={styles.header}>
        <Flex
          gap={8}
          vertical={!!screens.xs}
          align={screens.xs ? "stretch" : "center"}
          justify='flex-end'
          style={{ width: screens.xs ? "100%" : "auto" }}
        >
          <Input
            prefix={<Search size={16} style={{ color: "#bfbfbf" }} />}
            placeholder='Cari cabang atau kategori...'
            style={{ width: screens.xs ? "100%" : "auto" }}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            type='primary'
            icon={<Plus size={18} />}
            onClick={() => setIsModalOpen(true)}
            style={{ width: screens.xs ? "100%" : "auto" }}
          >
            Cabang
          </Button>
        </Flex>
      </div>

      {/* --- CONTENT GRID (Infinite Scroll) --- */}
      <InfiniteScrollList
        data={filteredData}
        loading={isLoading}
        hasMore={false} // Client side filtering = no load more
        height='70vh'
        emptyText='Belum ada data cabang'
        grid={{ gutter: [16, 16], xs: 24, sm: 12, md: 12, lg: 8, xl: 6 }}
        renderItem={(item) => (
          <Badge.Ribbon
            text={item.category_name || "Tanpa Kategori"}
            color='cyan'
            style={{ top: 12 }}
          >
            <Card
              hoverable
              actions={[
                <Popconfirm
                  title='Hapus cabang ini?'
                  description='Tindakan ini tidak dapat dibatalkan'
                  onConfirm={() => handleDelete(item.id)}
                  okText='Hapus'
                  cancelText='Batal'
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title='Hapus'>
                    <Button
                      type='text'
                      danger
                      icon={<Trash2 size={16} />}
                      style={{ width: "100%" }}
                    >
                      Hapus
                    </Button>
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <Flex align='flex-start'>
                <div style={styles.iconBox}>
                  <GitBranch size={20} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      display: "block",
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </Text>
                  <Paragraph
                    type='secondary'
                    ellipsis={{ rows: 2 }}
                    style={{ fontSize: 13, margin: 0, minHeight: 40 }}
                  >
                    {item.description || "Tidak ada deskripsi"}
                  </Paragraph>
                </div>
              </Flex>
            </Card>
          </Badge.Ribbon>
        )}
      />

      {/* --- MODAL --- */}
      <Modal
        title={
          <Flex align='center' gap={8}>
            <Plus size={20} /> <span>Tambah Cabang Baru</span>
          </Flex>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isAdding}
        centered
      >
        <Form
          form={form}
          onFinish={handleAdd}
          layout='vertical'
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name='category_id'
            label='Pilih Kategori'
            rules={[{ required: true, message: "Kategori wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih Kategori'
              options={categoriesData?.data?.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
              size='large'
            />
          </Form.Item>

          <Form.Item
            name='name'
            label='Nama Cabang'
            rules={[{ required: true, message: "Wajib diisi" }]}
          >
            <Input
              placeholder='Contoh: Fiqih, Bahasa Arab'
              size='large'
              prefix={
                <GitBranch
                  size={16}
                  style={{ color: "#bfbfbf", marginRight: 8 }}
                />
              }
            />
          </Form.Item>

          <Form.Item name='description' label='Deskripsi (Opsional)'>
            <Input.TextArea
              rows={3}
              placeholder='Tambahkan catatan singkat...'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BranchPanel;
