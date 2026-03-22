import { Card, Col, Row, Select, Tag, Typography } from "antd";

import { cardStyle } from "../constants";

const { Text } = Typography;

const renderPeriodeOption = (option) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    <span>{option.data.label}</span>
    <Tag color={option.data.is_active ? "green" : "red"}>
      {option.data.is_active ? "Aktif" : "Nonaktif"}
    </Tag>
  </div>
);

const MonthlyFilters = ({
  filters,
  setFilters,
  periodes,
  grades,
  classes,
  students,
  months,
}) => (
  <Card style={cardStyle}>
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Periode</Text>
        <Select
          value={filters.periode_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              periode_id: value,
              grade_id: undefined,
              class_id: undefined,
              student_id: undefined,
            }))
          }
          options={periodes.map((item) => ({
            value: item.id,
            label: item.name,
            is_active: item.is_active,
          }))}
          placeholder='Pilih periode'
          style={{ width: "100%", marginTop: 8 }}
          showSearch
          optionFilterProp='label'
          virtual={false}
          optionRender={renderPeriodeOption}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Tingkat</Text>
        <Select
          value={filters.grade_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              grade_id: value,
              class_id: undefined,
              student_id: undefined,
            }))
          }
          options={grades.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder='Semua tingkat'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
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
          options={classes.map((item) => ({
            value: item.id,
            label: `${item.name} (${item.grade_name})`,
          }))}
          placeholder='Semua kelas'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Bulan</Text>
        <Select
          value={filters.bill_month}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              bill_month: value,
            }))
          }
          options={months.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
          placeholder='Pilih bulan'
          style={{ width: "100%", marginTop: 8 }}
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24}>
        <Text type='secondary'>Siswa</Text>
        <Select
          value={filters.student_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              student_id: value,
            }))
          }
          options={students.map((item) => ({
            value: item.id,
            label: `${item.full_name}${item.nis ? ` (${item.nis})` : ""}`,
          }))}
          placeholder='Semua siswa'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
    </Row>
  </Card>
);

export default MonthlyFilters;
