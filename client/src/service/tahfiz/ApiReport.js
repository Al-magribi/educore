import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiReport = createApi({
  reducerPath: "ApiTahfizReport",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/tahfiz" }),
  tagTypes: ["TahfizReport", "TahfizDailyReport"],
  endpoints: (builder) => ({
    getTahfizReportOptions: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) searchParams.set("homebase_id", params.homebase_id);
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.grade_id) searchParams.set("grade_id", params.grade_id);
        if (params.class_id) searchParams.set("class_id", params.class_id);

        const queryString = searchParams.toString();
        return queryString ? `/report/options?${queryString}` : "/report/options";
      },
      providesTags: ["TahfizReport"],
      transformResponse: (response) => response.data,
    }),
    getTahfizReportSummary: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) searchParams.set("homebase_id", params.homebase_id);
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.grade_id) searchParams.set("grade_id", params.grade_id);
        if (params.class_id) searchParams.set("class_id", params.class_id);

        const queryString = searchParams.toString();
        return queryString ? `/report/summary?${queryString}` : "/report/summary";
      },
      providesTags: ["TahfizReport"],
      transformResponse: (response) => response.data,
    }),
    getMusyrifReportSummary: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.halaqoh_id) searchParams.set("halaqoh_id", params.halaqoh_id);

        const queryString = searchParams.toString();
        return queryString
          ? `/report/musyrif-summary?${queryString}`
          : "/report/musyrif-summary";
      },
      providesTags: ["TahfizReport"],
      transformResponse: (response) => response.data,
    }),
    getDailyReportOptions: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) searchParams.set("homebase_id", params.homebase_id);
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.grade_id) searchParams.set("grade_id", params.grade_id);
        if (params.class_id) searchParams.set("class_id", params.class_id);

        const queryString = searchParams.toString();
        return queryString ? `/report/daily/options?${queryString}` : "/report/daily/options";
      },
      providesTags: ["TahfizDailyReport"],
      transformResponse: (response) => response.data,
    }),
    getDailyReportStudents: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) searchParams.set("homebase_id", params.homebase_id);
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.grade_id) searchParams.set("grade_id", params.grade_id);
        if (params.class_id) searchParams.set("class_id", params.class_id);

        const queryString = searchParams.toString();
        return queryString ? `/report/daily/students?${queryString}` : "/report/daily/students";
      },
      providesTags: ["TahfizDailyReport"],
      transformResponse: (response) => response.data,
    }),
    getDailyReportRecords: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.homebase_id) searchParams.set("homebase_id", params.homebase_id);
        if (params.periode_id) searchParams.set("periode_id", params.periode_id);
        if (params.grade_id) searchParams.set("grade_id", params.grade_id);
        if (params.class_id) searchParams.set("class_id", params.class_id);
        if (params.page) searchParams.set("page", params.page);
        if (params.page_size) searchParams.set("page_size", params.page_size);
        if (params.date_from) searchParams.set("date_from", params.date_from);
        if (params.date_to) searchParams.set("date_to", params.date_to);

        const queryString = searchParams.toString();
        return queryString ? `/report/daily/records?${queryString}` : "/report/daily/records";
      },
      providesTags: ["TahfizDailyReport"],
      transformResponse: (response) => ({
        rows: response.data || [],
        meta: response.meta || {},
      }),
    }),
    validateDailyReportPayload: builder.mutation({
      query: (payload = {}) => ({
        url: "/report/daily/validate",
        method: "POST",
        body: payload,
      }),
      transformResponse: (response) => response.data,
    }),
    createDailyReportRecord: builder.mutation({
      query: (payload = {}) => ({
        url: "/report/daily/records",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["TahfizDailyReport", "TahfizReport"],
      transformResponse: (response) => response.data,
    }),
    updateDailyReportRecord: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/report/daily/records/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["TahfizDailyReport", "TahfizReport"],
      transformResponse: (response) => response.data,
    }),
    deleteDailyReportRecord: builder.mutation({
      query: ({ id }) => ({
        url: `/report/daily/records/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TahfizDailyReport", "TahfizReport"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const {
  useGetTahfizReportOptionsQuery,
  useGetTahfizReportSummaryQuery,
  useGetMusyrifReportSummaryQuery,
  useGetDailyReportOptionsQuery,
  useGetDailyReportStudentsQuery,
  useGetDailyReportRecordsQuery,
  useValidateDailyReportPayloadMutation,
  useCreateDailyReportRecordMutation,
  useUpdateDailyReportRecordMutation,
  useDeleteDailyReportRecordMutation,
} = ApiReport;
