import React, { Suspense, lazy } from "react";
import { Skeleton } from "antd";
import { MuseCard } from "../../../../components/ui/muse";

const Recap = lazy(() => import("../recap/Recap"));


const recapFallback = (
  <MuseCard>
    <Skeleton active paragraph={{ rows: 4 }} />
  </MuseCard>
);

const AdminView = ({ subjectId, subject }) => {
  return (
    <Suspense fallback={recapFallback}>
      <Recap subjectId={subjectId} subject={subject} isAdminView />
    </Suspense>
  );
};

export default AdminView;
