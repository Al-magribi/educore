import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAttendance = createApi({
  reducerPath: "ApiAttendance",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["Attendance"],
  endpoints: (builder) => ({
    getAttendanceStudents: builder.query({
      query: ({ subjectId, classId, date }) =>
        `/attendance/students?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&date=${date || ""}`,
      providesTags: [{ type: "Attendance", id: "LIST" }],
    }),
    submitAttendance: builder.mutation({
      query: (body) => ({
        url: "/attendance/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Attendance", id: "LIST" }],
    }),
  }),
});

export const { useGetAttendanceStudentsQuery, useSubmitAttendanceMutation } =
  ApiAttendance;
