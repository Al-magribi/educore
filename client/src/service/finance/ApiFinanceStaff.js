import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiFinanceStaff = createApi({
  reducerPath: "ApiFinanceStaff",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["FinanceStaffAssignment"],
  endpoints: (builder) => ({
    getFinanceStaffAssignments: builder.query({
      query: () => "/staff-assignments",
      providesTags: [{ type: "FinanceStaffAssignment", id: "LIST" }],
    }),
    saveFinanceStaffAssignment: builder.mutation({
      query: ({ teacherId, active }) => ({
        url: `/staff-assignments/${teacherId}`,
        method: "PUT",
        body: { active },
      }),
      invalidatesTags: [{ type: "FinanceStaffAssignment", id: "LIST" }],
    }),
  }),
});

export const {
  useGetFinanceStaffAssignmentsQuery,
  useSaveFinanceStaffAssignmentMutation,
} = ApiFinanceStaff;
