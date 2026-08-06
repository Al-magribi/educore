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
  tagTypes: ["FinanceReport", "FinanceReportOption", "FinanceReportHomebase"],
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
  }),
});

export const {
  useGetReportHomebasesQuery,
  useGetReportOptionsQuery,
  useGetRevenueReportQuery,
} = ApiReport;
