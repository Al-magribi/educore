import React, { useState } from "react";
import { Flex, Grid, message } from "antd";
import { Briefcase, UserCheck } from "lucide-react";
import StaffList from "./StaffList";
import StaffForm from "./StaffForm";
import {
  useAddStaffMutation,
  useDeleteStaffMutation,
  useGetStaffQuery,
  useUpdateStaffMutation,
} from "../../../../service/academic/ApiStaff";
import useDebounced from "../../../../utils/useDebounced";
import { StatCard } from "../../../../components/ui/muse";
import { DataListCard } from "../../../../components/ui/muse/DataSection";

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
    <Flex vertical gap={screens.md ? 24 : 16}>
      <div
        style={{
          display: "grid",
          gap: screens.md ? 24 : 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <StatCard title="Total Tendik" value={total} icon={<Briefcase size={24} />} tone="primary" />
        <StatCard
          title="Aktif"
          value={activeCount}
          note="Pada halaman yang ditampilkan"
          icon={<UserCheck size={24} />}
          tone="success"
        />
      </div>

      <DataListCard
        flush={screens.md}
        title="Tenaga Kependidikan"
        description={screens.md ? "Keuangan hanya membaca daftar ini" : undefined}
        count={total}
        unit="tendik"
        searchProps={{
          placeholder: "Cari nama / NIP / RFID",
          onChange: (event) => {
            setSearchText(event.target.value);
            setPagination((prev) => ({ ...prev, current: 1 }));
          },
        }}
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        addLabel="Tambah Tendik"
      >
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
      </DataListCard>

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
