import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiDash = createApi({
  reducerPath: "ApiDash",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: () => "/summary",
      providesTags: ["Dashboard"],
      transformResponse: (response) => response.data,
    }),
    getStudentDash: builder.query({
      query: () => "/student-dash",
      providesTags: ["Dashboard"],
      transformResponse: (response) => response.data,
    }),
    getTeacherDash: builder.query({
      query: () => "/teacher-dash",
      providesTags: ["Dashboard"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetStudentDashQuery,
  useGetTeacherDashQuery,
} = ApiDash;
