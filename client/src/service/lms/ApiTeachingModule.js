import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTeachingModule = createApi({
  reducerPath: "ApiTeachingModule",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["TeachingModule", "TeachingModuleMonitoring"],
  endpoints: (builder) => ({
    getTeachingModules: builder.query({
      query: ({ subjectId, gradeId } = {}) => {
        const searchParams = new URLSearchParams();
        if (gradeId) searchParams.set("grade_id", gradeId);
        const queryString = searchParams.toString();
        return queryString
          ? `/subjects/${subjectId}/teaching-modules?${queryString}`
          : `/subjects/${subjectId}/teaching-modules`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "TeachingModule", id })),
              { type: "TeachingModule", id: "LIST" },
            ]
          : [{ type: "TeachingModule", id: "LIST" }],
    }),
    getTeachingModuleMeta: builder.query({
      query: ({ subjectId }) => `/subjects/${subjectId}/teaching-modules/meta`,
      providesTags: [{ type: "TeachingModule", id: "META" }],
    }),
    getTeachingModuleDetail: builder.query({
      query: (id) => `/teaching-modules/${id}`,
      providesTags: (result, error, id) => [{ type: "TeachingModule", id }],
    }),
    addTeachingModule: builder.mutation({
      query: (body) => ({
        url: "/teaching-modules",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "TeachingModule", id: "LIST" },
        { type: "TeachingModule", id: "META" },
        "TeachingModuleMonitoring",
      ],
    }),
    updateTeachingModule: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/teaching-modules/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "TeachingModule", id },
        { type: "TeachingModule", id: "LIST" },
        { type: "TeachingModule", id: "META" },
        "TeachingModuleMonitoring",
      ],
    }),
    uploadTeachingModule: builder.mutation({
      query: (formData) => ({
        url: "/teaching-modules/upload",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [
        { type: "TeachingModule", id: "LIST" },
        "TeachingModuleMonitoring",
      ],
    }),
    updateUploadedTeachingModule: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/teaching-modules/${id}/upload`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "TeachingModule", id },
        { type: "TeachingModule", id: "LIST" },
        "TeachingModuleMonitoring",
      ],
    }),
    uploadTeachingModuleImage: builder.mutation({
      query: (formData) => ({
        url: "/teaching-modules/images",
        method: "POST",
        body: formData,
      }),
    }),
    uploadTeachingModuleCover: builder.mutation({
      query: (formData) => ({
        url: "/teaching-modules/cover",
        method: "POST",
        body: formData,
      }),
    }),
    deleteTeachingModule: builder.mutation({
      query: (id) => ({
        url: `/teaching-modules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "TeachingModule", id: "LIST" },
        "TeachingModuleMonitoring",
      ],
    }),
    getTeachingModuleMonitoring: builder.query({
      query: ({ subjectId, gradeId } = {}) => {
        const searchParams = new URLSearchParams();
        if (subjectId) searchParams.set("subject_id", subjectId);
        if (gradeId) searchParams.set("grade_id", gradeId);
        const queryString = searchParams.toString();
        return queryString
          ? `/teaching-module-monitoring?${queryString}`
          : "/teaching-module-monitoring";
      },
      providesTags: ["TeachingModuleMonitoring"],
    }),
  }),
});

export const {
  useGetTeachingModulesQuery,
  useGetTeachingModuleMetaQuery,
  useGetTeachingModuleDetailQuery,
  useLazyGetTeachingModuleDetailQuery,
  useAddTeachingModuleMutation,
  useUpdateTeachingModuleMutation,
  useUploadTeachingModuleMutation,
  useUpdateUploadedTeachingModuleMutation,
  useUploadTeachingModuleImageMutation,
  useUploadTeachingModuleCoverMutation,
  useDeleteTeachingModuleMutation,
  useGetTeachingModuleMonitoringQuery,
} = ApiTeachingModule;
