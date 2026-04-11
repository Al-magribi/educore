import dayjs from "dayjs";

export const mapSavingFormValues = (record) => ({
  class_id: record?.class_id,
  student_id: record?.student_id,
  transaction_type: record?.transaction_type || "deposit",
  amount: Number(record?.amount || 0) || undefined,
  transaction_date: record?.transaction_date
    ? dayjs(record.transaction_date)
    : dayjs(),
  description: record?.description || undefined,
});
