import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiLms = createApi({
  reducerPath: "ApiLms",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["LmsSubject", "LmsChapter", "LmsContent", "LmsMeta"],
  endpoints: (builder) => ({
    getSubjects: builder.query({
      query: () => "/subjects",
      providesTags: ["LmsSubject"],
    }),
    getGrades: builder.query({
      query: ({ subjectId }) => `/grades?subject_id=${subjectId || ""}`,
      providesTags: ["LmsMeta"],
    }),
    getClasses: builder.query({
      query: ({ subjectId, gradeId }) =>
        `/classes?subject_id=${subjectId || ""}&grade_id=${gradeId || ""}`,
      providesTags: ["LmsMeta"],
    }),
    getChapters: builder.query({
      query: ({ subjectId, gradeId, classId }) =>
        `/subjects/${subjectId}/chapters?grade_id=${gradeId || ""}&class_id=${
          classId || ""
        }`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "LmsChapter", id })),
              { type: "LmsChapter", id: "LIST" },
            ]
          : [{ type: "LmsChapter", id: "LIST" }],
    }),
    addChapter: builder.mutation({
      query: ({ subjectId, ...body }) => ({
        url: `/subjects/${subjectId}/chapters`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "LmsChapter", id: "LIST" }],
    }),
    updateChapter: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/chapters/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "LmsChapter", id },
        { type: "LmsChapter", id: "LIST" },
      ],
    }),
    deleteChapter: builder.mutation({
      query: (id) => ({
        url: `/chapters/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "LmsChapter", id: "LIST" }],
    }),
    getContents: builder.query({
      query: ({ chapterId }) => `/chapters/${chapterId}/contents`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "LmsContent", id })),
              { type: "LmsContent", id: "LIST" },
            ]
          : [{ type: "LmsContent", id: "LIST" }],
    }),
    addContent: builder.mutation({
      query: ({ chapterId, ...body }) => ({
        url: `/chapters/${chapterId}/contents`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "LmsContent", id: "LIST" }],
    }),
    updateContent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/contents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "LmsContent", id },
        { type: "LmsContent", id: "LIST" },
      ],
    }),
    deleteContent: builder.mutation({
      query: (id) => ({
        url: `/contents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "LmsContent", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSubjectsQuery,
  useGetGradesQuery,
  useGetClassesQuery,
  useGetChaptersQuery,
  useAddChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useGetContentsQuery,
  useAddContentMutation,
  useUpdateContentMutation,
  useDeleteContentMutation,
} = ApiLms;
