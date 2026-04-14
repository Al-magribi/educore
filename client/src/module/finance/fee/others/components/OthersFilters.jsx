import { Card, Col, Input, Row, Select, Tag, Typography } from "antd";

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

const OthersFilters = ({
  filters,
  setFilters,
  homebases,
  periodes,
  grades,
  classes,
  types,
}) => (
  <Card style={cardStyle}>
    <Row gutter={[12, 12]}>
      {homebases.length > 1 ? (
        <Col xs={24} md={12} xl={6}>
          <Text type='secondary'>Satuan</Text>
          <Select
            value={filters.homebase_id}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                homebase_id: value,
                periode_id: undefined,
                grade_id: undefined,
                class_id: undefined,
                student_id: undefined,
                student_search: "",
                type_id: undefined,
                status: undefined,
              }))
            }
            options={homebases.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            placeholder='Pilih satuan'
            style={{ width: "100%", marginTop: 8 }}
            showSearch
            optionFilterProp='label'
            virtual={false}
          />
        </Col>
      ) : null}
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
              student_search: "",
            }))
          }
          options={periodes.map((item) => ({
            value: item.id,
            label: item.name,
            is_active: item.is_active,
          }))}
          placeholder='Pilih periode'
          style={{ width: "100%", marginTop: 8 }}
          optionRender={renderPeriodeOption}
          showSearch
          optionFilterProp='label'
          virtual={false}
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
              student_search: "",
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
              student_search: "",
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
        <Text type='secondary'>Jenis Biaya</Text>
        <Select
          value={filters.type_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              type_id: value,
            }))
          }
          options={types.map((item) => ({
            value: item.type_id,
            label: item.name,
          }))}
          placeholder='Semua jenis biaya'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12}>
        <Text type='secondary'>Siswa</Text>
        <Input.Search
          value={filters.student_search}
          onChange={(event) =>
            setFilters((previous) => ({
              ...previous,
              student_id: undefined,
              student_search: event.target.value,
            }))
          }
          onSearch={(value) =>
            setFilters((previous) => ({
              ...previous,
              student_id: undefined,
              student_search: value,
            }))
          }
          placeholder='Cari berdasarkan nama atau NIS'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
        />
      </Col>
      <Col xs={24} md={12}>
        <Text type='secondary'>Status</Text>
        <Select
          value={filters.status}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              status: value,
            }))
          }
          options={[
            { value: "unpaid", label: "Belum Bayar" },
            { value: "partial", label: "Cicilan" },
            { value: "paid", label: "Lunas" },
          ]}
          placeholder='Semua status'
          style={{ width: "100%", marginTop: 8 }}
          allowClear
          virtual={false}
        />
      </Col>
    </Row>
  </Card>
);

export default OthersFilters;
