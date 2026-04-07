import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiSchedule = createApi({
  reducerPath: "ApiSchedule",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["ScheduleBootstrap"],
  endpoints: (builder) => ({
    getScheduleBootstrap: builder.query({
      query: (args = {}) => {
        const params = new URLSearchParams();
        if (args?.periodeId) params.set("periode_id", args.periodeId);
        if (args?.configId) params.set("config_id", args.configId);
        if (args?.groupId) params.set("group_id", args.groupId);
        const queryString = params.toString();
        return `/schedule/bootstrap${queryString ? `?${queryString}` : ""}`;
      },
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
    activateScheduleConfig: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/schedule/config/${id}/activate`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    saveScheduleConfigGroup: builder.mutation({
      query: (body) => ({
        url: "/schedule/config-group",
        method: "POST",
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
    saveScheduleActivity: builder.mutation({
      query: (body) => ({
        url: "/schedule/activity",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
    deleteScheduleActivity: builder.mutation({
      query: (id) => ({
        url: `/schedule/activity/${id}`,
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
    createManualScheduleEntry: builder.mutation({
      query: (body) => ({
        url: "/schedule/entries/manual",
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
    deleteScheduleEntry: builder.mutation({
      query: (id) => ({
        url: `/schedule/entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ScheduleBootstrap", id: "DATA" }],
    }),
  }),
});

export const {
  useGetScheduleBootstrapQuery,
  useSaveScheduleConfigMutation,
  useActivateScheduleConfigMutation,
  useSaveScheduleConfigGroupMutation,
  useSaveTeachingLoadMutation,
  useImportTeachingLoadMutation,
  useDeleteTeachingLoadMutation,
  useSaveScheduleActivityMutation,
  useDeleteScheduleActivityMutation,
  useSaveUnavailabilityMutation,
  useDeleteUnavailabilityMutation,
  useGenerateScheduleMutation,
  useCreateManualScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
} = ApiSchedule;
