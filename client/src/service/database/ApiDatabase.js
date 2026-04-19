import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiStudentDatabase = createApi({
  reducerPath: "ApiStudentDatabase",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/database" }),
  tagTypes: ["StudentDatabase", "ParentAccount", "StudentDocument"],
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
    getStudentDocuments: builder.query({
      query: (studentId) => ({
        url: `/students/${studentId}/documents`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: "StudentDocument", id: studentId },
      ],
    }),
    uploadStudentDocument: builder.mutation({
      query: ({ studentId, body }) => ({
        url: `/students/${studentId}/documents`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: "StudentDocument", id: studentId },
        "StudentDatabase",
      ],
    }),
    deleteStudentDocument: builder.mutation({
      query: ({ studentId, documentId }) => ({
        url: `/students/${studentId}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: "StudentDocument", id: studentId },
        "StudentDatabase",
      ],
    }),
    getParentAccounts: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        const { page = 1, limit = 10, search = "", scope = "all" } = params;

        queryParams.set("page", String(page));
        queryParams.set("limit", String(limit));
        queryParams.set("search", search);
        queryParams.set("scope", String(scope));

        return `/parents?${queryParams.toString()}`;
      },
      providesTags: ["ParentAccount"],
    }),
    getParentReferenceStudents: builder.query({
      query: (params = {}) => ({
        url: "/parents/reference/students",
        method: "GET",
        params,
      }),
      providesTags: ["ParentAccount"],
    }),
    createParentAccount: builder.mutation({
      query: (body) => ({
        url: "/parents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ParentAccount"],
    }),
    updateParentAccount: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/parents/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ParentAccount"],
    }),
    deleteParentAccount: builder.mutation({
      query: ({ id, scope = "all" }) => ({
        url: `/parents/${id}`,
        method: "DELETE",
        params: { scope },
      }),
      invalidatesTags: ["ParentAccount"],
    }),
    importParentAccounts: builder.mutation({
      query: (body) => ({
        url: "/parents/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ParentAccount"],
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
  useGetStudentDocumentsQuery,
  useUploadStudentDocumentMutation,
  useDeleteStudentDocumentMutation,
  useGetParentAccountsQuery,
  useGetParentReferenceStudentsQuery,
  useCreateParentAccountMutation,
  useUpdateParentAccountMutation,
  useDeleteParentAccountMutation,
  useImportParentAccountsMutation,
} = ApiStudentDatabase;
