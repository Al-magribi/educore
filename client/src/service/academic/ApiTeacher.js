import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiHomeTeacher = createApi({
  reducerPath: "ApiHomeTeacher",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/academic" }),
  tagTypes: ["Teacher", "Class", "Subject"],
  endpoints: (builder) => ({
    // --- TEACHER CRUD (Updated for Pagination) ---
    getTeachers: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/teacher?page=${page}&limit=${limit}&search=${search}`,
      providesTags: ["Teacher"],
    }),
    addTeacher: builder.mutation({
      query: (body) => ({
        url: "/teacher",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Teacher", "Class"], // Invalidate Class karena update wali kelas
    }),
    updateTeacher: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/teacher/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Teacher", "Class"],
    }),
    deleteTeacher: builder.mutation({
      query: (id) => ({
        url: `/teacher/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teacher", "Class"],
    }),

    // --- HELPER FOR DROPDOWNS ---
    // Asumsi endpoint ini sudah ada di router lain, tapi kita define disini untuk kemudahan
    getClassesList: builder.query({
      query: () => "/classes",
      providesTags: ["Class"],
    }),
    getSubjectsList: builder.query({
      query: () => "/subjects",
      providesTags: ["Subject"],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useAddTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useGetClassesListQuery,
  useGetSubjectsListQuery,
} = ApiHomeTeacher;
