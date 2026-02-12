import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiClass = createApi({
  reducerPath: "ApiClass",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }), // Sesuaikan dengan route backend Anda
  tagTypes: ["Class", "Student"],
  endpoints: (builder) => ({
    // --- CLASS ENDPOINTS ---
    getClasses: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-class?page=${page}&limit=${limit}&search=${search}`,
      // Menyediakan tag unik per item dan tag umum 'LIST'
      providesTags: (result) =>
        result
          ? [
              ...result.classes.map(({ id }) => ({ type: "Class", id })),
              { type: "Class", id: "LIST" },
            ]
          : [{ type: "Class", id: "LIST" }],
    }),
    addClass: builder.mutation({
      query: (body) => ({
        url: "/add-class",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Class", id: "LIST" }],
    }),
    updateClass: builder.mutation({
      query: (body) => ({
        url: "/update-class",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Class"],
    }),

    deleteClass: builder.mutation({
      query: (id) => ({
        url: `/delete-class/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Class", id: "LIST" }],
    }),

    // --- STUDENT ENDPOINTS ---
    getStudents: builder.query({
      query: ({ page = 1, limit = 10, search = "", classid }) =>
        `/get-students?page=${page}&limit=${limit}&search=${search}&classid=${classid}`,
      providesTags: ["Student"],
    }),
    addStudent: builder.mutation({
      query: (body) => ({
        url: "/add-student",
        method: "POST",
        body,
      }),
      // Refresh Student list DAN Class list (karena jumlah siswa di card kelas berubah)
      invalidatesTags: ["Student", { type: "Class", id: "LIST" }],
    }),
    uploadStudents: builder.mutation({
      query: (body) => ({
        url: "/upload-students",
        method: "POST",
        body, // Array: [[entry, nis, name, gender, classid], ...]
      }),
      invalidatesTags: ["Student", { type: "Class", id: "LIST" }],
    }),
    deleteStudent: builder.mutation({
      query: (id) => ({
        url: `/delete-student?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Student", { type: "Class", id: "LIST" }],
    }),
  }),
});

export const {
  useGetClassesQuery,
  useAddClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetStudentsQuery,
  useAddStudentMutation,
  useUploadStudentsMutation,
  useDeleteStudentMutation,
} = ApiClass;
