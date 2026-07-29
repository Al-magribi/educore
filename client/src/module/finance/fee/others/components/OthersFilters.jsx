import { Button, Flex, Grid, Input, Select, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { RotateCcw, Search } from "lucide-react";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersFilters = ({
  filters,
  setFilters,
  homebases,
  periodes,
  grades,
  classes,
  types,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const hasPeriodeFilter = Boolean(filters.periode_id);

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div
        style={{
          padding: isMobile ? 12 : 16,
          borderRadius: isMobile ? 14 : 18,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "rgba(248, 250, 252, 0.9)",
        }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap='wrap'
          gap={12}
        >
          <Space vertical size={2} style={{ minWidth: 0, flex: 1 }}>
            <Text strong style={{ color: "#0f172a" }}>
              Filter Pembayaran Lainnya
            </Text>
            <Text type='secondary' style={{ fontSize: isMobile ? 12 : 13 }}>
              Default: periode aktif. Kosongkan periode untuk semua periode.
              Filter jenis biaya mendukung cakupan tingkat maupun individu.
            </Text>
          </Space>

          <Button
            icon={<RotateCcw size={16} />}
            block={isMobile}
            onClick={() =>
              setFilters((previous) => ({
                ...previous,
                grade_id: undefined,
                class_id: undefined,
                student_search: "",
                type_id: undefined,
                status: undefined,
              }))
            }
          >
            Reset Filter
          </Button>
        </Flex>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Select
            value={filters.homebase_id}
            options={(homebases || []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                homebase_id: value || undefined,
                grade_id: undefined,
                class_id: undefined,
                student_search: "",
                type_id: undefined,
                status: undefined,
              }))
            }
            placeholder='Pilih satuan'
            size='large'
            disabled={(homebases || []).length <= 1}
            virtual={false}
            allowClear
            style={{ width: "100%" }}
          />
          <Select
            allowClear
            placeholder='Filter periode'
            value={filters.periode_id}
            options={(periodes || []).map((item) => ({
              value: item.id,
              label: (
                <Flex justify='space-between' align='center' gap={12}>
                  <span>{item.name}</span>
                  <Tag
                    color={item.is_active ? "green" : "red"}
                    style={{ margin: 0, borderRadius: 999 }}
                  >
                    {item.is_active ? "Aktif" : "Tidak Aktif"}
                  </Tag>
                </Flex>
              ),
              searchLabel: item.name,
            }))}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                periode_id: value || undefined,
                grade_id: undefined,
                class_id: undefined,
                student_search: "",
                type_id: undefined,
              }))
            }
            optionFilterProp='searchLabel'
            size='large'
            virtual={false}
            style={{ width: "100%" }}
          />
          <Select
            allowClear
            placeholder='Filter tingkat'
            value={filters.grade_id}
            options={(grades || []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                grade_id: value || undefined,
                class_id: undefined,
              }))
            }
            size='large'
            disabled={!hasPeriodeFilter}
            showSearch
            optionFilterProp='label'
            virtual={false}
            style={{ width: "100%" }}
          />
          <Select
            allowClear
            placeholder='Filter kelas'
            value={filters.class_id}
            options={(classes || []).map((item) => ({
              value: item.id,
              label: `${item.name} (${item.grade_name})`,
            }))}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                class_id: value || undefined,
              }))
            }
            size='large'
            disabled={!hasPeriodeFilter || (classes || []).length === 0}
            showSearch
            optionFilterProp='label'
            virtual={false}
            style={{ width: "100%" }}
          />
          <Select
            allowClear
            placeholder='Filter jenis biaya'
            value={filters.type_id}
            options={(types || []).map((item) => ({
              value: item.type_id,
              label: item.periode_name
                ? `${item.name} (${item.periode_name})`
                : item.name,
            }))}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                type_id: value || undefined,
              }))
            }
            size='large'
            showSearch
            optionFilterProp='label'
            virtual={false}
            style={{ width: "100%" }}
          />
          <Input
            placeholder='Cari nama siswa / NIS / NISN'
            value={filters.student_search}
            prefix={<Search size={16} color='#94a3b8' />}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                student_search: event.target.value,
              }))
            }
            size='large'
            disabled={!hasPeriodeFilter}
            allowClear
            style={{ width: "100%" }}
          />
          <Select
            allowClear
            placeholder='Filter status tagihan'
            value={filters.status}
            options={[
              { value: "unpaid", label: "Belum Bayar" },
              { value: "partial", label: "Cicilan" },
              { value: "paid", label: "Lunas" },
            ]}
            onChange={(value) =>
              setFilters((previous) => ({
                ...previous,
                status: value || undefined,
              }))
            }
            size='large'
            virtual={false}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </MotionDiv>
  );
};

export default OthersFilters;
