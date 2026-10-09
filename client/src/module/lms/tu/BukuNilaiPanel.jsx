import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Collapse,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import { shownValue, errorMessage } from "./profileDefaults";
import {
  useAddBukuScoreMutation,
  useDeleteBukuScoreMutation,
  useSaveBukuOverridesMutation,
  useSyncBukuScoresMutation,
} from "../../../service/lms/ApiTu";

const { Text } = Typography;

const groupKey = (row) => `${row.periode_id || 0}-${row.semester}`;

const BukuNilaiPanel = ({ bukuId, detail, meta }) => {
  const [syncScores, { isLoading: isSyncing }] = useSyncBukuScoresMutation();
  const [saveOverrides, { isLoading: isSaving }] = useSaveBukuOverridesMutation();
  const [addScore, { isLoading: isAdding }] = useAddBukuScoreMutation();
  const [deleteScore] = useDeleteBukuScoreMutation();
  const [draftScores, setDraftScores] = useState({});
  const [draftAttendance, setDraftAttendance] = useState({});
  const [draftDecisions, setDraftDecisions] = useState({});
  const [manual, setManual] = useState({
    kind: "ekskul",
    subject_name: "",
    periode_id: undefined,
    semester: 1,
  });

  useEffect(() => {
    const scores = {};
    (detail?.scores || []).forEach((row) => {
      scores[row.id] = {
        score_override: row.score_override,
        predicate_override: row.predicate_override,
      };
    });
    const attendance = {};
    (detail?.attendance || []).forEach((row) => {
      attendance[row.id] = {
        sick_override: row.sick_override,
        permit_override: row.permit_override,
        absent_override: row.absent_override,
      };
    });
    const decisions = {};
    (detail?.decisions || []).forEach((row) => {
      decisions[row.periode_id] = row.decision;
    });
    setDraftScores(scores);
    setDraftAttendance(attendance);
    setDraftDecisions(decisions);
  }, [detail]);

  const groups = useMemo(() => {
    const map = new Map();
    (detail?.scores || [])
      .filter((row) => row.kind === "mapel")
      .forEach((row) => {
        const key = groupKey(row);
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: `${row.periode_name || "Tanpa periode"} · Semester ${row.semester}`,
            periodeId: row.periode_id,
            className: row.class_name,
            homeroom: row.homeroom_name,
            rows: [],
          });
        }
        map.get(key).rows.push(row);
      });
    return Array.from(map.values());
  }, [detail]);

  const extras = (detail?.scores || []).filter((row) => row.kind !== "mapel");

  const updateScore = (id, patch) => {
    setDraftScores((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const handleSync = async () => {
    try {
      const response = await syncScores(bukuId).unwrap();
      message.success(response?.message || "Nilai ditarik dari LMS.");
    } catch (error) {
      message.error(errorMessage(error, "Gagal menarik nilai LMS."));
    }
  };

  const handleSave = async () => {
    try {
      const response = await saveOverrides({
        id: bukuId,
        scores: Object.entries(draftScores).map(([id, value]) => ({
          id: Number(id),
          score_override: value.score_override ?? null,
          predicate_override: value.predicate_override || "",
        })),
        attendance: Object.entries(draftAttendance).map(([id, value]) => ({
          id: Number(id),
          ...value,
        })),
        decisions: Object.entries(draftDecisions).map(([periodeId, decision]) => ({
          periode_id: Number(periodeId),
          decision: decision || "",
        })),
      }).unwrap();
      message.success(response?.message || "Koreksi disimpan.");
    } catch (error) {
      message.error(errorMessage(error, "Gagal menyimpan koreksi."));
    }
  };

  const handleAdd = async () => {
    try {
      const response = await addScore({ id: bukuId, ...manual }).unwrap();
      message.success(response?.message || "Baris ditambahkan.");
      setManual((current) => ({ ...current, subject_name: "" }));
    } catch (error) {
      message.error(errorMessage(error, "Gagal menambah baris nilai."));
    }
  };

  const scoreColumns = [
    { title: "Mata pelajaran", dataIndex: "subject_name" },
    { title: "Kategori", dataIndex: "category_name", width: 140 },
    {
      title: "Nilai LMS",
      width: 100,
      render: (_, row) => shownValue(null, row.score_lms) ?? "-",
    },
    {
      title: "Predikat LMS",
      width: 110,
      render: (_, row) => row.predicate_lms || "-",
    },
    {
      title: "Koreksi",
      width: 120,
      render: (_, row) => (
        <InputNumber
          min={0}
          max={100}
          value={draftScores[row.id]?.score_override}
          onChange={(value) => updateScore(row.id, { score_override: value })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Predikat",
      width: 110,
      render: (_, row) => (
        <Select
          allowClear
          value={draftScores[row.id]?.predicate_override || undefined}
          options={["A", "B", "C", "D"].map((item) => ({ value: item, label: item }))}
          onChange={(value) => updateScore(row.id, { predicate_override: value || "" })}
          style={{ width: "100%" }}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" gap={8} wrap="wrap">
        <Text type="secondary">
          Angka LMS tetap tersimpan. Isi koreksi hanya bila buku induk perlu angka yang berbeda.
        </Text>
        <Space wrap>
          <Popconfirm
            title="Tarik ulang nilai dari LMS?"
            description="Koreksi yang sudah diisi tidak ditimpa."
            onConfirm={handleSync}
          >
            <Button loading={isSyncing}>Tarik dari LMS</Button>
          </Popconfirm>
          <Button type="primary" loading={isSaving} onClick={handleSave}>
            Simpan koreksi
          </Button>
        </Space>
      </Flex>

      {groups.length === 0 ? (
        <Text type="secondary">Belum ada nilai mapel. Tarik dari LMS atau tambahkan baris manual.</Text>
      ) : (
        <Collapse
          items={groups.map((group) => ({
            key: group.key,
            label: `${group.title}${group.className ? ` · ${group.className}` : ""}${group.homeroom ? ` · ${group.homeroom}` : ""}`,
            children: (
              <Flex vertical gap={12}>
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  columns={scoreColumns}
                  dataSource={group.rows}
                  scroll={{ x: 760 }}
                />
                <AttendanceEditor
                  rows={(detail?.attendance || []).filter(
                    (row) => groupKey(row) === group.key,
                  )}
                  draft={draftAttendance}
                  onChange={(id, patch) =>
                    setDraftAttendance((current) => ({
                      ...current,
                      [id]: { ...current[id], ...patch },
                    }))
                  }
                />
                {group.periodeId ? (
                  <Select
                    allowClear
                    placeholder="Ketetapan akhir tahun"
                    value={draftDecisions[group.periodeId]}
                    options={[
                      { value: "naik", label: "Naik tingkat" },
                      { value: "tinggal", label: "Tinggal di tingkat ini" },
                      { value: "lulus", label: "Lulus" },
                    ]}
                    onChange={(value) =>
                      setDraftDecisions((current) => ({
                        ...current,
                        [group.periodeId]: value,
                      }))
                    }
                    style={{ maxWidth: 280 }}
                  />
                ) : null}
              </Flex>
            ),
          }))}
        />
      )}

      <Flex vertical gap={8}>
        <Text strong>Ekstrakurikuler dan ujian akhir</Text>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={extras}
          scroll={{ x: 720 }}
          columns={[
            ...scoreColumns,
            {
              title: "",
              width: 90,
              render: (_, row) =>
                row.subject_id ? null : (
                  <Button
                    danger
                    size="small"
                    onClick={() =>
                      deleteScore({ id: bukuId, scoreId: row.id })
                        .unwrap()
                        .then((response) => message.success(response?.message || "Baris dihapus."))
                        .catch((error) => message.error(errorMessage(error, "Gagal menghapus.")))
                    }
                  >
                    Hapus
                  </Button>
                ),
            },
          ]}
        />
        <Flex gap={8} wrap="wrap">
          <Select
            value={manual.kind}
            options={[
              { value: "ekskul", label: "Ekstrakurikuler" },
              { value: "mapel", label: "Mapel manual" },
              { value: "us", label: "Ujian akhir" },
            ]}
            onChange={(kind) => setManual((current) => ({ ...current, kind }))}
            style={{ width: 160 }}
          />
          <Input
            placeholder="Nama"
            value={manual.subject_name}
            onChange={(event) =>
              setManual((current) => ({ ...current, subject_name: event.target.value }))
            }
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="Periode"
            value={manual.periode_id}
            options={(meta?.periodes || []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(periode_id) => setManual((current) => ({ ...current, periode_id }))}
            style={{ width: 180 }}
          />
          {manual.kind !== "us" ? (
            <Select
              value={manual.semester}
              options={[
                { value: 1, label: "Semester 1" },
                { value: 2, label: "Semester 2" },
              ]}
              onChange={(semester) => setManual((current) => ({ ...current, semester }))}
              style={{ width: 140 }}
            />
          ) : null}
          <Button type="default" loading={isAdding} onClick={handleAdd}>
            Tambah baris
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

const AttendanceEditor = ({ rows, draft, onChange }) => {
  if (!rows.length) return null;
  return (
    <Flex gap={12} wrap="wrap">
      {rows.map((row) => (
        <Space key={row.id} wrap>
          <Text>Sakit</Text>
          <InputNumber
            min={0}
            placeholder={String(row.sick_lms ?? 0)}
            value={draft[row.id]?.sick_override}
            onChange={(value) => onChange(row.id, { sick_override: value })}
          />
          <Text>Izin</Text>
          <InputNumber
            min={0}
            placeholder={String(row.permit_lms ?? 0)}
            value={draft[row.id]?.permit_override}
            onChange={(value) => onChange(row.id, { permit_override: value })}
          />
          <Text>Alpa</Text>
          <InputNumber
            min={0}
            placeholder={String(row.absent_lms ?? 0)}
            value={draft[row.id]?.absent_override}
            onChange={(value) => onChange(row.id, { absent_override: value })}
          />
        </Space>
      ))}
    </Flex>
  );
};

export default BukuNilaiPanel;
