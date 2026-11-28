import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiPoint = createApi({
  reducerPath: "ApiPoint",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: [
    "PointAdminRule",
    "PointAdminMeta",
    "PointAdminCategory",
    "PointViewer",
  ],
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
      query: ({
        periodeId,
        search = "",
        pointType = "",
        isActive = "",
        categoryId = "",
      } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (search) params.set("search", String(search));
        if (pointType) params.set("point_type", String(pointType));
        if (isActive !== "" && isActive !== null && isActive !== undefined) {
          params.set("is_active", String(isActive));
        }
        if (categoryId === "uncategorized") {
          params.set("uncategorized", "1");
        } else if (categoryId) {
          params.set("category_id", String(categoryId));
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
      invalidatesTags: ["PointAdminMeta", "PointViewer"],
    }),
    getAdminPointCategories: builder.query({
      query: ({ periodeId, pointType = "" } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (pointType) params.set("point_type", String(pointType));
        const qs = params.toString();
        return qs
          ? `/points/admin/categories?${qs}`
          : "/points/admin/categories";
      },
      providesTags: [{ type: "PointAdminCategory", id: "LIST" }],
    }),
    createAdminPointCategory: builder.mutation({
      query: (body) => ({
        url: "/points/admin/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminCategory", id: "LIST" },
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    updateAdminPointCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/points/admin/categories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminCategory", id: "LIST" },
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    deleteAdminPointCategory: builder.mutation({
      query: (id) => ({
        url: `/points/admin/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminCategory", id: "LIST" },
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    createAdminPointRule: builder.mutation({
      query: (body) => ({
        url: "/points/admin/rules",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    updateAdminPointRule: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/points/admin/rules/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    deleteAdminPointRule: builder.mutation({
      query: (id) => ({
        url: `/points/admin/rules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "LIST" },
        "PointViewer",
      ],
    }),
    getTeacherPointBootstrap: builder.query({
      query: ({ periodeId, classId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (classId) params.set("class_id", String(classId));
        const qs = params.toString();
        return qs
          ? `/points/teacher/bootstrap?${qs}`
          : "/points/teacher/bootstrap";
      },
      providesTags: ["PointAdminMeta", "PointViewer"],
    }),
    getTeacherPointEntries: builder.query({
      query: ({ periodeId, studentId, classId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (studentId) params.set("student_id", String(studentId));
        if (classId) params.set("class_id", String(classId));
        const qs = params.toString();
        return qs ? `/points/teacher/entries?${qs}` : "/points/teacher/entries";
      },
      providesTags: [{ type: "PointAdminRule", id: "TEACHER_ENTRIES" }],
    }),
    createAdminPointEntry: builder.mutation({
      query: (body) => ({
        url: "/points/admin/entries",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "TEACHER_ENTRIES" },
        "PointViewer",
      ],
    }),
    updateAdminPointEntry: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/points/admin/entries/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "TEACHER_ENTRIES" },
        "PointViewer",
      ],
    }),
    deleteAdminPointEntry: builder.mutation({
      query: ({ id, periodeId, classId }) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (classId) params.set("class_id", String(classId));
        const qs = params.toString();
        return {
          url: qs
            ? `/points/admin/entries/${id}?${qs}`
            : `/points/admin/entries/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: [
        "PointAdminMeta",
        { type: "PointAdminRule", id: "TEACHER_ENTRIES" },
        "PointViewer",
      ],
    }),
    getStudentPointOverview: builder.query({
      query: ({ periodeId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        const qs = params.toString();
        return qs
          ? `/points/student/overview?${qs}`
          : "/points/student/overview";
      },
      providesTags: ["PointViewer"],
    }),
    getParentPointOverview: builder.query({
      query: ({ periodeId, studentId } = {}) => {
        const params = new URLSearchParams();
        if (periodeId) params.set("periode_id", String(periodeId));
        if (studentId) params.set("student_id", String(studentId));
        const qs = params.toString();
        return qs
          ? `/points/parent/overview?${qs}`
          : "/points/parent/overview";
      },
      providesTags: ["PointViewer"],
    }),
  }),
});

export const {
  useCreateAdminPointCategoryMutation,
  useCreateAdminPointEntryMutation,
  useCreateAdminPointRuleMutation,
  useDeleteAdminPointCategoryMutation,
  useDeleteAdminPointEntryMutation,
  useDeleteAdminPointRuleMutation,
  useGetAdminPointCategoriesQuery,
  useGetAdminPointMetaQuery,
  useGetAdminPointRulesQuery,
  useGetAdminPointStudentsSummaryQuery,
  useGetParentPointOverviewQuery,
  useGetStudentPointOverviewQuery,
  useGetTeacherPointBootstrapQuery,
  useGetTeacherPointEntriesQuery,
  useUpdateAdminPointCategoryMutation,
  useUpdateAdminPointConfigMutation,
  useUpdateAdminPointEntryMutation,
  useUpdateAdminPointRuleMutation,
} = ApiPoint;
