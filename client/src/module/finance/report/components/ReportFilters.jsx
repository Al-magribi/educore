import {
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Grid,
  Row,
  Select,
} from "antd";
import dayjs from "dayjs";
import { Filter, RotateCcw } from "lucide-react";

import { MODE_OPTIONS, cardStyle } from "../constants";

const ReportFilters = ({
  options,
  filters,
  onChange,
  onApply,
  loading = false,
}) => {
  const screens = Grid.useBreakpoint();
  const isCompact = !screens.lg;
  const periodes = options?.periodes || [];
  const months = options?.months || [];

  return (
    <Card style={cardStyle} styles={{ body: { padding: isCompact ? 16 : 20 } }}>
      <Form layout='vertical' onFinish={onApply}>
        <Row gutter={[12, 8]} align='bottom'>
          <Col xs={24} md={8} xl={6}>
            <Form.Item label='Mode laporan' style={{ marginBottom: 0 }}>
              <Select
                value={filters.mode}
                options={MODE_OPTIONS}
                onChange={(value) => onChange({ mode: value })}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8} xl={6}>
            <Form.Item label='Periode' style={{ marginBottom: 0 }}>
              <Select
                value={filters.periode_id}
                placeholder='Pilih periode'
                options={periodes.map((item) => ({
                  value: item.id,
                  label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
                }))}
                onChange={(value) => onChange({ periode_id: value })}
                showSearch
                optionFilterProp='label'
              />
            </Form.Item>
          </Col>

          {filters.mode === "bulan" ? (
            <Col xs={24} md={8} xl={6}>
              <Form.Item label='Bulan' style={{ marginBottom: 0 }}>
                <Select
                  value={filters.month}
                  placeholder='Pilih bulan'
                  options={months.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={(value) => onChange({ month: value })}
                />
              </Form.Item>
            </Col>
          ) : null}

          {filters.mode === "rentang" ? (
            <Col xs={24} md={12} xl={8}>
              <Form.Item label='Rentang tanggal' style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker
                  style={{ width: "100%" }}
                  value={
                    filters.date_from && filters.date_to
                      ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                      : null
                  }
                  onChange={(values) => {
                    onChange({
                      date_from: values?.[0]
                        ? values[0].format("YYYY-MM-DD")
                        : undefined,
                      date_to: values?.[1]
                        ? values[1].format("YYYY-MM-DD")
                        : undefined,
                    });
                  }}
                  format='DD/MM/YYYY'
                />
              </Form.Item>
            </Col>
          ) : null}

          <Col xs={24} md={filters.mode === "rentang" ? 12 : 8} xl={6}>
            <Flex justify={isCompact ? "stretch" : "flex-end"} gap={8}>
              <Button
                icon={<RotateCcw size={14} />}
                onClick={() =>
                  onChange({
                    mode: "bulan",
                    periode_id: options?.default_periode_id,
                    month: options?.default_month,
                    date_from: undefined,
                    date_to: undefined,
                  })
                }
              >
                Reset
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                icon={<Filter size={14} />}
                loading={loading}
                block={isCompact}
              >
                Terapkan
              </Button>
            </Flex>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default ReportFilters;
