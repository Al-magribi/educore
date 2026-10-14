import React, { useState } from "react";
import { Button, Card, Flex, Grid, Input, Statistic, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { UserPlus } from "lucide-react";
import StaffList from "./StaffList";
import StaffForm from "./StaffForm";
import {
  useAddStaffMutation,
  useDeleteStaffMutation,
  useGetStaffQuery,
  useUpdateStaffMutation,
} from "../../../../service/academic/ApiStaff";
import PageHeader from "../../../../components/ui/PageHeader";
import useDebounced from "../../../../utils/useDebounced";

const { useBreakpoint } = Grid;

const Staff = () => {
  const screens = useBreakpoint();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounced(searchText, 500);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const { data, isLoading, isFetching, refetch } = useGetStaffQuery({
    page: pagination.current,
    limit: pagination.pageSize,
    search: debouncedSearch,
  });
  const [addStaff, { isLoading: isAdding }] = useAddStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();

  const items = data?.data || [];
  const total = data?.total ?? 0;
  const activeCount = items.filter((item) => item.is_active).length;

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await updateStaff({ id: editing.id, ...values }).unwrap();
        message.success("Data tendik berhasil diperbarui");
      } else {
        await addStaff(values).unwrap();
        message.success("Tendik baru berhasil ditambahkan");
      }
      setOpen(false);
      setEditing(null);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan tendik");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStaff(id).unwrap();
      message.success("Tendik berhasil dihapus");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus tendik");
    }
  };

  return (
    <Flex vertical gap={16}>
      <Flex gap={16} wrap="wrap">
        <Card style={{ flex: "1 1 180px", borderRadius: 18 }}>
          <Statistic title="Total Tendik" value={total} />
        </Card>
        <Card style={{ flex: "1 1 180px", borderRadius: 18 }}>
          <Statistic title="Aktif di halaman ini" value={activeCount} />
        </Card>
      </Flex>

      <PageHeader
        size="section"
        title="Tenaga kependidikan"
        description="Data induk tendik satuan ini. Keuangan hanya membaca daftar ini."
        extra={
          <>
            <Input
              allowClear
              placeholder="Cari nama / NIP / RFID"
              prefix={<SearchOutlined />}
              style={{ width: screens.md ? 260 : "100%" }}
              onChange={(event) => {
                setSearchText(event.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
            <Button
              type="primary"
              icon={<UserPlus size={16} />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Tendik
            </Button>
          </>
        }
      />

      <StaffList
        data={items}
        loading={isLoading || isFetching}
        onEdit={(record) => {
          setEditing(record);
          setOpen(true);
        }}
        onDelete={handleDelete}
        pagination={{ ...pagination, total }}
        onPageChange={(nextPage) =>
          setPagination((prev) => ({
            ...prev,
            current: nextPage?.current || 1,
            pageSize: nextPage?.pageSize || prev.pageSize,
          }))
        }
      />

      <StaffForm
        open={open}
        initialValues={editing}
        loading={isAdding || isUpdating}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </Flex>
  );
};

export default Staff;
