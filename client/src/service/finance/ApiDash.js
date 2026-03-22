import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiDash = createApi({
  reducerPath: "ApiFinanceDash",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["FinanceDashboard"],
  endpoints: (builder) => ({
    getFinanceDashboard: builder.query({
      query: () => "/dashboard",
      providesTags: ["FinanceDashboard"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const { useGetFinanceDashboardQuery } = ApiDash;
