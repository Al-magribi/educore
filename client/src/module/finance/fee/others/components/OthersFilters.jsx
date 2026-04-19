import { Button, Card, Col, Flex, Input, Row, Select, Tag, Typography } from "antd";
import { FilterOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

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
  students,
  types,
}) => {
  const fieldStyle = { width: "100%", marginTop: 8 };

  return (
    <Card
      style={cardStyle}
      styles={{
        body: {
          padding: 20,
        },
      }}
    >
      <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
        <Flex align='center' gap={10}>
          <FilterOutlined style={{ color: "#2563eb" }} />
          <div>
            <Text strong style={{ color: "#0f172a", display: "block" }}>
              Filter Pembayaran Lainnya
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>
              Saring data tagihan berdasarkan satuan, periode, siswa, jenis biaya, dan status.
            </Text>
          </div>
        </Flex>

        <Button
          icon={<ReloadOutlined />}
          onClick={() =>
            setFilters((previous) => ({
              ...previous,
              grade_id: undefined,
              class_id: undefined,
              student_id: undefined,
              student_search: "",
              type_id: undefined,
              status: undefined,
            }))
          }
        >
          Reset Filter
        </Button>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginTop: 18 }}>
      {homebases.length > 1 ? (
        <Col xs={24} md={12} xl={6}>
          <Text type='secondary'>Satuan</Text>
          <Select
            size='large'
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
            style={fieldStyle}
            showSearch
            optionFilterProp='label'
            virtual={false}
          />
        </Col>
      ) : null}
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Periode</Text>
        <Select
          size='large'
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
          style={fieldStyle}
          optionRender={renderPeriodeOption}
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Tingkat</Text>
        <Select
          size='large'
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
          style={fieldStyle}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Kelas</Text>
        <Select
          size='large'
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
          style={fieldStyle}
          allowClear
          disabled={classes.length === 0}
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Jenis Biaya</Text>
        <Select
          size='large'
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
          style={fieldStyle}
          allowClear
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
      <Col xs={24} md={12} xl={6}>
        <Text type='secondary'>Siswa</Text>
        <Select
          size='large'
          value={filters.student_id}
          onChange={(value) =>
            setFilters((previous) => ({
              ...previous,
              student_id: value,
              student_search: "",
            }))
          }
          options={students.map((item) => ({
            value: item.id,
            label: `${item.full_name} (${item.nis || "-"}) - ${item.class_name || "-"}`,
          }))}
          placeholder='Semua siswa'
          style={fieldStyle}
          allowClear
          disabled={students.length === 0}
          showSearch
          optionFilterProp='label'
          virtual={false}
        />
      </Col>
        <Col xs={24} md={12} xl={6}>
          <Text type='secondary'>Pencarian Cepat</Text>
          <Input.Search
            size='large'
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
            style={fieldStyle}
            allowClear
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Text type='secondary'>Status</Text>
          <Select
            size='large'
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
            style={fieldStyle}
            allowClear
            virtual={false}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default OthersFilters;
