import { BranchesOutlined } from "@ant-design/icons";

const lmsMenuNode = {
  label: "LMS",
  key: "/manajemen-lms",
  icon: <BranchesOutlined />,
};

const buildLmsMenus = () => ({
  center: [],
  admin: [lmsMenuNode],
  teacher: [lmsMenuNode],
  student: [lmsMenuNode],
  parent: [],
  tahfiz: [],
});

export default buildLmsMenus;
