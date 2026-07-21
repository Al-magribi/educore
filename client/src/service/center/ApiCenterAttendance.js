import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiCenterAttendance = createApi({
  reducerPath: "ApiCenterAttendance",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["CenterAttendance"],
  endpoints: (builder) => ({
    getCenterStudentAttendanceReport: builder.query({
      query: ({
        startDate,
        endDate,
        status,
        userName,
        homebaseId,
        periodeId,
      } = {}) => ({
        url: "/attendance/reports/students",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "CenterAttendance", id: "STUDENT" }],
    }),
    getCenterTeacherAttendanceReport: builder.query({
      query: ({
        startDate,
        endDate,
        status,
        userName,
        homebaseId,
        periodeId,
      } = {}) => ({
        url: "/attendance/reports/teachers",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "CenterAttendance", id: "TEACHER" }],
    }),
  }),
});

export const {
  useGetCenterStudentAttendanceReportQuery,
  useGetCenterTeacherAttendanceReportQuery,
} = ApiCenterAttendance;
