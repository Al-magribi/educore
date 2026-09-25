import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useAddHonorAssignmentMutation,
  useAddHonorStaffMutation,
  useDeleteHonorAssignmentMutation,
  useDeleteHonorStaffMutation,
  useGetHonorAssignmentsQuery,
  useGetHonorEskulAssignmentsQuery,
  useGetHonorPeopleQuery,
  useGetHonorPositionsQuery,
  useGetHonorRatesQuery,
  useGetHonorStaffQuery,
  useGetHonorUnitsQuery,
  useUpdateHonorAssignmentMutation,
  useUpdateHonorStaffMutation,
} from "../../../../service/finance/ApiHonorarium";
import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const { TextArea } = Input;
const MotionDiv = motion.div;

const HonorariumPersonnelPanel = ({
  homebaseId,
  homebases = [],
  lockHomebase = false,
  onHomebaseChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [innerTab, setInnerTab] = useState("assignment");

  const [staffForm] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [unitFilter, setUnitFilter] = useState("all");
  const [personTypeFilter, setPersonTypeFilter] = useState("all");
  const [nameSearch, setNameSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const unitsQuery = useGetHonorUnitsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const positionsQuery = useGetHonorPositionsQuery(
    { homebase_id: homebaseId, active_only: 1 },
    { skip: !homebaseId },
  );
  const ratesQuery = useGetHonorRatesQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const dutyOptions = (ratesQuery.data?.data || []).filter(
    (item) => item.item_kind === "extra_duty" && item.is_active,
  );
  const eskulOptions = (ratesQuery.data?.data || []).filter(
    (item) => item.item_kind === "eskul" && item.is_active,
  );
  const eskulAssignQuery = useGetHonorEskulAssignmentsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );
  const eskulAssignments = eskulAssignQuery.data?.data || [];
  const peopleQuery = useGetHonorPeopleQuery(
    { homebase_id: homebaseId, active_only: 0 },
    { skip: !homebaseId },
  );
  const staffQuery = useGetHonorStaffQuery(
    {
      homebase_id: homebaseId,
      ...(staffSearch ? { search: staffSearch } : {}),
    },
    { skip: !homebaseId || innerTab !== "tendik" },
  );
  const assignmentQuery = useGetHonorAssignmentsQuery(
    {
      homebase_id: homebaseId,
      ...(unitFilter !== "all" ? { unit_id: unitFilter } : {}),
      ...(personTypeFilter !== "all" ? { person_type: personTypeFilter } : {}),
    },
    { skip: !homebaseId || innerTab !== "assignment" },
  );

  const units = unitsQuery.data?.data || [];
  const positions = positionsQuery.data?.data || [];
  const teachers = peopleQuery.data?.data?.teachers || [];
  const peopleStaff = peopleQuery.data?.data?.staff || [];
  const staffList = staffQuery.data?.data || [];
  const assignments = assignmentQuery.data?.data || [];

  const [addStaff, addStaffState] = useAddHonorStaffMutation();
  const [updateStaff, updateStaffState] = useUpdateHonorStaffMutation();
  const [deleteStaff, deleteStaffState] = useDeleteHonorStaffMutation();
  const [addAssignment, addAssignmentState] = useAddHonorAssignmentMutation();
  const [updateAssignment, updateAssignmentState] =
    useUpdateHonorAssignmentMutation();
  const [deleteAssignment, deleteAssignmentState] =
    useDeleteHonorAssignmentMutation();

  const personTypeWatch = Form.useWatch("person_type", assignmentForm);

  const positionOptions = useMemo(
    () =>
      positions.map((item) => ({
        value: item.id,
        label: `${item.unit_name || "Unit"} · ${item.name}`,
      })),
    [positions],
  );

  const openCreateStaff = () => {
    setEditingStaff(null);
    staffForm.setFieldsValue({
      full_name: "",
      nip: "",
      phone: "",
      email: "",
      notes: "",
      is_active: true,
    });
    setStaffModalOpen(true);
  };

  const openEditStaff = (record) => {
    setEditingStaff(record);
    staffForm.setFieldsValue({
      full_name: record.full_name,
      nip: record.nip || "",
      phone: record.phone || "",
      email: record.email || "",
      notes: record.notes || "",
      is_active: record.is_active !== false,
    });
    setStaffModalOpen(true);
  };

  const handleSubmitStaff = async (values) => {
    try {
      const payload = {
        homebase_id: homebaseId,
        full_name: values.full_name,
        nip: values.nip || null,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
        is_active: values.is_active !== false,
      };

      if (editingStaff?.id) {
        await updateStaff({ id: editingStaff.id, ...payload }).unwrap();
        message.success("Tendik berhasil diperbarui");
      } else {
        await addStaff(payload).unwrap();
        message.success("Tendik berhasil ditambahkan");
      }

      setStaffModalOpen(false);
      setEditingStaff(null);
      staffForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan tendik");
    }
  };

  const handleDeleteStaff = (record) => {
    Modal.confirm({
      title: `Hapus tendik "${record.full_name}"?`,
      content:
        record.assignment_count > 0
          ? "Tendik masih punya assignment. Hapus assignment terlebih dahulu."
          : "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: {
        danger: true,
        disabled: record.assignment_count > 0,
        loading: deleteStaffState.isLoading,
      },
      cancelText: "Batal",
      onOk: async () => {
        if (record.assignment_count > 0) {
          return;
        }
        try {
          await deleteStaff({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Tendik berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus tendik");
        }
      },
    });
  };

  const eskulItemsForPerson = (personType, teacherId, staffId) =>
    eskulAssignments
      .filter((item) =>
        personType === "staff"
          ? Number(item.staff_id) === Number(staffId)
          : Number(item.teacher_id) === Number(teacherId),
      )
      .map((item) => ({
        rate_item_id: item.rate_item_id,
        quantity: item.quantity || 0,
      }));

  const openCreateAssignment = (person) => {
    setEditingAssignment(null);
    const personType = person?.person_type === "staff" ? "staff" : "teacher";
    assignmentForm.setFieldsValue({
      person_type: personType,
      teacher_id:
        personType === "teacher" ? person?.teacher_id || undefined : undefined,
      staff_id: personType === "staff" ? person?.staff_id || undefined : undefined,
      position_id: undefined,
      duty_ids: [],
      eskul_items: eskulItemsForPerson(
        personType,
        person?.teacher_id,
        person?.staff_id,
      ),
      valid_range: null,
      notes: "",
      is_active: true,
    });
    setAssignmentModalOpen(true);
  };

  const openEditAssignment = (record) => {
    setEditingAssignment(record);
    assignmentForm.setFieldsValue({
      person_type: record.person_type,
      teacher_id: record.teacher_id || undefined,
      staff_id: record.staff_id || undefined,
      position_id: record.position_id,
      duty_ids: (record.duties || []).map((item) => item.id),
      eskul_items: eskulItemsForPerson(
        record.person_type,
        record.teacher_id,
        record.staff_id,
      ),
      valid_range:
        record.valid_from || record.valid_to
          ? [
              record.valid_from ? dayjs(record.valid_from) : null,
              record.valid_to ? dayjs(record.valid_to) : null,
            ]
          : null,
      notes: record.notes || "",
      is_active: record.is_active !== false,
    });
    setAssignmentModalOpen(true);
  };

  const handleSubmitAssignment = async (values) => {
    try {
      const [fromDate, toDate] = values.valid_range || [];
      const payload = {
        homebase_id: homebaseId,
        person_type: values.person_type,
        teacher_id: values.person_type === "teacher" ? values.teacher_id : null,
        staff_id: values.person_type === "staff" ? values.staff_id : null,
        position_id: values.position_id,
        duty_ids: values.person_type === "teacher" ? values.duty_ids || [] : [],
        eskul_items: (values.eskul_items || []).filter((item) => item?.rate_item_id),
        valid_from: fromDate ? fromDate.format("YYYY-MM-DD") : null,
        valid_to: toDate ? toDate.format("YYYY-MM-DD") : null,
        notes: values.notes || null,
        is_active: values.is_active !== false,
      };

      if (editingAssignment?.id) {
        await updateAssignment({
          id: editingAssignment.id,
          ...payload,
        }).unwrap();
        message.success("Assignment berhasil diperbarui");
      } else {
        await addAssignment(payload).unwrap();
        message.success("Assignment berhasil ditambahkan");
      }

      setAssignmentModalOpen(false);
      setEditingAssignment(null);
      assignmentForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan assignment");
    }
  };

  const handleDeleteAssignment = (record) => {
    Modal.confirm({
      title: `Hapus assignment "${record.person_name}" — ${record.position_name}?`,
      content: "Data yang dihapus tidak dapat dikembalikan.",
      okText: "Hapus",
      okButtonProps: { danger: true, loading: deleteAssignmentState.isLoading },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await deleteAssignment({
            id: record.id,
            homebase_id: homebaseId,
          }).unwrap();
          message.success("Assignment berhasil dihapus");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menghapus assignment");
        }
      },
    });
  };

  const staffColumns = useMemo(
    () => [
      {
        title: "Nama",
        key: "name",
        render: (_, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{record.full_name}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.nip || "Tanpa NIP"}
              {record.phone ? ` · ${record.phone}` : ""}
            </Text>
          </Space>
        ),
      },
      {
        title: "Assignment",
        dataIndex: "assignment_count",
        width: 110,
        align: "center",
        render: (value) => (
          <Tag style={{ borderRadius: 999 }}>{Number(value || 0)}</Tag>
        ),
      },
      {
        title: "Status",
        dataIndex: "is_active",
        width: 110,
        render: (value) => (
          <Tag
            color={value ? "green" : "default"}
            style={{ borderRadius: 999 }}
          >
            {value ? "Aktif" : "Nonaktif"}
          </Tag>
        ),
      },
      {
        title: "Aksi",
        key: "action",
        width: 120,
        render: (_, record) => (
          <Space>
            <Button
              type='text'
              icon={<Pencil size={16} />}
              onClick={() => openEditStaff(record)}
            />
            <Button
              type='text'
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDeleteStaff(record)}
            />
          </Space>
        ),
      },
    ],
    [deleteStaffState.isLoading, homebaseId],
  );

  const personnelRows = useMemo(() => {
    const byPerson = new Map();
    const personKey = (type, id) => `${type}:${id}`;

    for (const teacher of teachers) {
      byPerson.set(personKey("teacher", teacher.id), {
        person_type: "teacher",
        person_name: teacher.full_name || "",
        person_nip: teacher.nip || null,
        teacher_id: teacher.id,
        staff_id: null,
        person_active: teacher.is_active !== false,
        assignments: [],
      });
    }

    for (const staff of peopleStaff) {
      byPerson.set(personKey("staff", staff.id), {
        person_type: "staff",
        person_name: staff.full_name || "",
        person_nip: staff.nip || null,
        teacher_id: null,
        staff_id: staff.id,
        person_active: staff.is_active !== false,
        assignments: [],
      });
    }

    for (const assignment of assignments) {
      const id =
        assignment.person_type === "teacher"
          ? assignment.teacher_id
          : assignment.staff_id;
      if (!id) {
        continue;
      }
      const key = personKey(assignment.person_type, id);
      if (!byPerson.has(key)) {
        byPerson.set(key, {
          person_type: assignment.person_type,
          person_name: assignment.person_name || "",
          person_nip: assignment.person_nip || null,
          teacher_id: assignment.teacher_id,
          staff_id: assignment.staff_id,
          person_active: true,
          assignments: [],
        });
      }
      byPerson.get(key).assignments.push(assignment);
    }

    const keyword = nameSearch.trim().toLocaleLowerCase("id");
    const rows = [];

    for (const person of byPerson.values()) {
      if (
        personTypeFilter !== "all" &&
        person.person_type !== personTypeFilter
      ) {
        continue;
      }
      if (
        keyword &&
        !String(person.person_name || "")
          .toLocaleLowerCase("id")
          .includes(keyword)
      ) {
        continue;
      }

      const matchedAssignments = person.assignments.filter((assignment) => {
        if (unitFilter === "all") {
          return true;
        }
        return Number(assignment.unit_id) === Number(unitFilter);
      });

      if (matchedAssignments.length === 0) {
        if (unitFilter !== "all") {
          continue;
        }
        rows.push({
          id: `unassigned-${person.person_type}-${person.teacher_id || person.staff_id}`,
          unassigned: true,
          person_type: person.person_type,
          person_name: person.person_name,
          person_nip: person.person_nip,
          teacher_id: person.teacher_id,
          staff_id: person.staff_id,
          is_active: person.person_active,
          duties: [],
        });
        continue;
      }

      for (const assignment of matchedAssignments) {
        rows.push({ ...assignment, unassigned: false });
      }
    }

    rows.sort((left, right) => {
      const byName = String(left.person_name || "").localeCompare(
        String(right.person_name || ""),
        "id",
        { sensitivity: "base" },
      );
      if (byName !== 0) {
        return byName;
      }
      return String(left.position_name || "").localeCompare(
        String(right.position_name || ""),
        "id",
        { sensitivity: "base" },
      );
    });

    return rows;
  }, [teachers, peopleStaff, assignments, nameSearch, personTypeFilter, unitFilter]);

  const assignmentColumns = useMemo(
    () => [
      {
        title: "Personel",
        key: "person",
        render: (_, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{record.person_name || "-"}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.person_type === "teacher" ? "Guru" : "Tendik"}
              {record.person_nip ? ` · ${record.person_nip}` : ""}
            </Text>
          </Space>
        ),
      },
      {
        title: "Unit / Jabatan",
        key: "position",
        render: (_, record) => {
          if (record.unassigned) {
            return <Tag style={{ borderRadius: 999 }}>Belum ditugaskan</Tag>;
          }
          return (
          <Space direction='vertical' size={0}>
            <Tag
              color='blue'
              style={{ borderRadius: 999, width: "fit-content" }}
            >
              {record.unit_name || "-"}
            </Tag>
            <Text>{record.position_name}</Text>
          </Space>
          );
        },
      },
      {
        title: "Tunjangan",
        dataIndex: "allowance_amount",
        width: 140,
        align: "right",
        render: (value, record) =>
          record.unassigned ? (
            <Text type='secondary'>—</Text>
          ) : (
            <Text strong>{currencyFormatter.format(Number(value || 0))}</Text>
          ),
      },
      {
        title: "Gapok",
        dataIndex: "base_salary",
        width: 140,
        align: "right",
        render: (value, record) =>
          record.unassigned ? (
            <Text type='secondary'>—</Text>
          ) : (
            <Text strong>{currencyFormatter.format(Number(value || 0))}</Text>
          ),
      },
      {
        title: "Eskul",
        key: "eskul",
        width: 220,
        render: (_, record) => {
          const items = eskulAssignments.filter((item) =>
            record.person_type === "staff"
              ? Number(item.staff_id) === Number(record.staff_id)
              : Number(item.teacher_id) === Number(record.teacher_id),
          );
          if (!items.length) {
            return <Text type='secondary'>—</Text>;
          }
          return (
            <Space direction='vertical' size={2}>
              {items.map((item) => (
                <Flex key={item.id} justify='space-between' gap={8}>
                  <Text>
                    {item.item_name} · {Number(item.quantity || 0)}x
                  </Text>
                  <Text strong>
                    {currencyFormatter.format(Number(item.payable || 0))}
                  </Text>
                </Flex>
              ))}
            </Space>
          );
        },
      },
      {
        title: "Tugas tambahan",
        key: "duties",
        width: 220,
        render: (_, record) => {
          if (record.unassigned || !(record.duties || []).length) {
            return <Text type='secondary'>—</Text>;
          }
          return (
            <Space direction='vertical' size={2}>
              {record.duties.map((item) => (
                <Flex key={item.id} justify='space-between' gap={8}>
                  <Text>{item.name}</Text>
                  <Text strong>
                    {currencyFormatter.format(Number(item.amount || 0))}
                  </Text>
                </Flex>
              ))}
            </Space>
          );
        },
      },
      {
        title: "Masa berlaku",
        key: "valid",
        width: 170,
        render: (_, record) => {
          if (record.unassigned) {
            return <Text type='secondary'>—</Text>;
          }
          if (!record.valid_from && !record.valid_to) {
            return <Text type='secondary'>Selamanya</Text>;
          }
          const from = record.valid_from
            ? dayjs(record.valid_from).format("DD MMM YYYY")
            : "…";
          const to = record.valid_to
            ? dayjs(record.valid_to).format("DD MMM YYYY")
            : "…";
          return (
            <Text type='secondary' style={{ fontSize: 12 }}>
              {from} – {to}
            </Text>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "is_active",
        width: 140,
        render: (value, record) => (
          <Tag
            color={record.unassigned ? "orange" : value ? "green" : "default"}
            style={{ borderRadius: 999 }}
          >
            {record.unassigned ? "Belum ditugaskan" : value ? "Aktif" : "Nonaktif"}
          </Tag>
        ),
      },
      {
        title: "Aksi",
        key: "action",
        width: 120,
        render: (_, record) =>
          record.unassigned ? (
            <Button
              type='link'
              disabled={positions.length === 0}
              onClick={() => openCreateAssignment(record)}
            >
              Tugaskan
            </Button>
          ) : (
          <Space>
            <Button
              type='text'
              icon={<Pencil size={16} />}
              onClick={() => openEditAssignment(record)}
            />
            <Button
              type='text'
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDeleteAssignment(record)}
            />
          </Space>
          ),
      },
    ],
    [deleteAssignmentState.isLoading, homebaseId, positions.length],
  );

  if (!homebaseId) {
    return (
      <Card style={cardStyle}>
        <Text type='secondary'>Pilih satuan sekolah terlebih dahulu.</Text>
      </Card>
    );
  }

  if (
    unitsQuery.isLoading ||
    positionsQuery.isLoading ||
    peopleQuery.isLoading
  ) {
    return <LoadApp />;
  }

  return (
    <Flex vertical gap={isMobile ? 12 : 16}>
      <Card
        style={cardStyle}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={12}
          wrap='wrap'
        >
          <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ fontSize: 16 }}>
              Personel & Assignment
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              CRUD tendik non-guru dan assign multi-jabatan untuk guru/tendik.
            </Text>
          </Flex>
          {!lockHomebase ? (
            <Select
              placeholder='Pilih satuan'
              value={homebaseId}
              onChange={onHomebaseChange}
              style={{ minWidth: isMobile ? "100%" : 220 }}
              options={homebases.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              virtual={false}
            />
          ) : null}
        </Flex>
      </Card>

      <Card
        style={cardStyle}
        styles={{ body: { padding: isMobile ? 10 : 14 } }}
      >
        <Tabs
          activeKey={innerTab}
          onChange={setInnerTab}
          size={isMobile ? "small" : "middle"}
          items={[
            {
              key: "assignment",
              label: "Assignment Jabatan",
              children: (
                <Flex vertical gap={12}>
                  <Flex gap={8} wrap='wrap' justify='space-between'>
                    <Space wrap>
                      <Input.Search
                        allowClear
                        placeholder='Cari nama'
                        value={nameSearch}
                        onChange={(event) => setNameSearch(event.target.value)}
                        style={{ minWidth: isMobile ? "100%" : 220 }}
                      />
                      <Select
                        value={unitFilter}
                        onChange={setUnitFilter}
                        style={{ minWidth: isMobile ? "100%" : 180 }}
                        options={[
                          { value: "all", label: "Semua unit" },
                          ...units.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                        virtual={false}
                      />
                      <Select
                        value={personTypeFilter}
                        onChange={setPersonTypeFilter}
                        style={{ minWidth: isMobile ? "100%" : 150 }}
                        options={[
                          { value: "all", label: "Semua tipe" },
                          { value: "teacher", label: "Guru" },
                          { value: "staff", label: "Tendik" },
                        ]}
                        virtual={false}
                      />
                    </Space>

                    <Button
                      type='primary'
                      icon={<Plus size={16} />}
                      onClick={() => openCreateAssignment()}
                      disabled={positions.length === 0}
                      style={{ borderRadius: 12 }}
                      block={isMobile}
                    >
                      Tambah Assignment
                    </Button>
                  </Flex>

                  {positions.length === 0 ? (
                    <Text type='secondary'>
                      Belum ada jabatan. Buat jabatan di tab Jabatan terlebih
                      dahulu.
                    </Text>
                  ) : null}
                  <MotionDiv
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Table
                      rowKey='id'
                      size={isMobile ? "small" : "middle"}
                      columns={assignmentColumns}
                      dataSource={personnelRows}
                      loading={assignmentQuery.isFetching || peopleQuery.isFetching}
                      pagination={false}
                      locale={{
                        emptyText: nameSearch.trim()
                          ? "Tidak ada personel dengan nama itu."
                          : "Belum ada guru atau tendik.",
                      }}
                      scroll={{ x: 1180 }}
                    />
                  </MotionDiv>
                </Flex>
              ),
            },
            {
              key: "tendik",
              label: "Tendik",
              children: (
                <Flex vertical gap={12}>
                  <Flex gap={8} wrap='wrap'>
                    <Input.Search
                      allowClear
                      placeholder='Cari nama / NIP / kontak'
                      onSearch={setStaffSearch}
                      style={{ minWidth: isMobile ? "100%" : 260, flex: 1 }}
                    />
                    <Button
                      type='primary'
                      icon={<Plus size={16} />}
                      onClick={openCreateStaff}
                      style={{ borderRadius: 12 }}
                      block={isMobile}
                    >
                      Tambah Tendik
                    </Button>
                  </Flex>
                  <MotionDiv
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Table
                      rowKey='id'
                      size={isMobile ? "small" : "middle"}
                      columns={staffColumns}
                      dataSource={staffList}
                      loading={staffQuery.isFetching}
                      pagination={false}
                      scroll={{ x: 640 }}
                    />
                  </MotionDiv>
                </Flex>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingStaff ? "Edit Tendik" : "Tambah Tendik"}
        open={staffModalOpen}
        onCancel={() => {
          setStaffModalOpen(false);
          setEditingStaff(null);
          staffForm.resetFields();
        }}
        onOk={staffForm.submit}
        okText={editingStaff ? "Simpan" : "Tambah"}
        cancelText='Batal'
        confirmLoading={addStaffState.isLoading || updateStaffState.isLoading}
        destroyOnClose
        centered
      >
        <Form
          form={staffForm}
          layout='vertical'
          onFinish={handleSubmitStaff}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name='full_name'
            label='Nama Lengkap'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input placeholder='Nama tendik' />
          </Form.Item>
          <Form.Item name='nip' label='NIP / NIK'>
            <Input placeholder='Opsional' />
          </Form.Item>
          <Form.Item name='phone' label='Telepon'>
            <Input placeholder='Opsional' />
          </Form.Item>
          <Form.Item name='email' label='Email'>
            <Input placeholder='Opsional' />
          </Form.Item>
          <Form.Item name='notes' label='Catatan'>
            <TextArea rows={2} placeholder='Opsional' />
          </Form.Item>
          <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAssignment ? "Edit Assignment" : "Tambah Assignment"}
        open={assignmentModalOpen}
        onCancel={() => {
          setAssignmentModalOpen(false);
          setEditingAssignment(null);
          assignmentForm.resetFields();
        }}
        onOk={assignmentForm.submit}
        okText={editingAssignment ? "Simpan" : "Tambah"}
        cancelText='Batal'
        confirmLoading={
          addAssignmentState.isLoading || updateAssignmentState.isLoading
        }
        destroyOnClose
        centered
        width={isMobile ? "calc(100vw - 24px)" : 560}
      >
        <Form
          form={assignmentForm}
          layout='vertical'
          onFinish={handleSubmitAssignment}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name='person_type'
            label='Tipe Personel'
            rules={[{ required: true, message: "Tipe wajib dipilih" }]}
          >
            <Select
              options={[
                { value: "teacher", label: "Guru" },
                { value: "staff", label: "Tendik" },
              ]}
              onChange={() => {
                assignmentForm.setFieldsValue({
                  teacher_id: undefined,
                  staff_id: undefined,
                });
              }}
              virtual={false}
            />
          </Form.Item>

          {personTypeWatch === "staff" ? (
            <Form.Item
              name='staff_id'
              label='Tendik'
              rules={[{ required: true, message: "Tendik wajib dipilih" }]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                placeholder='Pilih tendik'
                options={peopleStaff.map((item) => ({
                  value: item.id,
                  label: item.nip
                    ? `${item.full_name} (${item.nip})`
                    : item.full_name,
                }))}
                notFoundContent={
                  <Text type='secondary'>
                    Belum ada tendik. Tambah di sub-tab Tendik.
                  </Text>
                }
                virtual={false}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name='teacher_id'
              label='Guru'
              rules={[{ required: true, message: "Guru wajib dipilih" }]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                placeholder='Pilih guru'
                options={teachers.map((item) => ({
                  value: item.id,
                  label: item.nip
                    ? `${item.full_name} (${item.nip})`
                    : item.full_name,
                }))}
                virtual={false}
              />
            </Form.Item>
          )}

          <Form.Item
            name='position_id'
            label='Jabatan'
            rules={[{ required: true, message: "Jabatan wajib dipilih" }]}
          >
            <Select
              showSearch
              optionFilterProp='label'
              placeholder='Pilih jabatan'
              options={positionOptions}
              virtual={false}
            />
          </Form.Item>

          {personTypeWatch !== "staff" ? (
            <Form.Item
              name='duty_ids'
              label='Tugas tambahan'
              extra='Opsional. Insentif mengikuti master tugas tambahan.'
            >
              <Select
                mode='multiple'
                virtual={false}
                allowClear
                showSearch
                optionFilterProp='label'
                placeholder='Pilih tugas tambahan'
                options={dutyOptions.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${currencyFormatter.format(Number(item.amount || 0))}`,
                }))}
                notFoundContent={
                  <Text type='secondary'>
                    Belum ada tugas. Buat dulu di tab Tugas Tambahan.
                  </Text>
                }
              />
            </Form.Item>
          ) : null}

          <Form.List name='eskul_items'>
            {(fields, { add, remove }) => (
              <Flex vertical gap={8}>
                <Flex justify='space-between' align='center'>
                  <Text strong>Eskul</Text>
                  <Button type='link' onClick={() => add({ quantity: 0 })} disabled={eskulOptions.length === 0}>
                    Tambah eskul
                  </Button>
                </Flex>
                {fields.map((field) => (
                  <Flex key={field.key} gap={8} align='start'>
                    <Form.Item
                      name={[field.name, "rate_item_id"]}
                      rules={[{ required: true, message: "Eskul wajib dipilih" }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select
                        virtual={false}
                        showSearch
                        optionFilterProp='label'
                        placeholder='Pilih eskul'
                        options={eskulOptions.map((item) => ({
                          value: item.id,
                          label: `${item.name} · ${currencyFormatter.format(Number(item.amount || 0))}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "quantity"]}
                      rules={[{ required: true, message: "Kehadiran wajib diisi" }]}
                      style={{ width: 110, marginBottom: 0 }}
                    >
                      <InputNumber min={0} placeholder='Hadir' style={{ width: "100%" }} />
                    </Form.Item>
                    <Button type='text' danger onClick={() => remove(field.name)}>
                      Hapus
                    </Button>
                  </Flex>
                ))}
                {eskulOptions.length === 0 ? (
                  <Text type='secondary'>Belum ada eskul. Buat dulu di tab Eskul.</Text>
                ) : null}
              </Flex>
            )}
          </Form.List>

          <Form.Item
            name='valid_range'
            label='Masa berlaku (opsional)'
            extra='Kosongkan jika berlaku tanpa batas'
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name='notes' label='Catatan'>
            <TextArea rows={2} placeholder='Opsional' />
          </Form.Item>

          <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
};

export default HonorariumPersonnelPanel;
