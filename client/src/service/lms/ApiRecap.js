import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiRecap = createApi({
  reducerPath: "ApiRecap",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/recap" }),
  tagTypes: ["RecapAttendance", "RecapScoreMonthly"],
  endpoints: (builder) => ({
    getAttendanceRecap: builder.query({
      query: ({ subjectId, classId, semester, month }) =>
        `/attendance?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&month=${month || ""}`,
      providesTags: ["RecapAttendance"],
    }),
    getScoreMonthlyRecap: builder.query({
      query: ({ subjectId, classId, semester, month }) =>
        `/score-monthly?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&semester=${semester || ""}&month=${month || ""}`,
      providesTags: ["RecapScoreMonthly"],
    }),
  }),
});

export const { useGetAttendanceRecapQuery, useGetScoreMonthlyRecapQuery } =
  ApiRecap;
