import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Download, Filter, Percent, RefreshCcw, Users } from "lucide-react";
import {
  useGetReportScoreRecapQuery,
  useUpsertScoreWeightingMutation,
} from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildExcelRows = (rows, weightConfigured) =>
  rows.map((row) => ({
    No: row.no,
    NIS: row.nis,
    "Nama Siswa": row.full_name,
    "Rata-rata Formatif": row.formative_average ?? "-",
    "Rata-rata Sumatif": row.summative_average ?? "-",
    "Nilai Akhir": row.final_grade ?? "-",
    "Nilai Raport": weightConfigured
      ? (row.report_grade ?? "-")
      : "Bobot Belum diatur",
  }));

const scoreTag = (value, color) =>
  value === null || value === undefined ? (
    "-"
  ) : (
    <Tag color={color}>{round2(value)}</Tag>
  );

const NilaiRaport = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  classes,
  classLoading,
  classId,
  setClassId,
  semester,
  setSemester,
  isAdminView = false,
  teacherId,
  setTeacherId,
  teachers = [],
  teacherLoading = false,
  screens,
}) => {
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightForm] = Form.useForm();

  const {
    data: recapRes,
    isFetching,
    refetch,
  } = useGetReportScoreRecapQuery(
    {
      subjectId,
      classId,
      semester,
      teacherId,
    },
    {
      skip:
        !isActive ||
        !subjectId ||
        !classId ||
        !semester ||
        (isAdminView && !teacherId),
    },
  );

  const [upsertScoreWeighting, { isLoading: savingWeight }] =
    useUpsertScoreWeightingMutation();

  const recapData = recapRes?.data || {};
  const summary = recapData?.summary || {};
  const students = recapData?.students || [];
  const weighting = recapData?.weighting || {
    weight_formative: 0,
    weight_summative: 0,
    weight_final: 0,
    configured: false,
  };
  const weightConfigured = Boolean(weighting.configured);

  useEffect(() => {
    if (!weightModalOpen) return;
    weightForm.setFieldsValue({
      weight_formative: Number(weighting.weight_formative || 0),
      weight_summative: Number(weighting.weight_summative || 0),
      weight_final: Number(weighting.weight_final || 0),
    });
  }, [weightModalOpen, weighting, weightForm]);

  const rows = useMemo(
    () =>
      students.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        formative_average:
          item.formative_average === null ||
          item.formative_average === undefined
            ? null
            : Number(item.formative_average),
        summative_average:
          item.summative_average === null ||
          item.summative_average === undefined
            ? null
            : Number(item.summative_average),
        final_grade:
          item.final_grade === null || item.final_grade === undefined
            ? null
            : Number(item.final_grade),
        report_grade:
          item.report_grade === null || item.report_grade === undefined
            ? null
            : Number(item.report_grade),
      })),
    [students],
  );

  const columns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        align: "center",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        ellipsis: true,
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Rata-rata Formatif",
        dataIndex: "formative_average",
        width: 150,
        align: "center",
        render: (value) => scoreTag(value, "purple"),
      },
      {
        title: "Rata-rata Sumatif",
        dataIndex: "summative_average",
        width: 150,
        align: "center",
        render: (value) => scoreTag(value, "cyan"),
      },
      {
        title: "Nilai Akhir",
        dataIndex: "final_grade",
        width: 130,
        align: "center",
        render: (value) => scoreTag(value, "blue"),
      },
      {
        title: "Nilai Raport",
        dataIndex: "report_grade",
        width: 170,
        align: "center",
        render: (value) => {
          if (!weightConfigured) {
            return <Tag color='orange'>Bobot Belum diatur</Tag>;
          }
          return scoreTag(value, "green");
        },
      },
    ],
    [weightConfigured],
  );

  const watchedFormative = Form.useWatch("weight_formative", weightForm);
  const watchedSummative = Form.useWatch("weight_summative", weightForm);
  const watchedFinal = Form.useWatch("weight_final", weightForm);
  const weightTotal =
    Number(watchedFormative || 0) +
    Number(watchedSummative || 0) +
    Number(watchedFinal || 0);

  const canOpenWeightModal =
    Boolean(subjectId) && (!isAdminView || Boolean(teacherId));

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const sheetRows = buildExcelRows(rows, weightConfigured);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Raport");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Raport_${selectedClassName}_Semester${semester}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleSaveWeight = async () => {
    try {
      const values = await weightForm.validateFields();
      const total =
        Number(values.weight_formative || 0) +
        Number(values.weight_summative || 0) +
        Number(values.weight_final || 0);

      if (total !== 0 && total !== 100) {
        message.error("Total bobot harus 0 (belum diatur) atau tepat 100.");
        return;
      }

      const res = await upsertScoreWeighting({
        subject_id: Number(subjectId),
        teacher_id: isAdminView ? Number(teacherId) : undefined,
        weight_formative: Number(values.weight_formative || 0),
        weight_summative: Number(values.weight_summative || 0),
        weight_final: Number(values.weight_final || 0),
      }).unwrap();

      message.success(res?.message || "Bobot berhasil disimpan.");
      setWeightModalOpen(false);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(
        error?.data?.message || error?.message || "Gagal menyimpan bobot.",
      );
    }
  };

  const formulaText = weightConfigured
    ? `Nilai raport = (${weighting.weight_formative}% × formatif) + (${weighting.weight_summative}% × sumatif) + (${weighting.weight_final}% × nilai akhir)`
    : "Nilai raport = Bobot Belum diatur";

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Space vertical size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Rekapitulasi Nilai Raport
            </Title>
            <Text type='secondary'>{formulaText}</Text>
          </Space>
          <Space wrap>
            <Tag color='blue'>{subject?.name || "Mata Pelajaran"}</Tag>
            <Tag color='processing'>
              {activePeriode?.name ||
                recapData?.meta?.periode_name ||
                "Periode"}
            </Tag>
            {weightConfigured ? (
              <Tag color='green'>
                Bobot {weighting.weight_formative}/
                {weighting.weight_summative}/{weighting.weight_final}
              </Tag>
            ) : (
              <Tag color='orange'>Bobot Belum diatur</Tag>
            )}
          </Space>
        </Flex>

        <Flex
          justify='space-between'
          align='center'
          wrap='wrap'
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space wrap>
            <Select
              value={semester}
              onChange={setSemester}
              style={{ minWidth: 160 }}
              options={[
                { value: 1, label: "Semester 1" },
                { value: 2, label: "Semester 2" },
              ]}
              suffixIcon={<Filter size={14} />}
              virtual={false}
              allowClear
              showSearch={{ optionFilterProp: "label" }}
            />
            {isAdminView && (
              <Select
                value={teacherId}
                onChange={setTeacherId}
                style={{ minWidth: 220 }}
                placeholder='Pilih guru'
                options={teachers.map((item) => ({
                  value: item.id,
                  label: item.full_name,
                }))}
                loading={teacherLoading}
                virtual={false}
                allowClear
                showSearch={{ optionFilterProp: "label" }}
              />
            )}
            <Select
              value={classId}
              onChange={setClassId}
              style={{ minWidth: 220 }}
              placeholder='Pilih kelas'
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              loading={classLoading}
              virtual={false}
              allowClear
              showSearch={{ optionFilterProp: "label" }}
            />
          </Space>

          <Space wrap>
            <Button icon={<RefreshCcw size={14} />} onClick={refetch}>
              Refresh
            </Button>
            <Button
              icon={<Percent size={14} />}
              disabled={!canOpenWeightModal}
              onClick={() => setWeightModalOpen(true)}
            >
              Bobot
            </Button>
            <Button
              type='primary'
              icon={<Download size={14} />}
              disabled={!rows.length}
              onClick={handleDownloadExcel}
            >
              Download Excel
            </Button>
          </Space>
        </Flex>

        <Flex wrap='wrap' gap={8} style={{ marginTop: 14 }}>
          <Tag color='geekblue' icon={<Users size={12} />}>
            Total Siswa: {recapData?.meta?.total_students || 0}
          </Tag>
          <Tag color='purple'>
            Avg Formatif: {round2(summary.formative_average)}
          </Tag>
          <Tag color='cyan'>
            Avg Sumatif: {round2(summary.summative_average)}
          </Tag>
          <Tag color='blue'>
            Avg Nilai Akhir: {round2(summary.final_average)}
          </Tag>
          <Tag color='green'>
            Avg Nilai Raport:{" "}
            {weightConfigured ? round2(summary.report_average) : "-"}
          </Tag>
        </Flex>
      </Card>

      {!classId ? (
        <Alert
          type='info'
          showIcon
          message='Pilih kelas untuk menampilkan rekap nilai raport.'
        />
      ) : isAdminView && !teacherId ? (
        <Alert
          type='info'
          showIcon
          message='Pilih guru pengampu untuk menampilkan data yang sesuai tampilan guru.'
        />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data nilai raport pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={screens.xs ? "small" : "middle"}
              tableLayout='fixed'
              scroll={{ x: 980 }}
            />
          )}
        </Card>
      )}

      <Modal
        title='Atur Bobot Nilai Raport'
        open={weightModalOpen}
        onCancel={() => setWeightModalOpen(false)}
        onOk={handleSaveWeight}
        okText='Simpan'
        cancelText='Batal'
        confirmLoading={savingWeight}
        destroyOnHidden
      >
        <Text type='secondary'>
          Bobot per guru dan mata pelajaran. Total harus 0 (belum diatur) atau
          tepat 100. Komponen dengan bobot 0 tidak dihitung.
        </Text>
        <Form
          form={weightForm}
          layout='vertical'
          style={{ marginTop: 16 }}
          initialValues={{
            weight_formative: 0,
            weight_summative: 0,
            weight_final: 0,
          }}
        >
          <Form.Item
            label='Bobot Formatif (%)'
            name='weight_formative'
            rules={[{ required: true, message: "Wajib diisi" }]}
          >
            <InputNumber min={0} max={100} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label='Bobot Sumatif (%)'
            name='weight_summative'
            rules={[{ required: true, message: "Wajib diisi" }]}
          >
            <InputNumber min={0} max={100} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label='Bobot Nilai Akhir (%)'
            name='weight_final'
            rules={[{ required: true, message: "Wajib diisi" }]}
          >
            <InputNumber min={0} max={100} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
        <Tag color={weightTotal === 0 || weightTotal === 100 ? "green" : "red"}>
          Total bobot: {weightTotal}%
        </Tag>
      </Modal>
    </Flex>
  );
};

export default NilaiRaport;
