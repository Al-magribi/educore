import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiRecap = createApi({
  reducerPath: "ApiRecap",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/recap" }),
  tagTypes: [
    "RecapAttendance",
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
  useGetScoreMonthlyRecapQuery,
  useGetScoreSummativeRecapQuery,
  useGetFinalScoreRecapQuery,
  useGetLearningSummaryRecapQuery,
} = ApiRecap;
