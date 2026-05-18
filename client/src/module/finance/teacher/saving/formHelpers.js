export const mapSavingFormValues = (record) => ({
  class_id: record?.class_id,
  grade_id: record?.grade_id,
  student_id: record?.student_id,
  student_search: record?.student_search || "",
  transaction_type: record?.transaction_type || "deposit",
  amount: Number(record?.amount || 0) || undefined,
});
