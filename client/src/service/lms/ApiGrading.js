import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiGrading = createApi({
  reducerPath: "ApiGrading",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/grading" }),
  tagTypes: [
    "GradingMeta",
    "GradingClass",
    "GradingStudent",
    "GradingFormative",
    "GradingSummative",
    "GradingFinal",
  ],
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
    getGradingSummative: builder.query({
      query: ({
        subjectId,
        classId,
        month,
        semester,
        chapterId,
        subchapterId,
      }) =>
        `/summative?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&month=${encodeURIComponent(month || "")}&semester=${
          semester || ""
        }&chapter_id=${chapterId || ""}&subchapter_id=${subchapterId || ""}`,
      providesTags: ["GradingSummative"],
    }),
    getGradingFinal: builder.query({
      query: ({ subjectId, classId, semester }) =>
        `/final?subject_id=${subjectId || ""}&class_id=${classId || ""}&semester=${
          semester || ""
        }`,
      providesTags: ["GradingFinal"],
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
    submitGradingSummative: builder.mutation({
      query: (body) => ({
        url: "/summative/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GradingSummative"],
    }),
    submitGradingFinal: builder.mutation({
      query: (body) => ({
        url: "/final/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GradingFinal"],
    }),
    deleteGradingFinal: builder.mutation({
      query: (body) => ({
        url: "/final",
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["GradingFinal"],
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
  useGetGradingSummativeQuery,
  useSubmitGradingSummativeMutation,
  useGetGradingFinalQuery,
  useSubmitGradingFinalMutation,
  useDeleteGradingFinalMutation,
} = ApiGrading;
