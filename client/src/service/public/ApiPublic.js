import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiPublic = createApi({
  reducerPath: "ApiPublic",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/public" }),
  tagTypes: ["Public"],
  endpoints: (builder) => ({
    getGrades: builder.query({
      query: ({ homebaseId } = {}) => ({
        url: "/get-grades",
        params: homebaseId ? { homebase_id: homebaseId } : undefined,
      }),
      providesTags: ["Public"],
    }),
    getClasses: builder.query({
      query: ({ gradeId, homebaseId } = {}) => ({
        url: "/get-classes",
        params: {
          gradeId,
          ...(homebaseId ? { homebase_id: homebaseId } : {}),
        },
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
