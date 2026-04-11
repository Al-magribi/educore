import { memo } from "react";
import { Card, Col, Input, Row, Select, Typography } from "antd";
import { Search } from "lucide-react";

import { cardStyle } from "../constants";

const { Text } = Typography;

const SavingFilters = ({
  filters,
  setFilters,
  access,
  classOptions,
  studentOptions,
}) => (
  <Card style={cardStyle}>
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Kelas</Text>
        <Select
          value={filters.class_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              class_id: value,
              student_id: undefined,
            }))
          }
          options={classOptions}
          placeholder='Semua kelas'
          style={{ width: "100%", marginTop: 8 }}
          disabled={!access?.can_manage_all_classes}
          virtual={false}
        />
      </Col>

      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Siswa</Text>
        <Select
          value={filters.student_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              student_id: value,
            }))
          }
          options={studentOptions}
          placeholder='Semua siswa'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>

      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Jenis Transaksi</Text>
        <Select
          value={filters.transaction_type}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              transaction_type: value || undefined,
            }))
          }
          options={[
            { value: "deposit", label: "Setoran" },
            { value: "withdrawal", label: "Penarikan" },
          ]}
          placeholder='Semua transaksi'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          virtual={false}
        />
      </Col>

      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Cari</Text>
        <Input
          value={filters.search}
          onChange={(event) =>
            setFilters((previous) => ({
              ...previous,
              search: event.target.value,
            }))
          }
          placeholder='Nama siswa, NIS, atau kelas'
          prefix={<Search size={14} />}
          style={{ marginTop: 8 }}
        />
      </Col>
    </Row>
  </Card>
);

export default memo(SavingFilters);
