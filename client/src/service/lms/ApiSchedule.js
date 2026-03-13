import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiSchedule = createApi({
  reducerPath: "ApiSchedule",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["ScheduleBootstrap"],
  endpoints: (builder) => ({
    getScheduleBootstrap: builder.query({
      query: (periodeId) =>
        `/schedule/bootstrap${periodeId ? `?periode_id=${periodeId}` : ""}`,
      providesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    saveScheduleConfig: builder.mutation({
      query: (body) => ({
        url: "/schedule/config",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    saveTeachingLoad: builder.mutation({
      query: (body) => ({
        url: "/schedule/load",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    importTeachingLoad: builder.mutation({
      query: (body) => ({
        url: "/schedule/load/import",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    deleteTeachingLoad: builder.mutation({
      query: (id) => ({
        url: `/schedule/load/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    saveUnavailability: builder.mutation({
      query: (body) => ({
        url: "/schedule/unavailability",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    deleteUnavailability: builder.mutation({
      query: (id) => ({
        url: `/schedule/unavailability/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    generateSchedule: builder.mutation({
      query: (body) => ({
        url: "/schedule/generate",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    updateScheduleEntry: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/schedule/entries/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
  }),
});

export const {
  useGetScheduleBootstrapQuery,
  useSaveScheduleConfigMutation,
  useSaveTeachingLoadMutation,
  useImportTeachingLoadMutation,
  useDeleteTeachingLoadMutation,
  useSaveUnavailabilityMutation,
  useDeleteUnavailabilityMutation,
  useGenerateScheduleMutation,
  useUpdateScheduleEntryMutation,
} = ApiSchedule;
