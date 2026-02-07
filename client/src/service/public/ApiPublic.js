import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiPublic = createApi({
  reducerPath: "ApiPublic",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/public" }),
  tagTypes: ["Public"],
  endpoints: (builder) => ({
    getGrades: builder.query({
      query: () => "/get-grades",
      providesTags: ["Public"],
    }),
    getClasses: builder.query({
      query: ({ gradeId }) => ({
        url: "/get-classes",
        params: { gradeId },
      }),
      providesTags: ["Public"],
    }),
    getSubject: builder.query({
      query: () => "/get-subject",
      providesTags: ["Public"],
    }),
    getMajors: builder.query({
      query: () => "/get-majors",
      providesTags: ["Public"],
    }),
    getPeriodes: builder.query({
      query: () => "/get-periodes",
      providesTags: ["Public"],
    }),
  }),
});

export const {
  useGetGradesQuery,
  useGetClassesQuery,
  useGetSubjectQuery,
  useGetMajorsQuery,
  useGetPeriodesQuery,
} = ApiPublic;
