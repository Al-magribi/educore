import { memo } from "react";
import { Card, Col, Grid, Input, Row, Select, Space, Typography } from "antd";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const SavingFilters = ({
  filters,
  setFilters,
  access,
  classOptions,
  studentOptions,
  periodeOptions = [],
  homebaseOptions = [],
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        variant='borderless'
        style={{
          ...cardStyle,
          borderRadius: isMobile ? 18 : undefined,
        }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Space orientation='vertical' size={16} style={{ width: "100%" }}>
          <div>
            <Title
              level={5}
              style={{ margin: 0, fontSize: isMobile ? 15 : undefined }}
            >
              Filter Operasional Tabungan
            </Title>
            <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
              {isMobile
                ? "Persempit data berdasarkan kelas, siswa, jenis, atau pencarian."
                : "Pilih kelas, siswa, jenis transaksi, periode, atau kata kunci untuk mempersempit data. Daftar siswa mengikuti enrollment periode terpilih; semua periode tersedia di tab riwayat."}
            </Text>
          </div>

          <Row gutter={[12, 12]}>
            {access?.can_manage_all_homebases ? (
              <Col xs={24} md={12} xl={6}>
                <Text type='secondary'>Satuan</Text>
                <Select
                  value={filters.homebase_id}
                  onChange={(value) =>
                    setFilters((previous) => ({
                      ...previous,
                      homebase_id: value,
                      class_id: undefined,
                      student_id: undefined,
                      periode_id: undefined,
                    }))
                  }
                  options={homebaseOptions}
                  placeholder='Pilih satuan'
                  style={{ width: "100%", marginTop: 8 }}
                  showSearch
                  optionFilterProp='label'
                  virtual={false}
                  size={isMobile ? "large" : "middle"}
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
                    periode_id: value || undefined,
                    class_id: undefined,
                    student_id: undefined,
                  }))
                }
                options={periodeOptions}
                placeholder='Periode aktif'
                style={{ width: "100%", marginTop: 8 }}
                virtual={false}
                size={isMobile ? "large" : "middle"}
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
                options={classOptions}
                placeholder='Semua kelas'
                style={{ width: "100%", marginTop: 8 }}
                disabled={!access?.can_manage_all_classes}
                virtual={false}
                size={isMobile ? "large" : "middle"}
                allowClear
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
                size={isMobile ? "large" : "middle"}
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
                size={isMobile ? "large" : "middle"}
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
                style={{ marginTop: 8, width: "100%" }}
                size={isMobile ? "large" : "middle"}
                allowClear
              />
            </Col>
          </Row>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default memo(SavingFilters);
