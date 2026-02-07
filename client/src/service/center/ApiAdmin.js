import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAdmin = createApi({
  reducerPath: "ApiAdmin",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Admin"],
  endpoints: (builder) => ({
    // GET List Admin
    getAdmins: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-admins?page=${page}&limit=${limit}&search=${search}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Admin", id })),
              { type: "Admin", id: "LIST" },
            ]
          : [{ type: "Admin", id: "LIST" }],
    }),

    // CREATE Admin
    addAdmin: builder.mutation({
      query: (body) => ({
        url: "/add-admin",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Admin", id: "LIST" }],
    }),

    // UPDATE Admin
    updateAdmin: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-admin/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Admin", id },
        { type: "Admin", id: "LIST" },
      ],
    }),

    // DELETE Admin
    deleteAdmin: builder.mutation({
      query: (id) => ({
        url: `/delete-admin/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Admin", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAdminsQuery,
  useAddAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} = ApiAdmin;
