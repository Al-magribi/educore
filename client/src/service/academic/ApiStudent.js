import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiStudent = createApi({
  reducerPath: "ApiStudent",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/academic" }), // Sesuaikan dengan setup proxy/backend
  tagTypes: ["Student"],
  endpoints: (builder) => ({
    // GET (List)
    getStudents: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/students?page=${page}&limit=${limit}&search=${search}`,
      providesTags: ["Student"],
    }),

    // POST (Add)
    addStudent: builder.mutation({
      query: (body) => ({
        url: "/create-student",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Student"],
    }),

    // PUT (Update)
    updateStudent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-student/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Student"],
    }),

    // DELETE (Remove)
    deleteStudent: builder.mutation({
      query: (id) => ({
        url: `/delete-student/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Student"],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useAddStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} = ApiStudent;
