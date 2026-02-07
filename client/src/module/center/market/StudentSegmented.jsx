import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Select,
  Typography,
  Tag,
  Avatar,
  Space,
  Row,
  Col,
  InputNumber,
  Divider,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { useGetStudentSegmentQuery } from "../../../service/center/ApiAnalysis";
import { InfiniteScrollList } from "../../../components"; // Pastikan path benar
import useDebounced from "../../../utils/UseDebounced"; // Pastikan path benar

const { Title, Text } = Typography;
const { Option } = Select;

const StudentSegmented = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [listData, setListData] = useState([]);

  const debouncedSearch = useDebounced(search, 500);
  const debouncedAge = useDebounced(age, 500);

  const { data: apiData, isFetching } = useGetStudentSegmentQuery({
    page,
    limit: 10,
    search: debouncedSearch,
    age: debouncedAge,
    gender,
  });

  useEffect(() => {
    if (apiData?.data) {
      if (page === 1) {
        setListData(apiData.data);
      } else {
        setListData((prev) => {
          // PERBAIKAN: Gunakan 'sibling_id' sebagai key unik (bukan user_id)
          // Jika backend belum update, gunakan fallback ke index atau properti lain
          const newItems = apiData.data.filter(
            (newItem) =>
              !prev.some(
                (prevItem) =>
                  (prevItem.sibling_id || prevItem.user_id) ===
                  (newItem.sibling_id || newItem.user_id),
              ),
          );
          return [...prev, ...newItems];
        });
      }
    }
  }, [apiData, page]);

  useEffect(() => {
    setPage(1);
    setListData([]);
  }, [debouncedSearch, debouncedAge, gender]);

  const handleLoadMore = () => {
    if (!isFetching && apiData?.meta?.totalData > listData.length) {
      setPage((prev) => prev + 1);
    }
  };

  const renderItem = (item) => (
    <Card hoverable style={{ height: "100%" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar
          shape="square"
          size={54}
          icon={<UserOutlined />}
          style={{
            backgroundColor: item.gender === "L" ? "#1890ff" : "#eb2f96",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* NAMA SAUDARA (Target Market) */}
          <Text strong style={{ fontSize: 16, display: "block" }} ellipsis>
            {item.full_name}
          </Text>

          <div style={{ display: "flex", gap: 6, margin: "4px 0 8px 0" }}>
            <Tag color="blue">{item.age ? `${item.age} Tahun` : "Usia -"}</Tag>
            <Tag color={item.gender === "L" ? "geekblue" : "magenta"}>
              {item.gender === "L" ? "Laki-laki" : "Perempuan"}
            </Tag>
          </div>

          {/* AREA KONEKSI SISWA */}
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "8px",
              borderRadius: "6px",
              marginTop: "8px",
            }}
          >
            <Space
              align="center"
              style={{ fontSize: 12, color: "#666", marginBottom: 4 }}
            >
              <UsergroupAddOutlined />
              <span>Saudara dari siswa:</span>
            </Space>

            {/* PERBAIKAN: Tambahkan Fallback & Width 100% */}
            <div style={{ width: "100%", overflow: "hidden" }}>
              <Text
                strong
                style={{ color: "#1890ff", fontSize: 13, display: "block" }}
                ellipsis
              >
                {/* Fallback jika linked_student_name kosong */}
                {item.linked_student_name || "(Nama Siswa Tidak Muncul)"}
              </Text>
            </div>

            <Divider style={{ margin: "6px 0" }} />

            <Space vertical size={1} style={{ width: "100%", fontSize: 11 }}>
              <Text type="secondary" ellipsis>
                <HomeOutlined style={{ marginRight: 4 }} />
                {item.homebase_name || "Satuan N/A"}
              </Text>
              <Text type="secondary" ellipsis>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {item.city_name || "Kota N/A"}
              </Text>
            </Space>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card
      title={<Title level={5}>👥 Segmentasi Market (Potensi Saudara)</Title>}
      style={{ marginTop: 16 }}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Input
            placeholder="Cari nama saudara atau siswa..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} md={6}>
          <InputNumber
            placeholder="Umur Saudara"
            style={{ width: "100%" }}
            min={0}
            max={25}
            onChange={(val) => setAge(val)}
          />
        </Col>
        <Col xs={12} md={6}>
          <Select
            placeholder="Gender Saudara"
            style={{ width: "100%" }}
            allowClear
            onChange={(val) => setGender(val)}
          >
            <Option value="L">Laki-laki</Option>
            <Option value="P">Perempuan</Option>
          </Select>
        </Col>
      </Row>

      <InfiniteScrollList
        data={listData}
        loading={isFetching}
        hasMore={apiData?.meta?.totalData > listData.length}
        onLoadMore={handleLoadMore}
        renderItem={renderItem}
        height="500px"
        emptyText="Tidak ada data saudara yang sesuai filter"
        grid={{
          gutter: [12, 12],
          xs: 24,
          sm: 12,
          md: 12,
          lg: 8,
          xl: 6,
        }}
      />
    </Card>
  );
};

export default StudentSegmented;
