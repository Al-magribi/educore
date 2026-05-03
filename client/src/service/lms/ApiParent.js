import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiParent = createApi({
  reducerPath: "ApiParent",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["Parent", "ParentMeta"],
  endpoints: (builder) => ({
    getParentDashboard: builder.query({
      query: () => "/parent/dashboard",
      providesTags: ["ParentMeta"],
    }),
    getParentAcademicReport: builder.query({
      query: ({
        student_id = null,
        semester = null,
        month = null,
      } = {}) => {
        const params = new URLSearchParams();
        if (student_id) params.set("student_id", String(student_id));
        if (semester) params.set("semester", String(semester));
        if (month) params.set("month", String(month));
        const qs = params.toString();
        return qs ? `/parent/academic-report?${qs}` : "/parent/academic-report";
      },
      providesTags: ["ParentMeta"],
    }),
    getParents: builder.query({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        grade_id = null,
        class_id = null,
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        params.set("search", String(search || ""));

        if (grade_id) params.set("grade_id", String(grade_id));
        if (class_id) params.set("class_id", String(class_id));

        return `/parents?${params.toString()}`;
      },
      providesTags: ["Parent"],
    }),
    getParentMeta: builder.query({
      query: () => "/parents/meta",
      providesTags: ["ParentMeta"],
    }),
    getParentStudentLinks: builder.query({
      query: ({ page = 1, limit = 20, search = "" } = {}) =>
        `/parents/student-links?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
      providesTags: ["Parent", "ParentMeta"],
    }),
    getParentById: builder.query({
      query: (id) => `/parents/${id}`,
      providesTags: (result, error, id) => [{ type: "Parent", id }],
    }),
    addParent: builder.mutation({
      query: (body) => ({
        url: "/parents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Parent", "ParentMeta"],
    }),
    updateParent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/parents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Parent", "ParentMeta"],
    }),
    deleteParent: builder.mutation({
      query: (id) => ({
        url: `/parents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Parent", "ParentMeta"],
    }),
    deleteParentsBulk: builder.mutation({
      query: (ids) => ({
        url: "/parents",
        method: "DELETE",
        body: { ids },
      }),
      invalidatesTags: ["Parent", "ParentMeta"],
    }),
  }),
});

export const {
  useGetParentDashboardQuery,
  useGetParentAcademicReportQuery,
  useGetParentsQuery,
  useGetParentMetaQuery,
  useGetParentStudentLinksQuery,
  useLazyGetParentByIdQuery,
  useAddParentMutation,
  useUpdateParentMutation,
  useDeleteParentMutation,
  useDeleteParentsBulkMutation,
} = ApiParent;
