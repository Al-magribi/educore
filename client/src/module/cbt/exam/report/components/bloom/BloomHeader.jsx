import React from "react";
import { Flex, Input, Select, Space, Tag, Typography } from "antd";
import { BrainCircuit, Search, UserRound } from "lucide-react";

const { Text, Title } = Typography;

const BloomHeader = ({
  data,
  isMobile,
  activeScopeLabel,
  classFilter,
  classOptions,
  effectiveStudentFilter,
  hasGranularData,
  insight,
  searchText,
  setClassFilter,
  setSearchText,
  setStudentFilter,
  studentOptions,
}) => (
  <>
    <Flex
      justify='space-between'
      align={isMobile ? "stretch" : "center"}
      gap={12}
      wrap='wrap'
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
        <Text type='secondary'>Analisis Bloom</Text>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          Peta Kekuatan Kognitif Kelas dan Siswa
        </Title>
        <Text type='secondary'>
          Ringkasan ini membantu guru melihat level Bloom yang sudah kuat, level
          yang perlu diperkuat, dan siswa yang butuh tindak lanjut.
        </Text>
      </Space>
      <Tag
        color='blue'
        icon={<BrainCircuit size={12} />}
        style={{ margin: 0, borderRadius: 999 }}
      >
        {data?.total_students || 0} peserta dianalisis
      </Tag>
    </Flex>

    <Flex
      justify='space-between'
      align={isMobile ? "stretch" : "center"}
      wrap='wrap'
      gap={12}
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space
        wrap
        style={{
          width: isMobile ? "100%" : "auto",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <Select
          value={classFilter}
          onChange={(value) => {
            setClassFilter(value);
            setStudentFilter("all");
          }}
          style={{ width: isMobile ? "100%" : 190, maxWidth: "100%" }}
          options={[
            { value: "all", label: "Semua Kelas" },
            ...classOptions.map((item) => ({
              value: item.value,
              label: `${item.label}${
                item.total_students ? ` (${item.total_students})` : ""
              }`,
            })),
          ]}
          disabled={!hasGranularData}
          virtual={false}
        />
        <Select
          showSearch
          value={effectiveStudentFilter}
          onChange={setStudentFilter}
          style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
          optionFilterProp='label'
          options={[{ value: "all", label: "Semua Siswa" }, ...studentOptions]}
          disabled={!hasGranularData}
          virtual={false}
        />
        <Input
          allowClear
          prefix={<Search size={14} />}
          placeholder='Cari teks soal atau level Bloom'
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
        />
      </Space>
      <Tag
        color={insight.mastery.color}
        icon={<UserRound size={12} />}
        style={{ margin: 0, borderRadius: 999 }}
      >
        Fokus: {activeScopeLabel}
      </Tag>
    </Flex>
  </>
);

export default BloomHeader;
