import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
};

export const ApiContribution = createApi({
  reducerPath: "ApiContribution",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: [
    "ContributionOption",
    "ContributionStudent",
    "ContributionOfficer",
    "ContributionTransaction",
    "StudentContributionOverview",
    "StudentContributionStudent",
    "StudentContributionTransaction",
  ],
  endpoints: (builder) => ({
    getContributionOptions: builder.query({
      query: () => "/contribution/options",
      providesTags: ["ContributionOption"],
    }),

    getContributionStudents: builder.query({
      query: (params) => `/contribution/students?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ student_id: id }) => ({
                type: "ContributionStudent",
                id,
              })),
              { type: "ContributionStudent", id: "LIST" },
            ]
          : [{ type: "ContributionStudent", id: "LIST" }],
    }),

    getContributionTransactions: builder.query({
      query: (params) =>
        `/contribution/transactions?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ transaction_id: id }) => ({
                type: "ContributionTransaction",
                id,
              })),
              { type: "ContributionTransaction", id: "LIST" },
            ]
          : [{ type: "ContributionTransaction", id: "LIST" }],
    }),

    addContributionTransaction: builder.mutation({
      query: (body) => ({
        url: "/contribution/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "ContributionOption",
        { type: "ContributionStudent", id: "LIST" },
        { type: "ContributionOfficer", id: "LIST" },
        { type: "ContributionTransaction", id: "LIST" },
      ],
    }),

    updateContributionTransaction: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/contribution/transactions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "ContributionOption",
        { type: "ContributionStudent", id: "LIST" },
        { type: "ContributionOfficer", id: "LIST" },
        { type: "ContributionTransaction", id },
        { type: "ContributionTransaction", id: "LIST" },
      ],
    }),

    deleteContributionTransaction: builder.mutation({
      query: (id) => ({
        url: `/contribution/transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "ContributionOption",
        { type: "ContributionStudent", id: "LIST" },
        { type: "ContributionOfficer", id: "LIST" },
        { type: "ContributionTransaction", id: "LIST" },
      ],
    }),

    getContributionOfficers: builder.query({
      query: () => "/contribution/officers",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ student_id: id }) => ({
                type: "ContributionOfficer",
                id,
              })),
              { type: "ContributionOfficer", id: "LIST" },
            ]
          : [{ type: "ContributionOfficer", id: "LIST" }],
    }),

    assignContributionOfficer: builder.mutation({
      query: (body) => ({
        url: "/contribution/officers",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "ContributionOption",
        { type: "ContributionStudent", id: "LIST" },
        { type: "ContributionOfficer", id: "LIST" },
      ],
    }),

    removeContributionOfficer: builder.mutation({
      query: (studentId) => ({
        url: `/contribution/officers/${studentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, studentId) => [
        "ContributionOption",
        { type: "ContributionStudent", id: "LIST" },
        { type: "ContributionOfficer", id: studentId },
        { type: "ContributionOfficer", id: "LIST" },
      ],
    }),

    getStudentContributionOverview: builder.query({
      query: () => "/contribution/student/overview",
      providesTags: ["StudentContributionOverview"],
    }),

    getStudentContributionStudents: builder.query({
      query: (params) =>
        `/contribution/student/students?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ student_id: id }) => ({
                type: "StudentContributionStudent",
                id,
              })),
              { type: "StudentContributionStudent", id: "LIST" },
            ]
          : [{ type: "StudentContributionStudent", id: "LIST" }],
    }),

    getStudentContributionTransactions: builder.query({
      query: (params) =>
        `/contribution/student/transactions?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ transaction_id: id }) => ({
                type: "StudentContributionTransaction",
                id,
              })),
              { type: "StudentContributionTransaction", id: "LIST" },
            ]
          : [{ type: "StudentContributionTransaction", id: "LIST" }],
    }),

    addStudentContributionTransaction: builder.mutation({
      query: (body) => ({
        url: "/contribution/student/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "StudentContributionOverview",
        { type: "StudentContributionStudent", id: "LIST" },
        { type: "StudentContributionTransaction", id: "LIST" },
      ],
    }),

    updateStudentContributionTransaction: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/contribution/student/transactions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "StudentContributionOverview",
        { type: "StudentContributionStudent", id: "LIST" },
        { type: "StudentContributionTransaction", id },
        { type: "StudentContributionTransaction", id: "LIST" },
      ],
    }),

    deleteStudentContributionTransaction: builder.mutation({
      query: (id) => ({
        url: `/contribution/student/transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "StudentContributionOverview",
        { type: "StudentContributionStudent", id: "LIST" },
        { type: "StudentContributionTransaction", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetContributionOptionsQuery,
  useGetContributionStudentsQuery,
  useGetContributionTransactionsQuery,
  useAddContributionTransactionMutation,
  useUpdateContributionTransactionMutation,
  useDeleteContributionTransactionMutation,
  useGetContributionOfficersQuery,
  useAssignContributionOfficerMutation,
  useRemoveContributionOfficerMutation,
  useGetStudentContributionOverviewQuery,
  useGetStudentContributionStudentsQuery,
  useGetStudentContributionTransactionsQuery,
  useAddStudentContributionTransactionMutation,
  useUpdateStudentContributionTransactionMutation,
  useDeleteStudentContributionTransactionMutation,
} = ApiContribution;
