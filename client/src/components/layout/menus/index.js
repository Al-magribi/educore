import { FEATURES, hasFeature } from "../../../config/productFeatures";

import buildCoreMenus from "./coreMenus";
import buildCbtMenus from "./cbtMenus";
import buildDbMenus from "./dbMenus";
import buildTahfizMenus from "./tahfizMenus";
import buildLmsMenus from "./lmsMenus";

const roleKeys = ["center", "admin", "finance", "teacher", "student", "parent", "tahfiz"];

const buildEmptyMenus = () =>
  roleKeys.reduce((accumulator, role) => {
    accumulator[role] = [];
    return accumulator;
  }, {});

const mergeMenus = (...menuGroups) => {
  const merged = buildEmptyMenus();

  menuGroups.forEach((group) => {
    roleKeys.forEach((role) => {
      const items = group[role] || [];
      merged[role].push(...items);
    });
  });

  return merged;
};

const featureMenuBuilders = [];

if (hasFeature(FEATURES.CBT)) {
  featureMenuBuilders.push(buildCbtMenus);
}
if (hasFeature(FEATURES.DB)) {
  featureMenuBuilders.push(buildDbMenus);
}
if (hasFeature(FEATURES.TAHFIZ)) {
  featureMenuBuilders.push(buildTahfizMenus);
}
if (hasFeature(FEATURES.LMS)) {
  featureMenuBuilders.push(buildLmsMenus);
}

const combinedMenus = mergeMenus(
  buildCoreMenus(),
  ...featureMenuBuilders.map((builder) => builder()),
);

export const CenterMenus = combinedMenus.center;
export const AdminMenus = combinedMenus.admin;
export const FinanceMenus = combinedMenus.finance;
export const TeacherMenus = combinedMenus.teacher;
export const StudentMenus = combinedMenus.student;
export const ParentMenus = combinedMenus.parent;
export const TahfizMenus = hasFeature(FEATURES.TAHFIZ) ? combinedMenus.tahfiz : [];
