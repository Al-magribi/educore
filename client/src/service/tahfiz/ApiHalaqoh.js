import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiHalaqoh = createApi({
  reducerPath: "ApiHalaqoh",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/tahfiz" }),
  tagTypes: ["Halaqoh", "Musyrif", "HalaqohOption"],
  endpoints: (builder) => ({
    getHalaqohOptions: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        const queryString = searchParams.toString();
        return queryString ? `/halaqoh/options?${queryString}` : "/halaqoh/options";
      },
      providesTags: ["HalaqohOption"],
      transformResponse: (response) => response.data,
    }),

    getMusyrifList: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        const queryString = searchParams.toString();
        return queryString ? `/halaqoh/musyrif?${queryString}` : "/halaqoh/musyrif";
      },
      providesTags: ["Musyrif"],
      transformResponse: (response) => response.data,
    }),

    createMusyrif: builder.mutation({
      query: (body) => ({
        url: "/halaqoh/musyrif",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Musyrif", "HalaqohOption"],
    }),

    updateMusyrif: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/halaqoh/musyrif/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Musyrif", "HalaqohOption", "Halaqoh"],
    }),

    deleteMusyrif: builder.mutation({
      query: (id) => ({
        url: `/halaqoh/musyrif/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Musyrif", "HalaqohOption", "Halaqoh"],
    }),

    getHalaqohList: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        if (params.periode_id) {
          searchParams.set("periode_id", params.periode_id);
        }
        const queryString = searchParams.toString();
        return queryString ? `/halaqoh/list?${queryString}` : "/halaqoh/list";
      },
      providesTags: ["Halaqoh"],
      transformResponse: (response) => response.data,
    }),

    createHalaqoh: builder.mutation({
      query: (body) => ({
        url: "/halaqoh/list",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Halaqoh", "Musyrif"],
    }),

    updateHalaqoh: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/halaqoh/list/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Halaqoh", "Musyrif"],
    }),

    deleteHalaqoh: builder.mutation({
      query: (id) => ({
        url: `/halaqoh/list/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Halaqoh", "Musyrif"],
    }),
  }),
});

export const {
  useGetHalaqohOptionsQuery,
  useGetMusyrifListQuery,
  useCreateMusyrifMutation,
  useUpdateMusyrifMutation,
  useDeleteMusyrifMutation,
  useGetHalaqohListQuery,
  useCreateHalaqohMutation,
  useUpdateHalaqohMutation,
  useDeleteHalaqohMutation,
} = ApiHalaqoh;
