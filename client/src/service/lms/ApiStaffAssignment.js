import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiStaffAssignment = createApi({
  reducerPath: "ApiStaffAssignment",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["StaffAssignment"],
  endpoints: (builder) => ({
    getStaffAssignments: builder.query({
      query: () => "/staff-assignments",
      providesTags: [{ type: "StaffAssignment", id: "LIST" }],
    }),
    saveStaffAssignment: builder.mutation({
      query: ({ teacherId, assignment_types }) => ({
        url: `/staff-assignments/${teacherId}`,
        method: "PUT",
        body: { assignment_types },
      }),
      invalidatesTags: [{ type: "StaffAssignment", id: "LIST" }],
    }),
  }),
});

export const {
  useGetStaffAssignmentsQuery,
  useSaveStaffAssignmentMutation,
} = ApiStaffAssignment;
