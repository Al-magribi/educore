import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiCenterDash = createApi({
  reducerPath: "ApiCenterDash",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    // Endpoint untuk mengambil semua ringkasan dashboard
    getDashboardSummary: builder.query({
      query: () => "/summary",
      providesTags: ["Dashboard"],
      // Transform response untuk mempermudah konsumsi di UI
      transformResponse: (response) => response.data,
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = ApiCenterDash;
