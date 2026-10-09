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

export const ApiDash = createApi({
  reducerPath: "ApiFinanceDash",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["FinanceDashboard"],
  endpoints: (builder) => ({
    getFinanceDashboard: builder.query({
      query: (params) => {
        const queryString = buildQueryString(params);
        return queryString ? `/dashboard?${queryString}` : "/dashboard";
      },
      providesTags: ["FinanceDashboard"],
      transformResponse: (response) => response?.data || {},
    }),
  }),
});

export const { useGetFinanceDashboardQuery } = ApiDash;
