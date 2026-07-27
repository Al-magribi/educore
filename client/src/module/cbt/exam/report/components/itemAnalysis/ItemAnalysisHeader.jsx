import React from "react";
import { Alert, Button, Flex, Input, Space, Switch, Tag, Typography } from "antd";
import { Download, FlaskConical, Search } from "lucide-react";

const { Text, Title } = Typography;

const ItemAnalysisHeader = ({
  data,
  includeEssay,
  isExporting = false,
  isMobile,
  onExportExcel,
  onIncludeEssayChange,
  searchText,
  setSearchText,
  showRejectedOnly,
  setShowRejectedOnly,
}) => (
  <Space direction='vertical' size={14} style={{ width: "100%" }}>
    <Flex
      justify='space-between'
      align={isMobile ? "stretch" : "center"}
      gap={12}
      wrap='wrap'
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
        <Text type='secondary'>Analisis Butir Soal</Text>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          Validitas, Reliabilitas, dan Tingkat Kesukaran
        </Title>
        <Text type='secondary'>
          Menilai kualitas setiap soal berdasarkan daya beda, kesukaran, dan
          konsistensi paket soal (Cronbach&apos;s Alpha).
        </Text>
      </Space>
      <Flex gap={8} wrap='wrap' align='center'>
        <Tag
          color='blue'
          icon={<FlaskConical size={12} />}
          style={{ margin: 0, borderRadius: 999 }}
        >
          {data?.analyzed_students || 0} peserta dianalisis
        </Tag>
        <Button
          type='primary'
          icon={<Download size={14} />}
          loading={isExporting}
          disabled={!data?.per_question?.length}
          onClick={onExportExcel}
          block={isMobile}
          style={{ borderRadius: 12 }}
        >
          Export Excel
        </Button>
      </Flex>
    </Flex>

    {data?.sample_warning ? (
      <Alert
        type='warning'
        showIcon
        message={data.sample_warning_message}
        style={{ borderRadius: 14 }}
      />
    ) : null}

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
        <Input
          allowClear
          prefix={<Search size={14} />}
          placeholder='Cari teks soal atau tipe'
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
        />
        <Flex
          align='center'
          gap={8}
          style={{
            padding: "6px 12px",
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "#fff",
          }}
        >
          <Switch
            size='small'
            checked={includeEssay}
            onChange={onIncludeEssayChange}
          />
          <Text style={{ fontSize: 13 }}>
            Sertakan soal esai & isian singkat
          </Text>
        </Flex>
        <Flex
          align='center'
          gap={8}
          style={{
            padding: "6px 12px",
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "#fff",
          }}
        >
          <Switch
            size='small'
            checked={showRejectedOnly}
            onChange={setShowRejectedOnly}
          />
          <Text style={{ fontSize: 13 }}>Hanya soal tidak disarankan</Text>
        </Flex>
      </Space>
      {!includeEssay && data?.excluded_essay_questions > 0 ? (
        <Text type='secondary' style={{ fontSize: 12 }}>
          {data.excluded_essay_questions} soal esai/isian dikecualikan
        </Text>
      ) : null}
    </Flex>
  </Space>
);

export default ItemAnalysisHeader;
