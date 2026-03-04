import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiStudentDatabase = createApi({
  reducerPath: "ApiStudentDatabase",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/database" }),
  tagTypes: ["StudentDatabase"],
  endpoints: (builder) => ({
    getStudentDatabase: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        const {
          page = 1,
          limit = 10,
          search = "",
          grade_id = "",
          class_id = "",
          scope = "all",
        } = params;

        queryParams.set("page", String(page));
        queryParams.set("limit", String(limit));
        queryParams.set("search", search);
        queryParams.set("grade_id", String(grade_id));
        queryParams.set("class_id", String(class_id));
        queryParams.set("scope", String(scope));

        return `/students?${queryParams.toString()}`;
      },
      providesTags: ["StudentDatabase"],
    }),
    updateStudentDatabase: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/students/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["StudentDatabase"],
    }),
    getMyStudentProfile: builder.query({
      query: () => ({
        url: "/student-profile",
        method: "GET",
      }),
      providesTags: ["StudentDatabase"],
    }),
    updateMyStudentProfile: builder.mutation({
      query: (body) => ({
        url: "/student-profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["StudentDatabase"],
    }),
    getParentStudents: builder.query({
      query: () => ({
        url: "/parent/students",
        method: "GET",
      }),
      providesTags: ["StudentDatabase"],
    }),
    updateParentStudent: builder.mutation({
      query: ({ studentId, ...body }) => ({
        url: `/parent/students/${studentId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["StudentDatabase"],
    }),
  }),
});

export const {
  useGetStudentDatabaseQuery,
  useUpdateStudentDatabaseMutation,
  useGetMyStudentProfileQuery,
  useUpdateMyStudentProfileMutation,
  useGetParentStudentsQuery,
  useUpdateParentStudentMutation,
} = ApiStudentDatabase;
