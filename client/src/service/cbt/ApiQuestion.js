import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiQuestion = createApi({
  reducerPath: "ApiQuestion",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/cbt" }),
  tagTypes: ["Question"],
  endpoints: (builder) => ({
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
  }),
});

export const {
  useGetQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useBulkCreateQuestionMutation,
  useBulkDeleteQuestionsMutation,
} = ApiQuestion;
