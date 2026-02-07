import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTeacher = createApi({
  reducerPath: "ApiTeacher",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }), // Pastikan route sesuai backend
  tagTypes: ["Teacher"],
  endpoints: (builder) => ({
    // GET
    getTeachers: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-teachers?page=${page}&limit=${limit}&search=${search}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Teacher", id })),
              { type: "Teacher", id: "LIST" },
            ]
          : [{ type: "Teacher", id: "LIST" }],
    }),

    // ADD
    addTeacher: builder.mutation({
      query: (body) => ({
        url: "/add-teacher",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Teacher", id: "LIST" }],
    }),

    // UPDATE
    updateTeacher: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-teacher/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Teacher", id },
        { type: "Teacher", id: "LIST" },
      ],
    }),

    // DELETE
    deleteTeacher: builder.mutation({
      query: (id) => ({
        url: `/delete-teacher/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Teacher", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useAddTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
} = ApiTeacher;
