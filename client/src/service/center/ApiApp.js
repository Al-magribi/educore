import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiApp = createApi({
  reducerPath: "ApiApp",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Configs"],
  endpoints: (builder) => ({
    getPublicConfig: builder.query({
      query: () => "/public-config",
      providesTags: ["Configs"], // Auto-refetch jika ada update config
    }),

    getConfigs: builder.query({
      query: () => "/config",
      providesTags: ["Configs"],
      transformResponse: (response) => response.data,
    }),

    updateConfigs: builder.mutation({
      query: (body) => ({
        url: "/config",
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Configs"],
    }),

    uploadConfigImage: builder.mutation({
      query: (formData) => ({
        url: "/upload-config",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetPublicConfigQuery,
  useGetConfigsQuery,
  useUpdateConfigsMutation,
  useUploadConfigImageMutation, // Export hooks baru
} = ApiApp;
