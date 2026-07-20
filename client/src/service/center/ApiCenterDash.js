import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiCenterDash = createApi({
  reducerPath: "ApiCenterDash",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: ({ homebase_id, periode_id } = {}) => ({
        url: "/summary",
        params: {
          ...(homebase_id != null ? { homebase_id } : {}),
          ...(periode_id != null ? { periode_id } : {}),
        },
      }),
      providesTags: ["Dashboard"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = ApiCenterDash;
