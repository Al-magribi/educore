import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiMajor = createApi({
  reducerPath: "ApiMajor",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }),
  tagTypes: ["Major"],
  endpoints: (builder) => ({
    // GET List
    getMajors: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-major?page=${page}&limit=${limit}&search=${search}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Major", id })),
              { type: "Major", id: "LIST" },
            ]
          : [{ type: "Major", id: "LIST" }],
    }),

    // ADD
    addMajor: builder.mutation({
      query: (body) => ({
        url: "/add-major",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Major", id: "LIST" }],
    }),

    // UPDATE
    updateMajor: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-major/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Major", id },
        { type: "Major", id: "LIST" },
      ],
    }),

    // DELETE
    deleteMajor: builder.mutation({
      query: (id) => ({
        url: `/delete-major/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Major", id: "LIST" }],
    }),
  }),
});

export const {
  useGetMajorsQuery,
  useAddMajorMutation,
  useUpdateMajorMutation,
  useDeleteMajorMutation,
} = ApiMajor;
