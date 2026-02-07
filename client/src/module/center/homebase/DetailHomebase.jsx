import React, { useEffect, useState } from "react";
import {
  Modal,
  Row,
  Col,
  Card,
  Statistic,
  Select,
  Tag,
  Spin,
  Empty,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  BankOutlined,
  ManOutlined,
  WomanOutlined,
} from "@ant-design/icons";
// PERBAIKAN IMPORT: Gunakan Lazy Query
import { useLazyDetailHomebaseQuery } from "../../../service/center/ApiHomebase";

const DetailHomebase = ({ open, homebaseId, onCancel }) => {
  const [periodeId, setPeriodeId] = useState(null);

  // PERBAIKAN DEFINISI HOOK:
  // Lazy Query mengembalikan Array: [triggerFunction, resultObject]
  const [triggerGetDetail, { data: apiData, isFetching }] =
    useLazyDetailHomebaseQuery();

  // Fetch data saat modal dibuka atau periode berubah
  useEffect(() => {
    if (open && homebaseId) {
      // Panggil trigger dengan object sesuai definisi API baru
      triggerGetDetail({ id: homebaseId, periode_id: periodeId });
    }
  }, [open, homebaseId, periodeId, triggerGetDetail]);

  // Set default periode saat data pertama kali dimuat
  useEffect(() => {
    if (apiData?.data?.selected_periode_id && !periodeId) {
      setPeriodeId(apiData.data.selected_periode_id);
    }
  }, [apiData]);

  const stats = apiData?.data?.stats || {};
  const composition = apiData?.data?.class_composition || [];
  const periods = apiData?.data?.periods || [];

  return (
    <Modal
      title="Dashboard Detail Satuan Pendidikan"
      open={open}
      onCancel={() => {
        setPeriodeId(null);
        onCancel();
      }}
      width={1000}
      footer={null}
    >
      {/* ... SISA KODE TAMPILAN (SAMA SEPERTI SEBELUMNYA) ... */}

      {/* FILTER PERIODE */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <span style={{ marginRight: 10 }}>Pilih Periode:</span>
        <Select
          style={{ width: 200 }}
          value={Number(periodeId)}
          onChange={(val) => setPeriodeId(val)}
          placeholder="Pilih Periode"
          loading={isFetching}
        >
          {periods.map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.name} {p.is_active && <Tag color="green">Aktif</Tag>}
            </Select.Option>
          ))}
        </Select>
      </div>

      {isFetching && !apiData ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin />
        </div>
      ) : (
        <>
          {/* Render Statistik dan Grafik disini (Code tidak berubah) */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: "#fffbe6" }}>
                <Statistic
                  title="Total Guru"
                  value={stats.teachers?.total || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: "#d48806" }} // Perbaikan syntax prop antd terbaru
                />
              </Card>
            </Col>
            {/* ... card lainnya ... */}
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: "#e6f7ff" }}>
                <Statistic
                  title="Total Siswa"
                  value={stats.students?.total || 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: "#096dd9" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: "#fff1f0" }}>
                <Statistic
                  title="Total Kelas"
                  value={stats.classes?.total || 0}
                  prefix={<BankOutlined />}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ background: "#f6ffed" }}>
                <Statistic
                  title="Total Pelajaran"
                  value={stats.subjects?.total || 0}
                  prefix={<ReadOutlined />}
                  valueStyle={{ color: "#389e0d" }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            {/* KIRI: DATA KELAS (SISWA PER KELAS) */}
            <Col xs={24} md={16}>
              <Card title="Komposisi Siswa per Kelas" size="small">
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {composition.length === 0 ? (
                    <Empty description="Belum ada kelas/siswa" />
                  ) : (
                    <Row gutter={[10, 10]}>
                      {composition.map((cls, idx) => (
                        <Col span={12} key={idx}>
                          <Card
                            type="inner"
                            size="small"
                            title={cls.class_name}
                            style={{ border: "1px solid #f0f0f0" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <div
                                style={{ textAlign: "center", width: "45%" }}
                              >
                                <ManOutlined
                                  style={{ fontSize: 16, color: "#1890ff" }}
                                />
                                <div style={{ fontWeight: "bold" }}>
                                  {cls.laki}
                                </div>
                                <div style={{ fontSize: 10, color: "#888" }}>
                                  Ikhwan
                                </div>
                              </div>
                              <div
                                style={{ borderLeft: "1px solid #eee" }}
                              ></div>
                              <div
                                style={{ textAlign: "center", width: "45%" }}
                              >
                                <WomanOutlined
                                  style={{ fontSize: 16, color: "#eb2f96" }}
                                />
                                <div style={{ fontWeight: "bold" }}>
                                  {cls.perempuan}
                                </div>
                                <div style={{ fontSize: 10, color: "#888" }}>
                                  Akhwat
                                </div>
                              </div>
                            </div>
                            <div
                              style={{
                                textAlign: "center",
                                background: "#fafafa",
                                marginTop: 8,
                                padding: 2,
                                borderRadius: 4,
                                fontSize: 11,
                              }}
                            >
                              Total: {cls.total_students}
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </Card>
            </Col>

            {/* KANAN: KOMPOSISI GURU */}
            <Col xs={24} md={8}>
              <Card title="Komposisi Guru" size="small">
                <div
                  style={{
                    marginBottom: 15,
                    background: "#fff7e6",
                    padding: 15,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ManOutlined
                    style={{ fontSize: 24, color: "#fa8c16", marginRight: 15 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Ikhwan (Laki-laki)
                    </div>
                    <div style={{ fontSize: 20, fontWeight: "bold" }}>
                      {stats.teachers?.laki || 0}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    background: "#fff0f6",
                    padding: 15,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <WomanOutlined
                    style={{ fontSize: 24, color: "#eb2f96", marginRight: 15 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      Akhwat (Perempuan)
                    </div>
                    <div style={{ fontSize: 20, fontWeight: "bold" }}>
                      {stats.teachers?.perempuan || 0}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Modal>
  );
};

export default DetailHomebase;
