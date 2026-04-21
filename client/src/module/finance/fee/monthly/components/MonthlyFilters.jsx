import { Card, Col, Input, Row, Select, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Filter, Search } from "lucide-react";

import { cardStyle } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

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
    <Tag
      color={option.data.is_active ? "green" : "red"}
      style={{ borderRadius: 999, fontWeight: 600 }}
    >
      {option.data.is_active ? "Aktif" : "Nonaktif"}
    </Tag>
  </div>
);

const MonthlyFilters = ({
  filters,
  setFilters,
  homebases,
  periodes,
  grades,
  classes,
  months,
}) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      style={{
        ...cardStyle,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
      styles={{ body: { padding: 20 } }}
    >
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Space align='center' size={10}>
          <span
            style={{
              width: 40,
              height: 40,
              display: "grid",
              placeItems: "center",
              borderRadius: 14,
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
              color: "#2563eb",
            }}
          >
            <Filter size={18} />
          </span>
          <div>
            <Text strong style={{ display: "block", color: "#0f172a" }}>
              Filter Pembayaran SPP
            </Text>
            <Text type='secondary'>
              Persempit data berdasarkan satuan, periode, tingkat, kelas, bulan,
              dan pencarian siswa.
            </Text>
          </div>
        </Space>

        <Row gutter={[12, 12]}>
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
                  }))
                }
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                placeholder='Pilih satuan'
                style={{ width: "100%", marginTop: 8 }}
                showSearch={{ optionFilterProp: "label" }}
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
              style={{ width: "100%", marginTop: 8 }}
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
              optionRender={renderPeriodeOption}
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
              style={{ width: "100%", marginTop: 8 }}
              allowClear
              showSearch={{ optionFilterProp: "label" }}
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
              style={{ width: "100%", marginTop: 8 }}
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Text type='secondary'>Bulan</Text>
            <Select
              size='large'
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
              showSearch={{ optionFilterProp: "label" }}
              virtual={false}
            />
          </Col>
          <Col xs={24} md={12} xl={18}>
            <Text type='secondary'>Siswa</Text>
            <Input.Search
              size='large'
              prefix={<Search size={16} color='rgba(0,0,0,.25)' />}
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
        </Row>
      </Space>
    </Card>
  </MotionDiv>
);

export default MonthlyFilters;
