import { Button, Dropdown, Modal, Space, Table, Tag, Typography } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import {
  chargeStatusColorMap,
  chargeStatusLabelMap,
  currencyFormatter,
} from "../constants";
import OthersInstallmentHistory from "./OthersInstallmentHistory";

const { Text } = Typography;

const OthersChargesTable = ({
  charges,
  loading,
  onDeleteCharge,
  isDeletingCharge,
}) => {
  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.student_name}</Text>
          <Text
            type='secondary'
            style={{ whiteSpace: "normal", wordBreak: "break-word" }}
          >
            {`${record.nis || "-"} | ${record.class_name || "-"} | ${record.periode_name || "-"}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Jenis Biaya / Tagihan",
      key: "type_name",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.type_name || "-"}</Text>
          <Text type='secondary'>
            {currencyFormatter.format(Number(record.amount_due || 0))}
          </Text>
        </Space>
      ),
    },
    {
      title: "Dibayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      width: 140,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Sisa",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      width: 140,
      render: (value) => currencyFormatter.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => (
        <Tag color={chargeStatusColorMap[value]}>{chargeStatusLabelMap[value]}</Tag>
      ),
    },
    {
      title: "Cicilan",
      dataIndex: "installment_count",
      key: "installment_count",
      width: 120,
      render: (value) => (Number(value || 0) > 0 ? `Ke-${value}` : "-"),
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      render: (_, record) => {
        const hasCharge = Boolean(record.charge_id);
        const menuItems = hasCharge
          ? [
              {
                key: "delete",
                label: "Hapus",
                danger: true,
              },
            ]
          : [];

        const handleMenuClick = ({ key }) => {
          if (key === "delete") {
            Modal.confirm({
              title: "Hapus tagihan ini?",
              okText: "Hapus",
              cancelText: "Batal",
              okButtonProps: { danger: true },
              onOk: () => onDeleteCharge(record.charge_id),
            });
          }
        };

        if (!hasCharge) {
          return "-";
        }

        return (
          <Dropdown.Button
            type='primary'
            icon={<MoreOutlined />}
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            onClick={() => handleMenuClick({ key: "delete" })}
            loading={isDeletingCharge}
          >
            Pilih Aksi
          </Dropdown.Button>
        );
      },
    },
  ];

  return (
    <Table
      rowKey={(record) =>
        record.charge_id ||
        `${record.periode_id}-${record.student_id}-${record.type_id}`
      }
      columns={columns}
      dataSource={charges}
      loading={loading}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 1280 }}
      expandable={{
        expandedRowRender: (record) => (
          <OthersInstallmentHistory charge={record} />
        ),
        rowExpandable: (record) => Boolean(record.charge_id),
      }}
      locale={{ emptyText: "Belum ada tagihan pembayaran lainnya." }}
    />
  );
};

export default OthersChargesTable;
