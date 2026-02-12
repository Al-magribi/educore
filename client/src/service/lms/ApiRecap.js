import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiRecap = createApi({
  reducerPath: "ApiRecap",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/recap" }),
  tagTypes: ["RecapAttendance", "RecapScoreMonthly", "RecapScoreSummative"],
  endpoints: (builder) => ({
    getAttendanceRecap: builder.query({
      query: ({ subjectId, classId, semester, month }) =>
        `/attendance?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&month=${month || ""}`,
      providesTags: ["RecapAttendance"],
    }),
    getScoreMonthlyRecap: builder.query({
      query: ({ subjectId, classId, semester }) =>
        `/score-monthly?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}`,
      providesTags: ["RecapScoreMonthly"],
    }),
    getScoreSummativeRecap: builder.query({
      query: ({ subjectId, classId, semester }) =>
        `/score-summative?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}`,
      providesTags: ["RecapScoreSummative"],
    }),
  }),
});

export const {
  useGetAttendanceRecapQuery,
  useGetScoreMonthlyRecapQuery,
  useGetScoreSummativeRecapQuery,
} = ApiRecap;
