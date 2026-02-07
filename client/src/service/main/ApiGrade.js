import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiGrade = createApi({
  reducerPath: "ApiGrade",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }),
  tagTypes: ["Grade"],
  endpoints: (builder) => ({
    // GET List
    getGrades: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-grade?page=${page}&limit=${limit}&search=${search}`,
      providesTags: ["Grade"],
    }),

    // POST Create
    addGrade: builder.mutation({
      query: (body) => ({
        url: "/add-grade",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Grade"],
    }),

    // PUT Update
    editGrade: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/edit-grade/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Grade"],
    }),

    // DELETE Remove
    deleteGrade: builder.mutation({
      query: (id) => ({
        url: `/delete-grade/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Grade"],
    }),
  }),
});

export const {
  useGetGradesQuery,
  useAddGradeMutation,
  useEditGradeMutation,
  useDeleteGradeMutation,
} = ApiGrade;
