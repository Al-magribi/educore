import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTarget = createApi({
  reducerPath: "ApiTarget",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/tahfiz" }),
  tagTypes: ["TargetPlan", "TargetOption"],
  endpoints: (builder) => ({
    getTargetOptions: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        const queryString = searchParams.toString();
        return queryString ? `/target/options?${queryString}` : "/target/options";
      },
      providesTags: ["TargetOption"],
      transformResponse: (response) => response.data,
    }),
    getTargetPlans: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) {
          searchParams.set("homebase_id", params.homebase_id);
        }
        if (params.periode_id) {
          searchParams.set("periode_id", params.periode_id);
        }
        if (params.grade_id) {
          searchParams.set("grade_id", params.grade_id);
        }
        if (params.search) {
          searchParams.set("search", params.search);
        }
        const queryString = searchParams.toString();
        return queryString ? `/target/plans?${queryString}` : "/target/plans";
      },
      providesTags: ["TargetPlan"],
      transformResponse: (response) => response.data,
    }),
    createTargetPlan: builder.mutation({
      query: (body) => ({
        url: "/target/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TargetPlan", "TargetOption"],
    }),
    updateTargetPlan: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/target/plans/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["TargetPlan", "TargetOption"],
    }),
    deleteTargetPlan: builder.mutation({
      query: (id) => ({
        url: `/target/plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TargetPlan", "TargetOption"],
    }),
  }),
});

export const {
  useGetTargetOptionsQuery,
  useGetTargetPlansQuery,
  useCreateTargetPlanMutation,
  useUpdateTargetPlanMutation,
  useDeleteTargetPlanMutation,
} = ApiTarget;
