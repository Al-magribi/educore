import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiPeriode = createApi({
  reducerPath: "ApiPeriode",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/main" }), // Sesuaikan dengan base URL backend Anda
  tagTypes: ["Periode"],
  endpoints: (builder) => ({
    // GET List
    getPeriodes: builder.query({
      query: ({ page = 1, limit = 10, search = "", homebase_id }) =>
        `/get-periode?page=${page}&limit=${limit}&search=${search}&homebase_id=${homebase_id}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Periode", id })),
              { type: "Periode", id: "LIST" },
            ]
          : [{ type: "Periode", id: "LIST" }],
    }),

    // ADD
    addPeriode: builder.mutation({
      query: (body) => ({
        url: "/add-periode",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Periode", id: "LIST" }],
    }),

    // UPDATE Name
    updatePeriode: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-periode/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Periode", id },
        { type: "Periode", id: "LIST" },
      ],
    }),

    // SET ACTIVE
    setActivePeriode: builder.mutation({
      query: (id) => ({
        url: `/set-active-periode/${id}`,
        method: "PUT",
      }),
      // Invalidate LIST karena status aktif periode lain ikut berubah
      invalidatesTags: [{ type: "Periode", id: "LIST" }],
    }),

    // DELETE
    deletePeriode: builder.mutation({
      query: (id) => ({
        url: `/delete-periode/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Periode", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPeriodesQuery,
  useAddPeriodeMutation,
  useUpdatePeriodeMutation,
  useSetActivePeriodeMutation,
  useDeletePeriodeMutation,
} = ApiPeriode;
