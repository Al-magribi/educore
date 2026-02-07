import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiBank = createApi({
  reducerPath: "ApiBank",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/cbt" }),
  tagTypes: ["Bank", "Subject"], // Tag Types
  endpoints: (builder) => ({
    // 1. Get Banks: Tambahkan tagging spesifik 'LIST'
    getBanks: builder.query({
      query: ({ page = 1, search = "" }) => ({
        url: "/get-banks",
        method: "GET",
        params: { page, limit: 10, search },
      }),
      // REVISI: Memberikan tag 'LIST' dan tag untuk setiap item ID
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Bank", id })),
              { type: "Bank", id: "LIST" },
            ]
          : [{ type: "Bank", id: "LIST" }],
    }),

    getSubjects: builder.query({
      query: () => "/get-subjects",
      providesTags: ["Subject"],
    }),

    // 2. Mutations: Invalidate 'LIST' agar list refresh otomatis
    createBank: builder.mutation({
      query: (body) => ({
        url: "/create-bank",
        method: "POST",
        body,
      }),
      // REVISI: Saat create, hancurkan cache 'LIST'
      invalidatesTags: [{ type: "Bank", id: "LIST" }],
    }),

    updateBank: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-bank/${id}`,
        method: "PUT",
        body,
      }),
      // REVISI: Invalidate spesifik ID dan LIST
      invalidatesTags: (result, error, { id }) => [
        { type: "Bank", id },
        { type: "Bank", id: "LIST" },
      ],
    }),

    deleteBank: builder.mutation({
      query: (id) => ({
        url: `/delete-bank/${id}`,
        method: "DELETE",
      }),
      // REVISI: Invalidate LIST saat hapus
      invalidatesTags: [{ type: "Bank", id: "LIST" }],
    }),

    getTeachers: builder.query({
      query: () => "/get-teachers",
    }),

    getBanksForGroup: builder.query({
      query: ({ teacher_id }) => ({
        url: "/get-banks-for-group",
        method: "GET",
        params: { teacher_id },
      }),
    }),

    getQuestionsForGroup: builder.query({
      query: ({ bank_ids }) => ({
        url: "/get-questions-for-group",
        method: "GET",
        params: { bank_ids },
      }),
    }),

    createGroupedBank: builder.mutation({
      query: (body) => ({
        url: "/group-bank",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Bank", id: "LIST" }],
    }),
  }),
});

export const {
  useGetBanksQuery,
  useGetSubjectsQuery,
  useCreateBankMutation,
  useUpdateBankMutation,
  useDeleteBankMutation,
  useGetTeachersQuery,
  useGetBanksForGroupQuery,
  useGetQuestionsForGroupQuery,
  useCreateGroupedBankMutation,
} = ApiBank;
