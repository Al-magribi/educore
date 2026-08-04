import { useMemo, useState } from "react";
import { Card, Input, Select, Space, Table, Tag } from "antd";

import {
  cardStyle,
  currencyFormatter,
  statusColorMap,
  statusLabelMap,
} from "../constants";

const ReportUnpaidTable = ({ rows = [] }) => {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!needle) return true;
      return (
        String(row.student_name || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.nis || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.class_name || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.type_name || "")
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [category, rows, search]);

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {row.nis || "-"} · {row.class_name || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Kategori",
      dataIndex: "category_label",
      key: "category_label",
      width: 110,
      render: (value, row) => (
        <Tag color={row.category === "spp" ? "geekblue" : "purple"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Jenis / Bulan",
      key: "detail",
      render: (_, row) => (
        <div>
          <div>{row.type_name}</div>
          {row.category === "spp" ? (
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.billing_period_label}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Tagihan",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Terbayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Sisa",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: 600, color: "#b45309" }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => (
        <Tag color={statusColorMap[value] || "default"}>
          {statusLabelMap[value] || value}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title='Siswa Belum Lunas'
      extra={<Tag color='orange'>{filteredRows.length} baris</Tag>}
      style={cardStyle}
      styles={{ body: { paddingTop: 12 } }}
    >
      <Space wrap style={{ marginBottom: 14 }}>
        <Select
          value={category}
          style={{ minWidth: 160 }}
          onChange={setCategory}
          options={[
            { value: "all", label: "Semua kategori" },
            { value: "spp", label: "SPP" },
            { value: "other", label: "Pembayaran lainnya" },
          ]}
        />
        <Input.Search
          allowClear
          placeholder='Cari siswa, NIS, kelas, jenis…'
          style={{ minWidth: 260 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Space>

      <Table
        rowKey='key'
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 960 }}
        size='middle'
      />
    </Card>
  );
};

export default ReportUnpaidTable;
