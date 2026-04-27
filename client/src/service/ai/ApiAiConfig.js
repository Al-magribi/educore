import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAiConfig = createApi({
  reducerPath: "ApiAiConfig",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/ai" }),
  tagTypes: ["AiConfig"],
  endpoints: (builder) => ({
    getAiConfig: builder.query({
      query: () => "/config",
      providesTags: ["AiConfig"],
      transformResponse: (response) => response.data,
    }),

    updateAiConfig: builder.mutation({
      query: (body) => ({
        url: "/config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["AiConfig"],
    }),

    testAiConnection: builder.mutation({
      query: (body) => ({
        url: "/test-connection",
        method: "POST",
        body,
      }),
    }),

    transcribeAudio: builder.mutation({
      query: (formData) => ({
        url: "/transcribe",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetAiConfigQuery,
  useTranscribeAudioMutation,
  useUpdateAiConfigMutation,
  useTestAiConnectionMutation,
} = ApiAiConfig;
