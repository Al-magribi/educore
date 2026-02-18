import React, { useMemo } from "react";
import { BookText, Hammer } from "lucide-react";
import { Card, InputNumber, Space, Table, Typography } from "antd";

const { Text } = Typography;

const StudentGradingTableSumatif = ({
  students,
  isMobile,
  isFilterReady,
  onSummativeChange,
  subchapters = [],
}) => {
  const normalizedSubchapters = useMemo(() => {
    const base = Array.isArray(subchapters) ? subchapters : [];
    const derivedKeys = new Set();
    (students || []).forEach((student) => {
      const scores = student?.summativeScores || {};
      Object.keys(scores).forEach((key) => {
        if (key === "__new") return;
        derivedKeys.add(String(key));
      });
    });
    const derived = Array.from(derivedKeys)
      .sort((a, b) => {
        const aNum = Number(a);
        const bNum = Number(b);
        const aValid = Number.isFinite(aNum) && aNum > 0;
        const bValid = Number.isFinite(bNum) && bNum > 0;
        if (aValid && bValid) return aNum - bNum;
        if (aValid) return -1;
        if (bValid) return 1;
        return a.localeCompare(b);
      })
      .map((key, index) => {
        const numericKey = Number(key);
        const labelIndex =
          Number.isFinite(numericKey) && numericKey > 0
            ? numericKey
            : index + 1;
        return {
          id: key,
          scoreKey: key,
          labelIndex,
          title: `Nilai ${labelIndex}`,
        };
      });
    const merged = [...base];
    const existingKeys = new Set(
      base.map((item) =>
        String(item?.scoreKey ?? item?.id ?? item?.key ?? item?.value),
      ),
    );
    derived.forEach((item) => {
      const itemKey = String(item.scoreKey);
      if (!existingKeys.has(itemKey)) {
        merged.push(item);
        existingKeys.add(itemKey);
      }
    });
    return merged;
  }, [subchapters, students]);

  const getScoreKey = (sub) =>
    sub?.scoreKey ?? sub?.id ?? sub?.key ?? sub?.value;

  const getSubTitle = (sub) =>
    sub?.title || `Nilai ${sub?.labelIndex ?? sub?.id ?? "-"}`;

  const getScoreObject = (record, scoreKey) =>
    record?.summativeScores?.[scoreKey] || {};

  const renderDualInput = (record, index, subchapter) => {
    const scoreKey = getScoreKey(subchapter);
    const scoreObj = getScoreObject(record, scoreKey);
    return (
      <Space vertical size={6} style={{ width: "100%" }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <BookText size={13} style={{ marginRight: 4 }} />
            Tulis
          </Text>
          <InputNumber
            min={0}
            max={100}
            step={1}
            precision={0}
            size={isMobile ? "small" : "middle"}
            style={{ width: "100%" }}
            value={scoreObj.score_written ?? 0}
            disabled={!isFilterReady}
            onChange={(val) =>
              onSummativeChange(index, scoreKey, "score_written", val)
            }
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Hammer size={13} style={{ marginRight: 4 }} />
            Praktik
          </Text>
          <InputNumber
            min={0}
            max={100}
            step={1}
            precision={0}
            size={isMobile ? "small" : "middle"}
            style={{ width: "100%" }}
            value={scoreObj.score_skill ?? 0}
            disabled={!isFilterReady}
            onChange={(val) =>
              onSummativeChange(index, scoreKey, "score_skill", val)
            }
          />
        </div>
      </Space>
    );
  };

  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: "14%",
      render: (value) => <Text>{value || "-"}</Text>,
      responsive: ["md"],
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      key: "name",
      width: "22%",
      render: (value) => <Text strong>{value}</Text>,
      responsive: ["md"],
    },
    {
      title: "Siswa",
      key: "student",
      responsive: ["xs"],
      render: (_, record) => (
        <Space vertical size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nis || "-"}
          </Text>
        </Space>
      ),
    },
    ...normalizedSubchapters.map((sub) => {
      const scoreKey = getScoreKey(sub);
      return {
        title: getSubTitle(sub),
        key: `sub_${scoreKey}`,
        width: "20%",
        render: (_, record, index) => renderDualInput(record, index, sub),
      };
    }),
  ];

  if (isFilterReady) {
    columns.push({
      title: "Input Nilai",
      key: "sub_new",
      width: "20%",
      render: (_, record, index) =>
        renderDualInput(record, index, {
          scoreKey: "__new",
          title: "Input Nilai",
        }),
    });
  }

  const renderMobileCard = (student, index) => (
    <Card
      key={student.id}
      size="small"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 12 } }}
    >
      <Space vertical size={8} style={{ width: "100%" }}>
        <div>
          <Text strong>{student.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {student.nis || "-"}
            </Text>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {normalizedSubchapters.map((sub) => (
            <div key={`sub_mobile_${getScoreKey(sub)}`}>
              <Text type="secondary">{getSubTitle(sub)}</Text>
              {renderDualInput(student, index, sub)}
            </div>
          ))}
          {isFilterReady && (
            <div key="sub_mobile_new">
              <Text type="secondary">Input Nilai</Text>
              {renderDualInput(student, index, { scoreKey: "__new" })}
            </div>
          )}
        </div>
      </Space>
    </Card>
  );

  return isMobile ? (
    <Space vertical size={12} style={{ width: "100%" }}>
      {(students || []).map((student, index) =>
        renderMobileCard(student, index),
      )}
    </Space>
  ) : (
    <Table
      dataSource={students}
      columns={columns}
      rowKey={(record) => record.id}
      pagination={false}
      size="middle"
      tableLayout="fixed"
      scroll={normalizedSubchapters.length > 2 ? { x: 980 } : undefined}
      locale={{ emptyText: "Belum ada siswa di kelas ini." }}
    />
  );
};

export default StudentGradingTableSumatif;
