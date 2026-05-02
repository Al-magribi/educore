import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiQuestion = createApi({
  reducerPath: "ApiQuestion",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/cbt" }),
  tagTypes: ["Question", "AiQuestionDraft"],
  endpoints: (builder) => ({
    getRubricTemplates: builder.query({
      query: () => ({
        url: "/rubric-templates",
        method: "GET",
      }),
      providesTags: ["Question"],
    }),

    getQuestions: builder.query({
      query: ({ bankid }) => ({
        url: `/get-questions/${bankid}`,
        method: "GET",
      }),
      providesTags: ["Question"],
    }),

    createQuestion: builder.mutation({
      query: (body) => ({
        url: "/create-question",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Question"],
    }),

    updateQuestion: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-question/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Question"],
    }),

    deleteQuestion: builder.mutation({
      query: (id) => ({
        url: `/delete-question/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Question"],
    }),
    bulkCreateQuestion: builder.mutation({
      query: (questions) => ({
        url: "/bulk-create", // Sesuaikan dengan path di RouterQuestion
        method: "POST",
        body: { questions },
      }),
      invalidatesTags: ["Questions"],
    }),
    bulkDeleteQuestions: builder.mutation({
      query: (ids) => ({
        url: "/bulk-delete",
        method: "POST", // Menggunakan POST untuk mengirim array ID di body
        body: { ids },
      }),
      invalidatesTags: ["Question"],
    }),

    getAiQuestionGenerateMeta: builder.query({
      query: ({ bankId, gradeId }) => ({
        url: `/banks/${bankId}/ai-generate/meta`,
        method: "GET",
        params: gradeId ? { grade_id: gradeId } : undefined,
      }),
      providesTags: (result, error, { bankId }) => [
        { type: "AiQuestionDraft", id: `META-${bankId}` },
      ],
      transformResponse: (response) => response.data,
    }),

    startAiQuestionGenerate: builder.mutation({
      query: ({ bankId, ...body }) => ({
        url: `/banks/${bankId}/ai-generate/start`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { bankId }) => [
        { type: "AiQuestionDraft", id: `META-${bankId}` },
      ],
    }),

    getAiQuestionGenerateLatest: builder.query({
      query: ({ bankId }) => ({
        url: `/banks/${bankId}/ai-generate/latest`,
        method: "GET",
      }),
      providesTags: (result, error, { bankId }) => [
        { type: "AiQuestionDraft", id: `LATEST-${bankId}` },
      ],
      transformResponse: (response) => response.data,
    }),

    getAiQuestionJobDetail: builder.query({
      query: ({ bankId, jobId }) => ({
        url: `/banks/${bankId}/ai-generate/jobs/${jobId}`,
        method: "GET",
      }),
      providesTags: (result, error, { jobId }) => [
        { type: "AiQuestionDraft", id: `JOB-${jobId}` },
      ],
      transformResponse: (response) => response.data,
    }),

    updateAiQuestionDraft: builder.mutation({
      query: ({ draftId, ...body }) => ({
        url: `/ai-question-drafts/${draftId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { draftId }) => [
        { type: "AiQuestionDraft", id: `DRAFT-${draftId}` },
        { type: "AiQuestionDraft", id: "LIST" },
      ],
    }),

    approveAiQuestionDraft: builder.mutation({
      query: ({ draftId }) => ({
        url: `/ai-question-drafts/${draftId}/approve`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { draftId }) => [
        { type: "AiQuestionDraft", id: `DRAFT-${draftId}` },
        { type: "AiQuestionDraft", id: "LIST" },
        "Question",
      ],
    }),

    approveAiQuestionJob: builder.mutation({
      query: ({ jobId, draft_ids }) => ({
        url: `/ai-question-jobs/${jobId}/approve`,
        method: "POST",
        body: { draft_ids },
      }),
      invalidatesTags: (result, error, { jobId }) => [
        { type: "AiQuestionDraft", id: `JOB-${jobId}` },
        { type: "AiQuestionDraft", id: "LIST" },
        "Question",
      ],
    }),

    discardAiQuestionDraft: builder.mutation({
      query: ({ draftId }) => ({
        url: `/ai-question-drafts/${draftId}/discard`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { draftId }) => [
        { type: "AiQuestionDraft", id: `DRAFT-${draftId}` },
        { type: "AiQuestionDraft", id: "LIST" },
      ],
    }),

    discardAiQuestionJob: builder.mutation({
      query: ({ jobId }) => ({
        url: `/ai-question-jobs/${jobId}/discard`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { jobId }) => [
        { type: "AiQuestionDraft", id: `JOB-${jobId}` },
        { type: "AiQuestionDraft", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRubricTemplatesQuery,
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useBulkCreateQuestionMutation,
  useBulkDeleteQuestionsMutation,
  useGetAiQuestionGenerateMetaQuery,
  useStartAiQuestionGenerateMutation,
  useGetAiQuestionGenerateLatestQuery,
  useGetAiQuestionJobDetailQuery,
  useUpdateAiQuestionDraftMutation,
  useApproveAiQuestionDraftMutation,
  useApproveAiQuestionJobMutation,
  useDiscardAiQuestionDraftMutation,
  useDiscardAiQuestionJobMutation,
} = ApiQuestion;
