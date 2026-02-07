import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiExam = createApi({
  reducerPath: "ApiExam",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/cbt" }),
  tagTypes: ["Exam"],
  endpoints: (builder) => ({
    getExams: builder.query({
      query: ({ page = 1, search = "" }) => ({
        url: "/get-exams",
        method: "GET",
        params: { page, limit: 10, search },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Exam", id })),
              { type: "Exam", id: "LIST" },
            ]
          : [{ type: "Exam", id: "LIST" }],
    }),
    getBanksForExam: builder.query({
      query: ({ teacher_id }) => ({
        url: "/get-banks-for-exam",
        method: "GET",
        params: { teacher_id },
      }),
    }),
    getStudentExams: builder.query({
      query: () => "/student-exams",
      providesTags: ["Exam"],
      transformResponse: (response) => response.data,
    }),
    getStudentExamQuestions: builder.query({
      query: ({ exam_id }) => `/student-exams/${exam_id}/questions`,
      providesTags: ["Exam"],
    }),
    getExamAttendance: builder.query({
      query: ({ exam_id }) => `/exam-attendance/${exam_id}`,
      providesTags: ["Exam"],
    }),
    allowExamStudent: builder.mutation({
      query: ({ exam_id, student_id, question_id }) => ({
        url: `/exam-attendance/${exam_id}/student/${student_id}/allow`,
        method: "PUT",
        body: { question_id },
      }),
      invalidatesTags: ["Exam"],
    }),
    repeatExamStudent: builder.mutation({
      query: ({ exam_id, student_id }) => ({
        url: `/exam-attendance/${exam_id}/student/${student_id}/repeat`,
        method: "DELETE",
      }),
      invalidatesTags: ["Exam"],
    }),
    finishExamStudent: builder.mutation({
      query: ({ exam_id, student_id }) => ({
        url: `/exam-attendance/${exam_id}/student/${student_id}/finish`,
        method: "PUT",
      }),
      invalidatesTags: ["Exam"],
    }),
    getExamScores: builder.query({
      query: ({ exam_id }) => `/exam-attendance/${exam_id}/scores`,
      providesTags: ["Exam"],
    }),
    getExamStudentAnswers: builder.query({
      query: ({ exam_id, student_id }) =>
        `/exam-attendance/${exam_id}/student/${student_id}/answers`,
      providesTags: ["Exam"],
      transformResponse: (response) => response.data,
    }),
    saveExamStudentScore: builder.mutation({
      query: ({ exam_id, student_id, question_id, score }) => ({
        url: `/exam-attendance/${exam_id}/student/${student_id}/answers/${question_id}/score`,
        method: "PUT",
        body: { score },
      }),
    }),
    getStudentExamAnswers: builder.query({
      query: ({ exam_id }) => `/student-exams/${exam_id}/answers`,
      providesTags: ["Exam"],
      transformResponse: (response) => response.data,
    }),
    saveStudentExamAnswer: builder.mutation({
      query: ({ exam_id, ...body }) => ({
        url: `/student-exams/${exam_id}/answers`,
        method: "POST",
        body,
      }),
    }),
    finishStudentExam: builder.mutation({
      query: ({ exam_id }) => ({
        url: `/student-exams/${exam_id}/finish`,
        method: "POST",
      }),
      invalidatesTags: ["Exam"],
    }),
    enterStudentExam: builder.mutation({
      query: (body) => ({
        url: "/student-exams/enter",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Exam"],
    }),
    createExam: builder.mutation({
      query: (body) => ({
        url: "/create-exam",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Exam", id: "LIST" }],
    }),
    updateExam: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-exam/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Exam", id },
        { type: "Exam", id: "LIST" },
      ],
    }),
    deleteExam: builder.mutation({
      query: (id) => ({
        url: `/delete-exam/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Exam", id: "LIST" }],
    }),
  }),
});

export const {
  useGetExamsQuery,
  useGetBanksForExamQuery,
  useGetStudentExamsQuery,
  useGetStudentExamQuestionsQuery,
  useGetExamAttendanceQuery,
  useAllowExamStudentMutation,
  useRepeatExamStudentMutation,
  useFinishExamStudentMutation,
  useGetExamScoresQuery,
  useGetExamStudentAnswersQuery,
  useSaveExamStudentScoreMutation,
  useGetStudentExamAnswersQuery,
  useSaveStudentExamAnswerMutation,
  useEnterStudentExamMutation,
  useFinishStudentExamMutation,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
} = ApiExam;
