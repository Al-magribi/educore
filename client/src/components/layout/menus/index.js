import { FEATURES, hasFeature } from "../../../config/productFeatures";

import buildCoreMenus from "./coreMenus";
import buildDbMenus from "./dbMenus";
import buildCbtMenus from "./cbtMenus";
import buildLmsMenus from "./lmsMenus";
import buildTahfizMenus from "./tahfizMenus";

const roleKeys = [
  "center",
  "admin",
  "finance",
  "teacher",
  "student",
  "parent",
  "tahfiz",
];

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

const getCombinedMenus = (user = {}) => {
  const featureMenuBuilders = [];

  if (hasFeature(FEATURES.CBT)) {
    featureMenuBuilders.push(buildCbtMenus);
  }
  if (hasFeature(FEATURES.DB)) {
    featureMenuBuilders.push(buildDbMenus);
  }
  if (hasFeature(FEATURES.FINANCE)) {
    featureMenuBuilders.push(buildFinanceMenus);
  }
  if (hasFeature(FEATURES.TAHFIZ)) {
    featureMenuBuilders.push(buildTahfizMenus);
  }
  if (hasFeature(FEATURES.LMS)) {
    featureMenuBuilders.push(buildLmsMenus);
  }

  return mergeMenus(
    buildCoreMenus(user),
    ...featureMenuBuilders.map((builder) => builder(user)),
  );
};

const combinedMenus = getCombinedMenus();

export const CenterMenus = combinedMenus.center;
export const AdminMenus = combinedMenus.admin;
export const FinanceMenus = combinedMenus.finance;
export const TeacherMenus = combinedMenus.teacher;
export const StudentMenus = combinedMenus.student;
export const ParentMenus = combinedMenus.parent;
export const TahfizMenus = hasFeature(FEATURES.TAHFIZ)
  ? combinedMenus.tahfiz
  : [];
