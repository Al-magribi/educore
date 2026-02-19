import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Space,
  Typography,
} from "antd";
import { GraduationCap, Search } from "lucide-react";
import { useGetSubjectsQuery } from "../../../service/lms/ApiLms";
import Detail from "./subject/Detail";
import Subject from "./subject/Subject";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SubjectList = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = useBreakpoint();

  const [keyword, setKeyword] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const {
    data: subjectsRes,
    isLoading,
    isError,
    error,
  } = useGetSubjectsQuery();

  const subjects = subjectsRes?.data || [];

  const filteredSubjects = useMemo(() => {
    if (!keyword.trim()) return subjects;

    const lowerKeyword = keyword.toLowerCase();
    return subjects.filter((item) => {
      const values = [
        item?.name,
        item?.code,
        item?.category_name,
        item?.branch_name,
        ...(Array.isArray(item?.teacher_names) ? item.teacher_names : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(lowerKeyword);
    });
  }, [subjects, keyword]);

  const searchWidth = screens.xs ? "100%" : 280;
  const errorMessage = error?.data?.message || "Gagal memuat mata pelajaran.";

  if (selectedSubject) {
    return (
      <Detail
        subject={selectedSubject}
        classId={selectedSubject?.class_id || user?.class_id || null}
        onBack={() => setSelectedSubject(null)}
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Space align='center'>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#e6f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1677ff",
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Mata Pelajaran Kelas Anda
              </Title>
              <Text type='secondary'>
                {user?.class_name ? `Kelas ${user.class_name}` : "Kelas belum terdata"}
              </Text>
            </div>
          </Space>

          <Input
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder='Cari mata pelajaran...'
            prefix={<Search size={16} style={{ color: "#8c8c8c" }} />}
            style={{ width: searchWidth }}
          />
        </Flex>
      </Card>

      {isError ? (
        <Alert type='error' showIcon message={errorMessage} />
      ) : isLoading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Subject.Skeleton key={key} />
          ))}
        </Row>
      ) : filteredSubjects.length === 0 ? (
        <Card style={{ borderRadius: 14 }}>
          <Empty description='Belum ada mata pelajaran untuk kelas ini.' />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredSubjects.map((item) => (
            <Subject
              key={item.id}
              subject={item}
              onClick={() => setSelectedSubject(item)}
            />
          ))}
        </Row>
      )}
    </Flex>
  );
};

export default SubjectList;
