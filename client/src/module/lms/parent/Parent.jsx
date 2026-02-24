import React, { useEffect, useMemo, useState } from "react";
import { Card, Divider, Flex, Form, Grid, Modal, Typography, message } from "antd";
import InfiniteScrollList from "../../../components/scroll/InfiniteScrollList";
import {
  useAddParentMutation,
  useDeleteParentMutation,
  useGetParentMetaQuery,
  useGetParentsQuery,
  useLazyGetParentByIdQuery,
  useUpdateParentMutation,
} from "../../../service/lms/ApiParent";
import ParentCard from "./components/ParentCard";
import ParentFilterBar from "./components/ParentFilterBar";
import ParentFormDrawer from "./components/ParentFormDrawer";

const { Text } = Typography;

const Parent = () => {
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState(null);
  const [classFilter, setClassFilter] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editingParent, setEditingParent] = useState(null);

  const { data: parentRes, isFetching: isLoadingParents } = useGetParentsQuery({
    page,
    limit,
    search,
    grade_id: gradeFilter,
    class_id: classFilter,
  });
  const { data: metaRes } = useGetParentMetaQuery();
  const [fetchParentById] = useLazyGetParentByIdQuery();

  const [addParent, { isLoading: isAdding }] = useAddParentMutation();
  const [updateParent, { isLoading: isUpdating }] = useUpdateParentMutation();
  const [deleteParent, { isLoading: isDeleting }] = useDeleteParentMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setRows([]);
      setSearch(searchText.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
    setRows([]);
  }, [gradeFilter, classFilter]);

  useEffect(() => {
    const pageData = parentRes?.data || [];
    const timer = setTimeout(() => {
      if (page === 1) {
        setRows(pageData);
        return;
      }

      setRows((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const uniqueNext = pageData.filter((item) => !existing.has(item.id));
        return [...prev, ...uniqueNext];
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [parentRes, page]);

  const totalData = parentRes?.totalData || 0;
  const hasMore = rows.length < totalData;
  const activePeriode = metaRes?.data?.active_periode || null;
  const students = useMemo(() => metaRes?.data?.students ?? [], [metaRes?.data?.students]);

  const gradeOptions = useMemo(() => {
    const unique = new Map();
    students.forEach((item) => {
      const gradeId = Number(item.grade_id);
      if (!gradeId || unique.has(gradeId)) return;
      unique.set(gradeId, {
        value: gradeId,
        label: item.grade_name || `Tingkat ${gradeId}`,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label)),
    );
  }, [students]);

  const classOptions = useMemo(() => {
    const unique = new Map();
    students.forEach((item) => {
      const classId = Number(item.class_id || item.current_class_id);
      const gradeId = Number(item.grade_id);
      if (!classId) return;
      if (gradeFilter && gradeId !== Number(gradeFilter)) return;
      if (unique.has(classId)) return;

      let label = item.class_name || `Kelas ${classId}`;
      if (item.grade_name) {
        label = `${item.grade_name} / ${label}`;
      }

      unique.set(classId, {
        value: classId,
        label,
      });
    });

    return Array.from(unique.values()).sort((a, b) =>
      String(a.label).localeCompare(String(b.label)),
    );
  }, [students, gradeFilter]);

  const studentOptions = useMemo(() => {
    return students.map((item) => {
      const ownerParentId = item.owner_parent_id;
      const disabled =
        ownerParentId && Number(ownerParentId) !== Number(editingParent?.id);

      let label = `${item.nis || "-"} - ${item.full_name || "-"}`;
      if (item.grade_name || item.class_name) {
        label += ` (${item.grade_name || "-"}${item.class_name ? ` / ${item.class_name}` : ""})`;
      }
      if (disabled && item.owner_parent_name) {
        label += ` [Terhubung: ${item.owner_parent_name}]`;
      }

      return {
        value: item.nis,
        label,
        disabled,
      };
    });
  }, [students, editingParent]);

  const closeForm = () => {
    setOpenForm(false);
    setEditingParent(null);
    form.resetFields();
  };

  const openCreateDrawer = () => {
    setEditingParent(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, nis_list: [] });
    setOpenForm(true);
  };

  const openEditDrawer = (record) => {
    setEditingParent(record);
    form.setFieldsValue({
      username: record.username,
      full_name: record.full_name,
      phone: record.phone || "",
      email: record.email || "",
      is_active: !!record.is_active,
      nis_list: (record.students || []).map((item) => item.nis).filter(Boolean),
      password: "",
    });
    setOpenForm(true);
  };

  const handleLoadMore = () => {
    if (!isLoadingParents && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleChangeGradeFilter = (value) => {
    setGradeFilter(value || null);
    setClassFilter(null);
  };

  const handleChangeClassFilter = (value) => {
    setClassFilter(value || null);
  };

  const handleEditByParentId = async (parentId) => {
    if (!parentId) return;

    try {
      const res = await fetchParentById(parentId).unwrap();
      openEditDrawer(res.data);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memuat data orang tua.");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        username: String(values.username || "").trim(),
        full_name: String(values.full_name || "").trim(),
        phone: values.phone ? String(values.phone).trim() : null,
        email: values.email ? String(values.email).trim() : null,
        is_active: !!values.is_active,
        nis_list: (values.nis_list || []).map((item) => String(item).trim()),
      };

      if (editingParent) {
        if (values.password && String(values.password).trim() !== "") {
          payload.password = String(values.password);
        }
        await updateParent({ id: editingParent.id, ...payload }).unwrap();
        message.success("Data orang tua berhasil diperbarui.");
      } else {
        payload.password = String(values.password || "");
        await addParent(payload).unwrap();
        message.success("Orang tua berhasil ditambahkan.");
      }

      closeForm();
      setPage(1);
      setRows([]);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || "Gagal menyimpan data.");
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Hapus Orang Tua",
      content: `Yakin ingin menghapus akun ${record.full_name}?`,
      okText: "Hapus",
      okButtonProps: { danger: true, loading: isDeleting },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deleteParent(record.id).unwrap();
          message.success("Orang tua berhasil dihapus.");
          setPage(1);
          setRows([]);
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus data.");
        }
      },
    });
  };

  return (
    <Flex vertical gap={16} style={{ overflowX: "hidden" }}>
      <Card variant="borderless" style={{ borderRadius: 14, overflow: "hidden" }}>
        <ParentFilterBar
          screens={screens}
          searchText={searchText}
          onSearchChange={setSearchText}
          gradeFilter={gradeFilter}
          classFilter={classFilter}
          gradeOptions={gradeOptions}
          classOptions={classOptions}
          onChangeGradeFilter={handleChangeGradeFilter}
          onChangeClassFilter={handleChangeClassFilter}
          onCreate={openCreateDrawer}
        />

        <InfiniteScrollList
          data={rows}
          loading={isLoadingParents}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          renderItem={(item, index) => (
            <ParentCard
              item={item}
              index={index}
              onEdit={handleEditByParentId}
              onDelete={handleDelete}
            />
          )}
          emptyText="Data orang tua tidak ditemukan"
          grid={{
            gutter: [12, 12],
            xs: 24,
            sm: 24,
            md: 12,
            lg: 12,
            xl: 8,
            xxl: 8,
          }}
        />

        <Divider style={{ margin: 0 }} />
        <Flex justify="space-between" align="center" style={{ padding: "10px 14px" }}>
          <Text type="secondary">
            {rows.length > 0 ? `1-${rows.length} dari ${totalData}` : `0 dari ${totalData}`}
          </Text>
          <Text type="secondary">
            Periode Aktif: <Text strong>{activePeriode?.name || "-"}</Text>
          </Text>
        </Flex>
      </Card>

      <ParentFormDrawer
        screens={screens}
        open={openForm}
        editingParent={editingParent}
        form={form}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={isAdding || isUpdating}
        studentOptions={studentOptions}
      />
    </Flex>
  );
};

export default Parent;
