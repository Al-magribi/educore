import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiDuty = createApi({
  reducerPath: "ApiDuty",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["Duty"],
  endpoints: (builder) => ({
    getDutyBootstrap: builder.query({
      query: ({ periodeId } = {}) => {
        const searchParams = new URLSearchParams();
        if (periodeId) searchParams.set("periode_id", periodeId);
        const queryString = searchParams.toString();
        return queryString ? `/duty/bootstrap?${queryString}` : "/duty/bootstrap";
      },
      providesTags: [{ type: "Duty", id: "LIST" }],
    }),
    getDutyReports: builder.query({
      query: ({ date, periodeId } = {}) => {
        const searchParams = new URLSearchParams();
        if (date) searchParams.set("date", date);
        if (periodeId) searchParams.set("periode_id", periodeId);
        const queryString = searchParams.toString();
        return queryString ? `/duty/reports?${queryString}` : "/duty/reports";
      },
      providesTags: [{ type: "Duty", id: "LIST" }],
    }),
    saveDutySchedule: builder.mutation({
      query: (body) => ({
        url: "/duty/schedule",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Duty", id: "LIST" }],
    }),
    deleteDutySchedule: builder.mutation({
      query: (id) => ({
        url: `/duty/schedule/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Duty", id: "LIST" }],
    }),
    deleteDutyDailyNote: builder.mutation({
      query: (assignmentId) => ({
        url: `/duty/reports/daily-note/${assignmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Duty", id: "LIST" }],
    }),
    getTeacherDutyBootstrap: builder.query({
      query: ({ date, periodeId } = {}) => {
        const searchParams = new URLSearchParams();
        if (date) searchParams.set("date", date);
        if (periodeId) searchParams.set("periode_id", periodeId);
        const queryString = searchParams.toString();
        return queryString
          ? `/duty/teacher/bootstrap?${queryString}`
          : "/duty/teacher/bootstrap";
      },
      providesTags: [{ type: "Duty", id: "LIST" }],
    }),
    saveTeacherDutyReport: builder.mutation({
      query: (body) => ({
        url: "/duty/teacher/report",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Duty", id: "LIST" }],
    }),
  }),
});

export const {
  useDeleteDutyDailyNoteMutation,
  useDeleteDutyScheduleMutation,
  useGetDutyBootstrapQuery,
  useGetDutyReportsQuery,
  useGetTeacherDutyBootstrapQuery,
  useSaveDutyScheduleMutation,
  useSaveTeacherDutyReportMutation,
} = ApiDuty;
