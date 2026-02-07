import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAnalysis = createApi({
  reducerPath: "ApiAnalysis",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }), // Sesuaikan base URL
  endpoints: (builder) => ({
    // 1. Segmentasi Siswa (List dengan Pagination & Filter)
    getStudentSegment: builder.query({
      query: ({ page = 1, limit = 10, search = "", age = "", gender = "" }) => {
        let url = `/get-student-segment?page=${page}&limit=${limit}&search=${search}`;
        if (age) url += `&age=${age}`;
        if (gender) url += `&gender=${gender}`;
        return url;
      },
    }),

    // 2. Distribusi Geografis (Chart Data)
    getGeoDistribution: builder.query({
      query: () => "/get-geo-distribution",
    }),

    // 3. Pekerjaan Orang Tua (Chart Data)
    getParentJobs: builder.query({
      query: () => "/get-parent-jobs",
    }),
  }),
});

export const {
  useGetStudentSegmentQuery,
  useGetGeoDistributionQuery,
  useGetParentJobsQuery,
} = ApiAnalysis;
