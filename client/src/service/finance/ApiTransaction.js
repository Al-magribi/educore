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

export const ApiTransaction = createApi({
  reducerPath: "ApiTransaction",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["FinanceTransaction", "FinanceTransactionOption"],
  endpoints: (builder) => ({
    getTransactionOptions: builder.query({
      query: (params) => `/transactions/options?${buildQueryString(params)}`,
      keepUnusedDataFor: 0,
      providesTags: ["FinanceTransactionOption"],
    }),

    getTransactions: builder.query({
      query: (params) => `/transactions?${buildQueryString(params)}`,
      transformResponse: (response) => ({
        ...response,
        data: Array.isArray(response?.data)
          ? response.data.map((item) => ({
              ...item,
              key: item.id,
            }))
          : [],
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({
                type: "FinanceTransaction",
                id,
              })),
              { type: "FinanceTransaction", id: "LIST" },
            ]
          : [{ type: "FinanceTransaction", id: "LIST" }],
    }),

    createTransaction: builder.mutation({
      query: (body) => ({
        url: "/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "FinanceTransactionOption",
        { type: "FinanceTransaction", id: "LIST" },
      ],
    }),

    updateTransaction: builder.mutation({
      query: ({ category, id, homebase_id, ...body }) => ({
        url: homebase_id
          ? `/transactions/${category}/${id}?${buildQueryString({ homebase_id })}`
          : `/transactions/${category}/${id}`,
        method: "PUT",
        body: {
          ...body,
          homebase_id,
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        "FinanceTransactionOption",
        { type: "FinanceTransaction", id },
        { type: "FinanceTransaction", id: "LIST" },
      ],
    }),

    deleteTransaction: builder.mutation({
      query: ({ category, id, homebase_id }) => ({
        url: homebase_id
          ? `/transactions/${category}/${id}?${buildQueryString({ homebase_id })}`
          : `/transactions/${category}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [
        "FinanceTransactionOption",
        { type: "FinanceTransaction", id },
        { type: "FinanceTransaction", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTransactionOptionsQuery,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = ApiTransaction;
