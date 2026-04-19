import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { RefreshCcw } from "lucide-react";
import { useGetTeacherDutyBootstrapQuery } from "../../../service/lms/ApiDuty";
import TeacherDutyWorkspace from "./TeacherDutyWorkspace";

const { Text, Title } = Typography;

const TeacherDutyView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const dateValue = selectedDate.format("YYYY-MM-DD");

  const firstQuery = useGetTeacherDutyBootstrapQuery({
    date: dateValue,
  });
  const firstPayload = firstQuery.data?.data || {};
  const assignedDates = useMemo(
    () => firstPayload.assigned_dates || [],
    [firstPayload.assigned_dates],
  );

  const assignmentDatesSet = useMemo(
    () =>
      new Set(
        assignedDates.map(
          (item) => item.date_key || dayjs(item.date).format("YYYY-MM-DD"),
        ),
      ),
    [assignedDates],
  );

  const fallbackDateValue =
    !firstPayload.assigned && assignedDates.length
      ? dayjs(assignedDates[0].date).format("YYYY-MM-DD")
      : null;

  const fallbackQuery = useGetTeacherDutyBootstrapQuery(
    { date: fallbackDateValue },
    { skip: !fallbackDateValue },
  );

  const data = fallbackDateValue ? fallbackQuery.data : firstQuery.data;
  const isLoading = fallbackDateValue
    ? fallbackQuery.isLoading
    : firstQuery.isLoading;
  const isFetching = fallbackDateValue
    ? fallbackQuery.isFetching
    : firstQuery.isFetching;
  const refetch = fallbackDateValue ? fallbackQuery.refetch : firstQuery.refetch;
  const payload = data?.data || firstPayload;

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
      <Flex vertical gap={20}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Halaman Piket Guru
            </Title>
            <Text type="secondary">
              Isi laporan hanya untuk tanggal yang memang ditugaskan ke Anda.
            </Text>
          </div>

          <Space wrap>
            <DatePicker
              value={selectedDate}
              onChange={(value) => setSelectedDate(value || dayjs())}
              allowClear={false}
              format="DD MMM YYYY"
            />
            <Button
              icon={<RefreshCcw size={14} />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Muat Ulang
            </Button>
          </Space>
        </Flex>

        <Space wrap style={{ marginTop: 16 }}>
          {assignedDates.length === 0 ? (
            <Tag color="default">Belum ada penugasan piket</Tag>
          ) : (
            assignedDates.map((item) => (
              <Tag
                key={item.id}
                color={
                  (item.date_key || dayjs(item.date).format("YYYY-MM-DD")) ===
                  dateValue
                    ? "blue"
                    : "default"
                }
              >
                {dayjs(item.date).format("DD MMM YYYY")} • {item.status}
              </Tag>
            ))
          )}
        </Space>

        {!payload.assigned ? (
          <Alert
            showIcon
            type="warning"
            title="Tidak ada penugasan piket pada tanggal ini."
            description={
              assignmentDatesSet.size
                ? "Pilih tanggal yang termasuk dalam daftar penugasan Anda."
                : "Admin belum menugaskan Anda sebagai guru piket."
            }
          />
        ) : (
          <TeacherDutyWorkspace
            key={`${payload.assignment?.id || "duty"}:${dateValue}`}
            payload={payload}
            dateValue={dateValue}
            onRefresh={refetch}
          />
        )}
      </Flex>
    </Card>
  );
};

export default TeacherDutyView;
