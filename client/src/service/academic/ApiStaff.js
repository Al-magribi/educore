import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiHomeStaff = createApi({
  reducerPath: "ApiHomeStaff",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/academic" }),
  tagTypes: ["Staff"],
  endpoints: (builder) => ({
    getStaff: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/staff?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
      providesTags: ["Staff"],
    }),
    addStaff: builder.mutation({
      query: (body) => ({
        url: "/staff",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Staff"],
    }),
    updateStaff: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/staff/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Staff"],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({
        url: `/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Staff"],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useAddStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = ApiHomeStaff;
