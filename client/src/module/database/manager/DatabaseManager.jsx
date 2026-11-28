import React from "react";
import { Database, Users } from "lucide-react";

import { PageTabs } from "../../../components/ui/muse";
import ParentAccountManager from "./ParentAccountManager";
import StudentDatabaseManager from "./StudentDatabaseManager";

const DatabaseManager = ({ scope = "all", showParentTab = true }) => {
  const isHomeroom = scope === "homeroom";

  const items = [
    {
      key: "students",
      label: "Data Siswa",
      icon: <Database size={16} />,
      render: () => <StudentDatabaseManager scope={scope} />,
    },
    showParentTab && {
      key: "parents",
      label: "Akun Orang Tua",
      icon: <Users size={16} />,
      render: () => <ParentAccountManager scope={scope} />,
    },
  ].filter(Boolean);

  return (
    <PageTabs
      title={isHomeroom ? "Database Kelas" : "Database Siswa"}
      description={
        isHomeroom
          ? "Pantau kelengkapan data siswa di kelas wali dan kelola akun orang tuanya."
          : "Pantau kelengkapan data induk siswa periode aktif dan kelola akun orang tua."
      }
      items={items}
    />
  );
};

export default DatabaseManager;
