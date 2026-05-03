import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTahfizDashboard = createApi({
  reducerPath: "ApiTahfizDashboard",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/tahfiz" }),
  tagTypes: ["TahfizDashboard"],
  endpoints: (builder) => ({
    getStudentSummary: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        if (params.periode_id) {
          searchParams.set("periode_id", params.periode_id);
        }
        const queryString = searchParams.toString();
        return queryString
          ? `/dashboard/student-summary?${queryString}`
          : "/dashboard/student-summary";
      },
      providesTags: ["TahfizDashboard"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const { useGetStudentSummaryQuery } = ApiTahfizDashboard;
