import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
};

export const ApiSaving = createApi({
  reducerPath: "ApiSaving",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["SavingOption", "SavingStudent", "SavingTransaction", "MySaving"],
  endpoints: (builder) => ({
    getMySavingOverview: builder.query({
      query: (params) => `/saving/me?${buildQueryString(params)}`,
      providesTags: ["MySaving"],
    }),

    getSavingOptions: builder.query({
      query: (params) => `/saving/options?${buildQueryString(params)}`,
      providesTags: ["SavingOption"],
    }),

    getSavingStudents: builder.query({
      query: (params) => `/saving/students?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ student_id: id }) => ({
                type: "SavingStudent",
                id,
              })),
              { type: "SavingStudent", id: "LIST" },
            ]
          : [{ type: "SavingStudent", id: "LIST" }],
    }),

    getSavingTransactions: builder.query({
      query: (params) => `/saving/transactions?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ transaction_id: id }) => ({
                type: "SavingTransaction",
                id,
              })),
              { type: "SavingTransaction", id: "LIST" },
            ]
          : [{ type: "SavingTransaction", id: "LIST" }],
    }),

    addSavingTransaction: builder.mutation({
      query: (body) => ({
        url: "/saving/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "SavingOption",
        { type: "SavingStudent", id: "LIST" },
        { type: "SavingTransaction", id: "LIST" },
      ],
    }),

    updateSavingTransaction: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saving/transactions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "SavingOption",
        { type: "SavingStudent", id: "LIST" },
        { type: "SavingTransaction", id },
        { type: "SavingTransaction", id: "LIST" },
      ],
    }),

    deleteSavingTransaction: builder.mutation({
      query: (id) => ({
        url: `/saving/transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "SavingOption",
        { type: "SavingStudent", id: "LIST" },
        { type: "SavingTransaction", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMySavingOverviewQuery,
  useGetSavingOptionsQuery,
  useGetSavingStudentsQuery,
  useGetSavingTransactionsQuery,
  useAddSavingTransactionMutation,
  useUpdateSavingTransactionMutation,
  useDeleteSavingTransactionMutation,
} = ApiSaving;
