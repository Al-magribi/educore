import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiHomebase = createApi({
  reducerPath: "ApiHomebase",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Homebase"],
  endpoints: (builder) => ({
    // GET dengan parameter page & limit
    getHomebase: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-homebase?page=${page}&limit=${limit}&search=${search}`,
      // Invalidate list jika ada mutasi, tapi berikan ID unik per item
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Homebase", id })),
              { type: "Homebase", id: "LIST" },
            ]
          : [{ type: "Homebase", id: "LIST" }],
    }),

    // CREATE
    addHomebase: builder.mutation({
      query: (body) => ({
        url: "/add-homebase",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Homebase", id: "LIST" }],
    }),

    // UPDATE
    updateHomebase: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-homebase/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Homebase", id },
        { type: "Homebase", id: "LIST" },
      ],
    }),

    // DELETE
    deleteHomebase: builder.mutation({
      query: (id) => ({
        url: `/delete-homebase/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Homebase", id: "LIST" }],
    }),

    detailHomebase: builder.query({
      query: ({ id, periode_id }) => ({
        url: `/detail-homebase/${id}`,
        params: { periode_id }, // Kirim sebagai query param (?periode_id=...)
      }),
      providesTags: (result, error, arg) => [{ type: "Homebase", id: arg.id }],
    }),
  }),
});

export const {
  useGetHomebaseQuery,
  useAddHomebaseMutation,
  useUpdateHomebaseMutation,
  useDeleteHomebaseMutation,

  // PERBAIKAN EXPORT:
  useDetailHomebaseQuery, // Hook standar (langsung fetch)
  useLazyDetailHomebaseQuery, // Hook lazy (fetch saat ditrigger) <--- TAMBAHKAN INI
} = ApiHomebase;
