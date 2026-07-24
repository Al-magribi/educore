import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiPoint = createApi({
  reducerPath: "ApiPoint",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["PointAdminRule", "PointAdminMeta"],
  endpoints: (builder) => ({
    getAdminPointMeta: builder.query({
      query: ({ periodeId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        const qs = params.toString();
        return qs ? `/points/admin/meta?${qs}` : "/points/admin/meta";
      },
      providesTags: ["PointAdminMeta"],
    }),
    getAdminPointRules: builder.query({
      query: ({ periodeId, search = "", pointType = "", isActive = "" } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (search) params.set("search", String(search));
        if (pointType) params.set("point_type", String(pointType));
        if (isActive !== "" && isActive !== null && isActive !== undefined) {
          params.set("is_active", String(isActive));
        }
        const qs = params.toString();
        return qs ? `/points/admin/rules?${qs}` : "/points/admin/rules";
      },
      providesTags: [{ type: "PointAdminRule", id: "LIST" }],
    }),
    getAdminPointStudentsSummary: builder.query({
      query: ({ periodeId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        const qs = params.toString();
        return qs
          ? `/points/admin/students-summary?${qs}`
          : "/points/admin/students-summary";
      },
      providesTags: ["PointAdminMeta"],
    }),
    updateAdminPointConfig: builder.mutation({
      query: (body) => ({
        url: "/points/admin/config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PointAdminMeta"],
    }),
    createAdminPointRule: builder.mutation({
      query: (body) => ({
        url: "/points/admin/rules",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "LIST" }],
    }),
    updateAdminPointRule: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/points/admin/rules/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "LIST" }],
    }),
    deleteAdminPointRule: builder.mutation({
      query: (id) => ({
        url: `/points/admin/rules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "LIST" }],
    }),
    getTeacherPointBootstrap: builder.query({
      query: ({ periodeId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        const qs = params.toString();
        return qs ? `/points/teacher/bootstrap?${qs}` : "/points/teacher/bootstrap";
      },
      providesTags: ["PointAdminMeta"],
    }),
    getTeacherPointEntries: builder.query({
      query: ({ periodeId, studentId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (studentId) params.set("student_id", String(studentId));
        const qs = params.toString();
        return qs ? `/points/teacher/entries?${qs}` : "/points/teacher/entries";
      },
      providesTags: [{ type: "PointAdminRule", id: "TEACHER_ENTRIES" }],
    }),
    createTeacherPointEntry: builder.mutation({
      query: (body) => ({
        url: "/points/teacher/entries",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "TEACHER_ENTRIES" }],
    }),
    updateTeacherPointEntry: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/points/teacher/entries/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "TEACHER_ENTRIES" }],
    }),
    deleteTeacherPointEntry: builder.mutation({
      query: ({ id, periodeId }) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        const qs = params.toString();
        return {
          url: qs
            ? `/points/teacher/entries/${id}?${qs}`
            : `/points/teacher/entries/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["PointAdminMeta", { type: "PointAdminRule", id: "TEACHER_ENTRIES" }],
    }),
  }),
});

export const {
  useCreateAdminPointRuleMutation,
  useCreateTeacherPointEntryMutation,
  useDeleteAdminPointRuleMutation,
  useDeleteTeacherPointEntryMutation,
  useGetAdminPointMetaQuery,
  useGetAdminPointRulesQuery,
  useGetAdminPointStudentsSummaryQuery,
  useGetTeacherPointBootstrapQuery,
  useGetTeacherPointEntriesQuery,
  useUpdateAdminPointConfigMutation,
  useUpdateAdminPointRuleMutation,
  useUpdateTeacherPointEntryMutation,
} = ApiPoint;
