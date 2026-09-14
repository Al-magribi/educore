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

export const ApiReport = createApi({
  reducerPath: "ApiFinanceReport",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: [
    "FinanceReport",
    "FinanceReportOption",
    "FinanceReportHomebase",
    "FinanceBudget",
    "FinanceClosing",
  ],
  endpoints: (builder) => ({
    getReportHomebases: builder.query({
      query: (params) => {
        const queryString = buildQueryString(params);
        return queryString
          ? `/reports/homebases?${queryString}`
          : "/reports/homebases";
      },
      providesTags: ["FinanceReportHomebase"],
    }),

    getReportOptions: builder.query({
      query: (params) => `/reports/options?${buildQueryString(params)}`,
      providesTags: ["FinanceReportOption"],
    }),

    getRevenueReport: builder.query({
      query: (params) => `/reports/revenue?${buildQueryString(params)}`,
      providesTags: ["FinanceReport"],
    }),

    getBudgets: builder.query({
      query: (params) => `/reports/budgets?${buildQueryString(params)}`,
      providesTags: ["FinanceBudget"],
    }),

    saveBudgets: builder.mutation({
      query: (body) => ({
        url: "/reports/budgets",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FinanceBudget", "FinanceReport"],
    }),

    getClosings: builder.query({
      query: (params) => `/reports/closings?${buildQueryString(params)}`,
      providesTags: ["FinanceClosing"],
    }),

    lockClosing: builder.mutation({
      query: (body) => ({
        url: "/reports/closings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["FinanceClosing"],
    }),

    unlockClosing: builder.mutation({
      query: ({ id, ...params }) => ({
        url: `/reports/closings/${id}?${buildQueryString(params)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FinanceClosing"],
    }),
  }),
});

export const {
  useGetReportHomebasesQuery,
  useGetReportOptionsQuery,
  useGetRevenueReportQuery,
  useGetBudgetsQuery,
  useSaveBudgetsMutation,
  useGetClosingsQuery,
  useLockClosingMutation,
  useUnlockClosingMutation,
} = ApiReport;
