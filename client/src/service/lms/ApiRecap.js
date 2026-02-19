import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiRecap = createApi({
  reducerPath: "ApiRecap",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/recap" }),
  tagTypes: [
    "RecapAttendance",
    "RecapStudentSubjectReport",
    "RecapScoreMonthly",
    "RecapScoreSummative",
    "RecapFinalScore",
    "RecapLearningSummary",
  ],
  endpoints: (builder) => ({
    getRecapTeachers: builder.query({
      query: ({ subjectId, classId }) =>
        `/teachers?subject_id=${subjectId || ""}&class_id=${classId || ""}`,
    }),
    getAttendanceRecap: builder.query({
      query: ({ subjectId, classId, semester, teacherId }) =>
        `/attendance?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&teacher_id=${teacherId || ""}`,
      providesTags: ["RecapAttendance"],
    }),
    getStudentSubjectReport: builder.query({
      query: ({ subjectId, classId, semester, month }) =>
        `/student-subject-report?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&month=${month || ""}`,
      providesTags: ["RecapStudentSubjectReport"],
    }),
    getScoreMonthlyRecap: builder.query({
      query: ({ subjectId, classId, semester, teacherId }) =>
        `/score-monthly?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&teacher_id=${teacherId || ""}`,
      providesTags: ["RecapScoreMonthly"],
    }),
    getScoreSummativeRecap: builder.query({
      query: ({ subjectId, classId, semester, teacherId }) =>
        `/score-summative?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&teacher_id=${teacherId || ""}`,
      providesTags: ["RecapScoreSummative"],
    }),
    getFinalScoreRecap: builder.query({
      query: ({ subjectId, classId, semester, teacherId }) =>
        `/final-score?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&teacher_id=${teacherId || ""}`,
      providesTags: ["RecapFinalScore"],
    }),
    getLearningSummaryRecap: builder.query({
      query: ({ subjectId, teacherId, classId }) =>
        `/learning-summary?subject_id=${subjectId || ""}&teacher_id=${
          teacherId || ""
        }&class_id=${classId || ""}`,
      providesTags: ["RecapLearningSummary"],
    }),
  }),
});

export const {
  useGetRecapTeachersQuery,
  useGetAttendanceRecapQuery,
  useGetStudentSubjectReportQuery,
  useGetScoreMonthlyRecapQuery,
  useGetScoreSummativeRecapQuery,
  useGetFinalScoreRecapQuery,
  useGetLearningSummaryRecapQuery,
} = ApiRecap;
