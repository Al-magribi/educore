import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAlquran = createApi({
  reducerPath: "ApiAlquran",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/tahfiz" }),
  tagTypes: ["Alquran"],
  endpoints: (builder) => ({
    getSurahList: builder.query({
      query: () => "/alquran/surah",
      providesTags: ["Alquran"],
      transformResponse: (response) => response.data,
    }),
    getJuzList: builder.query({
      query: () => "/alquran/juz",
      providesTags: ["Alquran"],
      transformResponse: (response) => response.data,
    }),
    updateJuzLineCount: builder.mutation({
      query: ({ number, line_count }) => ({
        url: `/alquran/juz/${number}/line-count`,
        method: "PUT",
        body: { line_count },
      }),
      invalidatesTags: ["Alquran"],
    }),
  }),
});

export const {
  useGetSurahListQuery,
  useGetJuzListQuery,
  useUpdateJuzLineCountMutation,
} = ApiAlquran;
