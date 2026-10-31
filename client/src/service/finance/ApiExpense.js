import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiReport } from "./ApiReport";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, value);
  });

  return searchParams.toString();
};

const normalizeExpense = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  periode_id: item.periode_id ? Number(item.periode_id) : null,
  amount: Number(item.amount || 0),
  created_by: item.created_by ? Number(item.created_by) : null,
  updated_by: item.updated_by ? Number(item.updated_by) : null,
});

export const ApiExpense = createApi({
  reducerPath: "ApiExpense",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["Expense", "ExpenseOption", "ExpenseCategory"],
  endpoints: (builder) => ({
    getExpenseOptions: builder.query({
      query: (params) => `/expense/options?${buildQueryString(params)}`,
      providesTags: ["ExpenseOption", "ExpenseCategory"],
    }),

    getExpenseCategories: builder.query({
      query: (params) => `/expense/categories?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "ExpenseCategory",
                id: item.id,
              })),
              { type: "ExpenseCategory", id: "LIST" },
            ]
          : [{ type: "ExpenseCategory", id: "LIST" }],
    }),

    addExpenseCategory: builder.mutation({
      query: (body) => ({
        url: "/expense/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "ExpenseCategory", id: "LIST" },
        "ExpenseOption",
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            ApiReport.util.invalidateTags(["FinanceBudget", "FinanceReport"]),
          );
        } catch {
          // ignore
        }
      },
    }),

    updateExpenseCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/expense/categories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "ExpenseCategory", id: "LIST" },
        { type: "ExpenseCategory", id: arg?.id },
        "ExpenseOption",
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            ApiReport.util.invalidateTags(["FinanceBudget", "FinanceReport"]),
          );
        } catch {
          // ignore
        }
      },
    }),

    deleteExpenseCategory: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/expense/categories/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ExpenseCategory", id: "LIST" }, "ExpenseOption"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            ApiReport.util.invalidateTags(["FinanceBudget", "FinanceReport"]),
          );
        } catch {
          // ignore
        }
      },
    }),

    getExpenses: builder.query({
      query: (params) => `/expense?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeExpense),
          summary: {
            total_count: Number(response.summary?.total_count || 0),
            total_amount: Number(response.summary?.total_amount || 0),
            daily_amount: Number(response.summary?.daily_amount || 0),
            daily_count: Number(response.summary?.daily_count || 0),
            monthly_amount: Number(response.summary?.monthly_amount || 0),
            monthly_count: Number(response.summary?.monthly_count || 0),
            by_category: Array.isArray(response.summary?.by_category)
              ? response.summary.by_category.map((item) => ({
                  category: item.category,
                  count: Number(item.count || 0),
                  amount: Number(item.amount || 0),
                }))
              : [],
          },
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: "Expense", id: item.id })),
              { type: "Expense", id: "LIST" },
            ]
          : [{ type: "Expense", id: "LIST" }],
    }),

    getExpenseById: builder.query({
      query: ({ id, ...params }) =>
        `/expense/${id}?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: normalizeExpense(response.data),
        };
      },
      providesTags: (_result, _error, arg) => [
        { type: "Expense", id: arg?.id },
      ],
    }),

    addExpense: builder.mutation({
      query: (body) => ({
        url: "/expense",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Expense", id: "LIST" }],
    }),

    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/expense/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Expense", id: "LIST" },
        { type: "Expense", id: arg?.id },
      ],
    }),

    deleteExpense: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/expense/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Expense", id: "LIST" }],
    }),
  }),
});

export const {
  useGetExpenseOptionsQuery,
  useGetExpenseCategoriesQuery,
  useAddExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useAddExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = ApiExpense;
