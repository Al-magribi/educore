import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiGrading = createApi({
  reducerPath: "ApiGrading",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms/grading" }),
  tagTypes: ["GradingMeta", "GradingClass", "GradingStudent"],
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
      query: ({ subjectId, classId, month }) =>
        `/attitude?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&month=${encodeURIComponent(month || "")}`,
      providesTags: ["GradingStudent"],
    }),
    submitGradingAttitude: builder.mutation({
      query: (body) => ({
        url: "/attitude/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GradingStudent"],
    }),
  }),
});

export const {
  useGetGradingMetaQuery,
  useGetGradingClassesQuery,
  useGetGradingStudentsQuery,
  useGetGradingAttitudeQuery,
  useSubmitGradingAttitudeMutation,
} = ApiGrading;
