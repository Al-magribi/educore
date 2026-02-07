import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiSubject = createApi({
  reducerPath: "ApiSubject",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/academic" }),
  tagTypes: ["Category", "Branch", "Subject"],
  endpoints: (builder) => ({
    // --- CATEGORY ---
    getSubjectCategories: builder.query({
      query: () => "/category",
      providesTags: ["Category"],
    }),
    addSubjectCategory: builder.mutation({
      query: (body) => ({ url: "/category", method: "POST", body }),
      invalidatesTags: ["Category"],
    }),
    deleteSubjectCategory: builder.mutation({
      query: (id) => ({ url: `/category/${id}`, method: "DELETE" }),
      invalidatesTags: ["Category", "Branch", "Subject"],
    }),

    // --- BRANCH ---
    getSubjectBranches: builder.query({
      query: (categoryId) => {
        // Jika categoryId null/undefined, akan fetch semua branch
        const params = categoryId ? `?category_id=${categoryId}` : "";
        return `/branch${params}`;
      },
      providesTags: ["Branch"],
    }),
    addSubjectBranch: builder.mutation({
      query: (body) => ({ url: "/branch", method: "POST", body }),
      invalidatesTags: ["Branch"],
    }),
    deleteSubjectBranch: builder.mutation({
      query: (id) => ({ url: `/branch/${id}`, method: "DELETE" }),
      invalidatesTags: ["Branch", "Subject"],
    }),

    // --- SUBJECT ---
    getSubjects: builder.query({
      // Tambahkan param category_id
      query: ({
        page = 1,
        limit = 10,
        search = "",
        branch_id = "",
        category_id = "",
      }) =>
        `/subject?page=${page}&limit=${limit}&search=${search}&branch_id=${branch_id}&category_id=${category_id}`,
      providesTags: ["Subject"],
    }),
    addSubject: builder.mutation({
      query: (body) => ({ url: "/subject", method: "POST", body }),
      invalidatesTags: ["Subject"],
    }),
    updateSubject: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/subject/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Subject"],
    }),
    deleteSubject: builder.mutation({
      query: (id) => ({ url: `/subject/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subject"],
    }),
  }),
});

export const {
  useGetSubjectCategoriesQuery,
  useAddSubjectCategoryMutation,
  useDeleteSubjectCategoryMutation,
  useGetSubjectBranchesQuery,
  useAddSubjectBranchMutation,
  useDeleteSubjectBranchMutation,
  useGetSubjectsQuery,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} = ApiSubject;
