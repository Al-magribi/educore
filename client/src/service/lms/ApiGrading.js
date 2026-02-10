import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiGrading = createApi({
  reducerPath: "ApiGrading",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/grading" }),
  tagTypes: ["GradingMeta", "GradingClass", "GradingStudent", "GradingFormative"],
  endpoints: (builder) => ({
    getGradingMeta: builder.query({
      query: () => "/meta",
      providesTags: ["GradingMeta"],
    }),
    getGradingClasses: builder.query({
      query: ({ subjectId }) => `/classes?subject_id=${subjectId || ""}`,
      providesTags: ["GradingClass"],
    }),
    getGradingStudents: builder.query({
      query: ({ subjectId, classId }) =>
        `/students?subject_id=${subjectId || ""}&class_id=${classId || ""}`,
      providesTags: ["GradingStudent"],
    }),
    getGradingAttitude: builder.query({
      query: ({ subjectId, classId, month, semester }) =>
        `/attitude?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&month=${encodeURIComponent(month || "")}&semester=${
          semester || ""
        }`,
      providesTags: ["GradingStudent"],
    }),
    getGradingFormative: builder.query({
      query: ({
        subjectId,
        classId,
        month,
        semester,
        chapterId,
        subchapterId,
      }) =>
        `/formative?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&month=${encodeURIComponent(month || "")}&semester=${
          semester || ""
        }&chapter_id=${chapterId || ""}&subchapter_id=${subchapterId || ""}`,
      providesTags: ["GradingFormative"],
    }),
    submitGradingAttitude: builder.mutation({
      query: (body) => ({
        url: "/attitude/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GradingStudent"],
    }),
    submitGradingFormative: builder.mutation({
      query: (body) => ({
        url: "/formative/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GradingFormative"],
    }),
  }),
});

export const {
  useGetGradingMetaQuery,
  useGetGradingClassesQuery,
  useGetGradingStudentsQuery,
  useGetGradingAttitudeQuery,
  useSubmitGradingAttitudeMutation,
  useGetGradingFormativeQuery,
  useSubmitGradingFormativeMutation,
} = ApiGrading;
