import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const normalizeConfigPayload = (configs = []) =>
  configs.map((item) => {
    if (item?.key !== "domain") return item;
    const rawValue = typeof item.value === "string" ? item.value.trim() : "";
    const normalizedDomain = rawValue
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
    return { ...item, value: normalizedDomain };
  });

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
        body: {
          ...body,
          configs: normalizeConfigPayload(body?.configs || []),
        },
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
