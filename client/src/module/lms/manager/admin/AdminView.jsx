import React, { Suspense, lazy } from "react";
import { Card, Col, Row, Skeleton, Typography } from "antd";
import { useGetClassesQuery } from "../../../../service/lms/ApiLms";

const Recap = lazy(() => import("../recap/Recap"));

const { Text, Title } = Typography;

const recapFallback = (
  <Card style={{ borderRadius: 12 }}>
    <Skeleton active paragraph={{ rows: 4 }} />
  </Card>
);

const AdminView = ({ subjectId, subject }) => {
  const { data: classesRes } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !subjectId },
  );
  const classes = classesRes?.data || [];

  return (
    <>
      <Suspense fallback={recapFallback}>
        <Recap subjectId={subjectId} subject={subject} isAdminView />
      </Suspense>
    </>
  );
};

export default AdminView;
