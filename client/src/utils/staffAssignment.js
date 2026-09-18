const ASSIGNMENT_TYPES = ["cbt", "kurikulum", "kesiswaan"];

export const getAssignmentTypes = () => [...ASSIGNMENT_TYPES];

export const normalizeAssignments = (user) => {
  const source = Array.isArray(user?.assignments) ? user.assignments : [];
  return [
    ...new Set(
      source
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => ASSIGNMENT_TYPES.includes(item)),
    ),
  ];
};

export const isSatuanAdmin = (user) =>
  user?.role === "admin" && user?.level === "satuan";

export const hasStaffAssignment = (user, type) =>
  user?.role === "teacher" &&
  (user?.[`can_manage_${type}`] === true ||
    normalizeAssignments(user).includes(type));

export const canManageCbt = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "cbt");

export const canManageKurikulum = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "kurikulum");

export const canManageKesiswaan = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "kesiswaan");

export const teacherOwnsSubject = (user, subjectId) => {
  if (!subjectId) return false;
  const subjects = Array.isArray(user?.subjects) ? user.subjects : [];
  return subjects.some(
    (item) => String(item?.subject_id) === String(subjectId),
  );
};
