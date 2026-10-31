import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTu = createApi({
  reducerPath: "ApiTu",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: [
    "TuBuku",
    "TuInspection",
    "TuMutation",
    "TuAlumni",
    "TuDiploma",
    "TuLetter",
    "TuFacility",
  ],
  endpoints: (builder) => ({
    getTuMeta: builder.query({
      query: () => "/tu/meta",
      providesTags: [{ type: "TuBuku", id: "META" }],
    }),
    getTuStudents: builder.query({
      query: ({ search = "" } = {}) =>
        `/tu/students?search=${encodeURIComponent(search)}`,
    }),
    getBukuInduk: builder.query({
      query: ({ search = "", entryYear = "", status = "" } = {}) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (entryYear) params.set("entry_year", entryYear);
        if (status) params.set("status", status);
        const query = params.toString();
        return `/tu/buku-induk${query ? `?${query}` : ""}`;
      },
      providesTags: [{ type: "TuBuku", id: "LIST" }],
    }),
    openBukuInduk: builder.mutation({
      query: (body) => ({
        url: "/tu/buku-induk/open",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuBuku", id: "LIST" }],
    }),
    getBukuDetail: builder.query({
      query: (id) => `/tu/buku-induk/${id}`,
      providesTags: (_result, _error, id) => [{ type: "TuBuku", id }],
    }),
    saveBukuDetail: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/tu/buku-induk/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "TuBuku", id },
        { type: "TuBuku", id: "LIST" },
      ],
    }),
    uploadBukuPhoto: builder.mutation({
      query: ({ id, body }) => ({
        url: `/tu/buku-induk/${id}/photo`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "TuBuku", id }],
    }),
    syncBukuScores: builder.mutation({
      query: (id) => ({
        url: `/tu/buku-induk/${id}/sync`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [{ type: "TuBuku", id }],
    }),
    saveBukuOverrides: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/tu/buku-induk/${id}/overrides`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "TuBuku", id }],
    }),
    addBukuScore: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/tu/buku-induk/${id}/scores`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "TuBuku", id }],
    }),
    deleteBukuScore: builder.mutation({
      query: ({ id, scoreId }) => ({
        url: `/tu/buku-induk/${id}/scores/${scoreId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "TuBuku", id }],
    }),
    getInspections: builder.query({
      query: () => "/tu/inspections",
      providesTags: [{ type: "TuInspection", id: "LIST" }],
    }),
    saveInspection: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/tu/inspections/${id}` : "/tu/inspections",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuInspection", id: "LIST" }],
    }),
    deleteInspection: builder.mutation({
      query: (id) => ({ url: `/tu/inspections/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "TuInspection", id: "LIST" }],
    }),
    getMutations: builder.query({
      query: () => "/tu/mutations",
      providesTags: [{ type: "TuMutation", id: "LIST" }],
    }),
    saveMutation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/tu/mutations/${id}` : "/tu/mutations",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuMutation", id: "LIST" }, { type: "TuBuku" }],
    }),
    deleteMutation: builder.mutation({
      query: (id) => ({ url: `/tu/mutations/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "TuMutation", id: "LIST" }, { type: "TuBuku" }],
    }),
    getAlumni: builder.query({
      query: ({ search = "" } = {}) =>
        `/tu/alumni?search=${encodeURIComponent(search)}`,
      providesTags: [{ type: "TuAlumni", id: "LIST" }],
    }),
    saveAlumni: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/tu/alumni/${id}` : "/tu/alumni",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuAlumni", id: "LIST" }, { type: "TuBuku" }],
    }),
    deleteAlumni: builder.mutation({
      query: (id) => ({ url: `/tu/alumni/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "TuAlumni", id: "LIST" }, { type: "TuBuku" }],
    }),
    getDiplomas: builder.query({
      query: ({ kind = "" } = {}) => `/tu/diplomas${kind ? `?kind=${kind}` : ""}`,
      providesTags: [{ type: "TuDiploma", id: "LIST" }],
    }),
    saveDiploma: builder.mutation({
      query: ({ id, body }) => ({
        url: id ? `/tu/diplomas/${id}` : "/tu/diplomas",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuDiploma", id: "LIST" }, { type: "TuBuku" }, { type: "TuAlumni" }],
    }),
    deleteDiploma: builder.mutation({
      query: (id) => ({ url: `/tu/diplomas/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "TuDiploma", id: "LIST" }, { type: "TuBuku" }],
    }),
    getLetters: builder.query({
      query: ({ direction = "", search = "" } = {}) => {
        const params = new URLSearchParams();
        if (direction) params.set("direction", direction);
        if (search) params.set("search", search);
        const query = params.toString();
        return `/tu/letters${query ? `?${query}` : ""}`;
      },
      providesTags: [{ type: "TuLetter", id: "LIST" }],
    }),
    nextLetterNumber: builder.mutation({
      query: (body) => ({
        url: "/tu/letters/next-number",
        method: "POST",
        body,
      }),
    }),
    saveLetter: builder.mutation({
      query: ({ id, body }) => ({
        url: id ? `/tu/letters/${id}` : "/tu/letters",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "TuLetter", id: "LIST" }],
    }),
    deleteLetter: builder.mutation({
      query: (id) => ({ url: `/tu/letters/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "TuLetter", id: "LIST" }],
    }),
    getFacilities: builder.query({
      query: ({ search = "" } = {}) =>
        `/tu/facilities?search=${encodeURIComponent(search)}`,
      providesTags: [{ type: "TuFacility", id: "LIST" }],
    }),
    getFacilityReport: builder.query({
      query: () => "/tu/facilities/report",
      providesTags: [{ type: "TuFacility", id: "REPORT" }],
    }),
    saveFacility: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/tu/facilities/${id}` : "/tu/facilities",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [
        { type: "TuFacility", id: "LIST" },
        { type: "TuFacility", id: "REPORT" },
      ],
    }),
    deleteFacility: builder.mutation({
      query: (id) => ({ url: `/tu/facilities/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "TuFacility", id: "LIST" },
        { type: "TuFacility", id: "REPORT" },
      ],
    }),
  }),
});

export const {
  useGetTuMetaQuery,
  useGetTuStudentsQuery,
  useGetBukuIndukQuery,
  useOpenBukuIndukMutation,
  useGetBukuDetailQuery,
  useSaveBukuDetailMutation,
  useUploadBukuPhotoMutation,
  useSyncBukuScoresMutation,
  useSaveBukuOverridesMutation,
  useAddBukuScoreMutation,
  useDeleteBukuScoreMutation,
  useGetInspectionsQuery,
  useSaveInspectionMutation,
  useDeleteInspectionMutation,
  useGetMutationsQuery,
  useSaveMutationMutation,
  useDeleteMutationMutation,
  useGetAlumniQuery,
  useSaveAlumniMutation,
  useDeleteAlumniMutation,
  useGetDiplomasQuery,
  useSaveDiplomaMutation,
  useDeleteDiplomaMutation,
  useGetLettersQuery,
  useNextLetterNumberMutation,
  useSaveLetterMutation,
  useDeleteLetterMutation,
  useGetFacilitiesQuery,
  useGetFacilityReportQuery,
  useSaveFacilityMutation,
  useDeleteFacilityMutation,
} = ApiTu;
