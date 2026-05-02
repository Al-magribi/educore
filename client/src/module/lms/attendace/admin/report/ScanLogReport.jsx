import { useState } from "react";
import dayjs from "dayjs";
import {
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Select,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { AlertTriangle, ClipboardX, ScanLine } from "lucide-react";
import {
  useGetAttendanceScanLogReportQuery,
  useGetRfidDevicesQuery,
} from "../../../../../service/lms/ApiAttendance";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const surfaceCardStyle = {
  borderRadius: 22,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid #e2ebf5",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const ScanLogReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [deviceId, setDeviceId] = useState();
  const [resultStatus, setResultStatus] = useState();
  const [onlyFailed, setOnlyFailed] = useState(true);

  const { data: devicesRes } = useGetRfidDevicesQuery();
  const { data, isLoading, isFetching } = useGetAttendanceScanLogReportQuery({
    startDate: range?.[0]?.format("YYYY-MM-DD"),
    endDate: range?.[1]?.format("YYYY-MM-DD"),
    deviceId,
    resultStatus,
    onlyFailed,
  });

  const rows = data?.data?.rows || [];
  const summary = data?.data?.summary || {};
  const deviceOptions = (devicesRes?.data || []).map((item) => ({
    label: `${item.code} - ${item.name}`,
    value: Number(item.id),
  }));

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <div>
            <Text strong style={{ color: "#0f172a", fontSize: 16 }}>
              Laporan Scan RFID
            </Text>
            <div>
              <Text type='secondary'>
                Pantau scan gagal, duplikat, token salah, dan kasus operasional device.
              </Text>
            </div>
          </div>

          <Flex gap={12} wrap='wrap'>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format='YYYY-MM-DD'
              style={{ minWidth: isMobile ? "100%" : 280 }}
            />
            <Select
              allowClear
              value={deviceId}
              onChange={setDeviceId}
              options={deviceOptions}
              placeholder='Filter device'
              showSearch
              optionFilterProp='label'
              virtual={false}
              style={{ minWidth: isMobile ? "100%" : 280 }}
            />
            <Select
              allowClear
              value={resultStatus}
              onChange={setResultStatus}
              placeholder='Filter result status'
              virtual={false}
              style={{ minWidth: isMobile ? "100%" : 220 }}
              options={[
                { value: "accepted", label: "accepted" },
                { value: "duplicate", label: "duplicate" },
                { value: "rejected", label: "rejected" },
                { value: "out_of_window", label: "out_of_window" },
                { value: "card_inactive", label: "card_inactive" },
                { value: "device_inactive", label: "device_inactive" },
                { value: "user_inactive", label: "user_inactive" },
                { value: "policy_missing", label: "policy_missing" },
                { value: "not_scheduled", label: "not_scheduled" },
              ]}
            />
            <Flex align='center' gap={8}>
              <Switch checked={onlyFailed} onChange={setOnlyFailed} />
              <Text type='secondary'>Hanya gagal</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap='wrap'>
        <Card bordered={false} style={{ ...statCardStyle, flex: "1 1 220px" }}>
          <Flex justify='space-between' align='start'>
            <Statistic title='Total Log' value={Number(summary.total_records || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                color: "#1d4ed8",
              }}
            >
              <ScanLine size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: "1 1 220px" }}>
          <Flex justify='space-between' align='start'>
            <Statistic title='Accepted' value={Number(summary.accepted_count || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "#f0fdf4",
                color: "#166534",
              }}
            >
              <ClipboardX size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: "1 1 220px" }}>
          <Flex justify='space-between' align='start'>
            <Statistic
              title='Butuh Tindak Lanjut'
              value={
                Number(summary.rejected_count || 0) +
                Number(summary.out_of_window_count || 0) +
                Number(summary.device_inactive_count || 0) +
                Number(summary.card_inactive_count || 0) +
                Number(summary.user_inactive_count || 0) +
                Number(summary.policy_missing_count || 0)
              }
            />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              <AlertTriangle size={18} />
            </span>
          </Flex>
        </Card>
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description='Belum ada log scan pada rentang ini.' />
        ) : (
          <Table
            rowKey='id'
            loading={isLoading || isFetching}
            dataSource={rows}
            scroll={{ x: 980 }}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Waktu Scan", dataIndex: "scanned_at", width: 180 },
              {
                title: "Device",
                width: 220,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong>{row.device_name || "-"}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {row.device_code || "-"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "User",
                width: 220,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong>{row.user_name || "-"}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      UID {row.card_uid || "-"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Source",
                dataIndex: "scan_source",
                width: 120,
                render: (value) => <Tag>{value || "-"}</Tag>,
              },
              {
                title: "Action",
                dataIndex: "scan_action",
                width: 170,
                render: (value) => <Tag color='blue'>{value || "-"}</Tag>,
              },
              {
                title: "Result",
                dataIndex: "result_status",
                width: 160,
                render: (value) => {
                  const colorMap = {
                    accepted: "green",
                    duplicate: "gold",
                    rejected: "red",
                    out_of_window: "volcano",
                    card_inactive: "orange",
                    device_inactive: "orange",
                    user_inactive: "magenta",
                    policy_missing: "purple",
                    not_scheduled: "blue",
                  };
                  return <Tag color={colorMap[value] || "default"}>{value}</Tag>;
                },
              },
              {
                title: "Alasan",
                dataIndex: "rejection_reason",
                width: 280,
                render: (value) => value || "-",
              },
            ]}
          />
        )}
      </Card>
    </Flex>
  );
};

export default ScanLogReport;
