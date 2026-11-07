import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, item);
        }
      });
      return;
    }

    searchParams.set(key, value);
  });

  return searchParams.toString();
};

const toNumberArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
};

const normalizeBenefit = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  scholarship_id: Number(item.scholarship_id || 0) || null,
  amount: item.amount === null || item.amount === undefined ? null : Number(item.amount),
  component_id: item.component_id ? Number(item.component_id) : null,
  periode_id: item.periode_id ? Number(item.periode_id) : null,
  months: Array.isArray(item.months)
    ? item.months.map((month) => ({
        ...month,
        periode_id: Number(month.periode_id || 0) || null,
        month_num: Number(month.month_num || 0) || null,
      }))
    : [],
});

const normalizeScholarship = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  student_count: Number(item.student_count || 0),
  benefit_count: Number(item.benefit_count || 0),
  spp_cover: Number(item.spp_cover || 0),
  other_cover: Number(item.other_cover || 0),
  total_cover: Number(item.total_cover || 0),
  is_active: item.is_active !== false,
  impact: item.impact
    ? {
        ...item.impact,
        spp_cover: Number(item.impact.spp_cover || 0),
        other_cover: Number(item.impact.other_cover || 0),
        total_cover: Number(item.impact.total_cover || 0),
        covered_item_count: Number(item.impact.covered_item_count || 0),
        covered_student_count: Number(item.impact.covered_student_count || 0),
      }
    : undefined,
  benefits: Array.isArray(item.benefits)
    ? item.benefits.map(normalizeBenefit)
    : undefined,
  students: Array.isArray(item.students)
    ? item.students.map((student) => ({
        ...student,
        id: Number(student.id || 0) || null,
        scholarship_id: Number(student.scholarship_id || 0) || null,
        student_id: Number(student.student_id || 0) || null,
      }))
    : undefined,
});

export const ApiScholarship = createApi({
  reducerPath: "ApiScholarship",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: [
    "Scholarship",
    "ScholarshipDetail",
    "ScholarshipBenefit",
    "ScholarshipStudent",
    "ScholarshipOption",
    "ScholarshipImpact",
  ],
  endpoints: (builder) => ({
    getScholarshipOptions: builder.query({
      query: (params) => `/scholarship/options?${buildQueryString(params)}`,
      providesTags: ["ScholarshipOption"],
    }),

    getScholarships: builder.query({
      query: (params) => `/scholarship?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeScholarship),
          summary: {
            spp_cover: Number(response.summary?.spp_cover || 0),
            other_cover: Number(response.summary?.other_cover || 0),
            total_cover: Number(response.summary?.total_cover || 0),
          },
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "Scholarship", id: "LIST" },
              ...result.data.map((item) => ({
                type: "Scholarship",
                id: item.id,
              })),
            ]
          : [{ type: "Scholarship", id: "LIST" }],
    }),

    getScholarshipImpact: builder.query({
      query: ({ id, ...params }) =>
        `/scholarship/${id}/impact?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: {
            ...response.data,
            spp_cover: Number(response.data.spp_cover || 0),
            other_cover: Number(response.data.other_cover || 0),
            total_cover: Number(response.data.total_cover || 0),
            covered_item_count: Number(response.data.covered_item_count || 0),
            covered_student_count: Number(
              response.data.covered_student_count || 0,
            ),
          },
        };
      },
      providesTags: (result, error, arg) => [
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    getScholarshipById: builder.query({
      query: ({ id, ...params }) =>
        `/scholarship/${id}?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: normalizeScholarship(response.data),
        };
      },
      providesTags: (result, error, arg) => [
        { type: "ScholarshipDetail", id: arg?.id },
        { type: "ScholarshipBenefit", id: `LIST-${arg?.id}` },
        { type: "ScholarshipStudent", id: `LIST-${arg?.id}` },
        { type: "ScholarshipImpact", id: arg?.id },
      ],
    }),

    addScholarship: builder.mutation({
      query: (body) => ({
        url: "/scholarship",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Scholarship", id: "LIST" }, "ScholarshipOption"],
    }),

    updateScholarship: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/scholarship/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "Scholarship", id: arg.id },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    deleteScholarship: builder.mutation({
      query: ({ id, ...params }) => ({
        url: `/scholarship/${id}?${buildQueryString(params)}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Scholarship", id: "LIST" }],
    }),

    getScholarshipBenefits: builder.query({
      query: ({ id, ...params }) =>
        `/scholarship/${id}/benefits?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeBenefit),
        };
      },
      providesTags: (result, error, arg) => [
        { type: "ScholarshipBenefit", id: `LIST-${arg?.id}` },
      ],
    }),

    addScholarshipBenefit: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/scholarship/${id}/benefits`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipBenefit", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    updateScholarshipBenefit: builder.mutation({
      query: ({ id, benefitId, ...body }) => ({
        url: `/scholarship/${id}/benefits/${benefitId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipBenefit", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    deleteScholarshipBenefit: builder.mutation({
      query: ({ id, benefitId, ...params }) => ({
        url: `/scholarship/${id}/benefits/${benefitId}?${buildQueryString(params)}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipBenefit", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    getScholarshipStudents: builder.query({
      query: ({ id, ...params }) =>
        `/scholarship/${id}/students?${buildQueryString(params)}`,
      providesTags: (result, error, arg) => [
        { type: "ScholarshipStudent", id: `LIST-${arg?.id}` },
      ],
    }),

    addScholarshipStudents: builder.mutation({
      query: ({ id, student_ids, ...body }) => ({
        url: `/scholarship/${id}/students`,
        method: "POST",
        body: {
          ...body,
          student_ids: toNumberArray(student_ids),
        },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipStudent", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    updateScholarshipStudent: builder.mutation({
      query: ({ id, studentId, ...body }) => ({
        url: `/scholarship/${id}/students/${studentId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipStudent", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    removeScholarshipStudents: builder.mutation({
      query: ({ id, student_ids, soft = true, ...body }) => ({
        url: `/scholarship/${id}/students`,
        method: "DELETE",
        body: {
          ...body,
          soft,
          student_ids: toNumberArray(student_ids),
        },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipDetail", id: arg.id },
        { type: "ScholarshipStudent", id: `LIST-${arg.id}` },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    syncScholarshipStudents: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/scholarship/${id}/sync`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "ScholarshipDetail", id: arg.id },
        { type: "Scholarship", id: "LIST" },
        { type: "ScholarshipImpact", id: arg.id },
      ],
    }),

    resolveScholarshipDue: builder.mutation({
      query: (body) => ({
        url: "/scholarship/resolve-due",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetScholarshipOptionsQuery,
  useGetScholarshipsQuery,
  useGetScholarshipByIdQuery,
  useGetScholarshipImpactQuery,
  useAddScholarshipMutation,
  useUpdateScholarshipMutation,
  useDeleteScholarshipMutation,
  useGetScholarshipBenefitsQuery,
  useAddScholarshipBenefitMutation,
  useUpdateScholarshipBenefitMutation,
  useDeleteScholarshipBenefitMutation,
  useGetScholarshipStudentsQuery,
  useAddScholarshipStudentsMutation,
  useUpdateScholarshipStudentMutation,
  useRemoveScholarshipStudentsMutation,
  useSyncScholarshipStudentsMutation,
  useResolveScholarshipDueMutation,
} = ApiScholarship;
