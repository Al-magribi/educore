import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, value);
  });

  return searchParams.toString();
};

const normalizeUnit = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  sort_order: Number(item.sort_order || 0),
  position_count: Number(item.position_count || 0),
  is_active: Boolean(item.is_active),
});

const normalizePosition = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  unit_id: Number(item.unit_id || 0) || null,
  allowance_amount: Number(item.allowance_amount || 0),
  base_salary: Number(item.base_salary || 0),
  sort_order: Number(item.sort_order || 0),
  is_active: Boolean(item.is_active),
});

const normalizeRate = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  amount: Number(item.amount || 0),
  sort_order: Number(item.sort_order || 0),
  is_active: Boolean(item.is_active),
});

const normalizeStaff = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  assignment_count: Number(item.assignment_count || 0),
  is_active: Boolean(item.is_active),
});

const normalizeAssignment = (item = {}) => ({
  ...item,
  id: Number(item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  position_id: Number(item.position_id || 0) || null,
  unit_id: item.unit_id ? Number(item.unit_id) : null,
  teacher_id: item.teacher_id ? Number(item.teacher_id) : null,
  staff_id: item.staff_id ? Number(item.staff_id) : null,
  allowance_amount: Number(item.allowance_amount || 0),
  base_salary: Number(item.base_salary || 0),
  is_active: Boolean(item.is_active),
});

const normalizeTeacherOption = (item = {}) => ({
  id: Number(item.id || 0) || null,
  full_name: item.full_name || "",
  nip: item.nip || null,
  is_active: Boolean(item.is_active),
  person_type: "teacher",
});

export const ApiHonorarium = createApi({
  reducerPath: "ApiHonorarium",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: [
    "HonorUnit",
    "HonorPosition",
    "HonorRate",
    "HonorStaff",
    "HonorAssignment",
    "HonorPeople",
    "HonorPayroll",
    "HonorOption",
  ],
  endpoints: (builder) => ({
    getHonorariumOptions: builder.query({
      query: (params) => `/honorarium/options?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: {
            ...response.data,
            units: Array.isArray(response.data.units)
              ? response.data.units.map(normalizeUnit)
              : [],
            rates: Array.isArray(response.data.rates)
              ? response.data.rates.map(normalizeRate)
              : [],
          },
        };
      },
      providesTags: ["HonorOption", "HonorUnit", "HonorRate"],
    }),

    getHonorUnits: builder.query({
      query: (params) => `/honorarium/units?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeUnit),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorUnit",
                id: item.id,
              })),
              { type: "HonorUnit", id: "LIST" },
            ]
          : [{ type: "HonorUnit", id: "LIST" }],
    }),

    addHonorUnit: builder.mutation({
      query: (body) => ({
        url: "/honorarium/units",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorUnit", id: "LIST" },
        "HonorOption",
      ],
    }),

    updateHonorUnit: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/units/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorUnit", id: "LIST" },
        { type: "HonorUnit", id: arg?.id },
        "HonorOption",
      ],
    }),

    deleteHonorUnit: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/units/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "HonorUnit", id: "LIST" },
        "HonorOption",
        { type: "HonorPosition", id: "LIST" },
      ],
    }),

    getHonorPositions: builder.query({
      query: (params) => `/honorarium/positions?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizePosition),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorPosition",
                id: item.id,
              })),
              { type: "HonorPosition", id: "LIST" },
            ]
          : [{ type: "HonorPosition", id: "LIST" }],
    }),

    addHonorPosition: builder.mutation({
      query: (body) => ({
        url: "/honorarium/positions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorPosition", id: "LIST" },
        { type: "HonorUnit", id: "LIST" },
        "HonorOption",
      ],
    }),

    updateHonorPosition: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/positions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorPosition", id: "LIST" },
        { type: "HonorPosition", id: arg?.id },
        { type: "HonorUnit", id: "LIST" },
        "HonorOption",
      ],
    }),

    deleteHonorPosition: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/positions/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "HonorPosition", id: "LIST" },
        { type: "HonorUnit", id: "LIST" },
        "HonorOption",
      ],
    }),

    getHonorRates: builder.query({
      query: (params) => `/honorarium/rates?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeRate),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorRate",
                id: item.id,
              })),
              { type: "HonorRate", id: "LIST" },
            ]
          : [{ type: "HonorRate", id: "LIST" }],
    }),

    getActiveHonorRates: builder.query({
      query: (params) => `/honorarium/rates/active?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: {
            ...response.data,
            rates: Array.isArray(response.data.rates)
              ? response.data.rates.map(normalizeRate)
              : [],
            by_code: Object.fromEntries(
              Object.entries(response.data.by_code || {}).map(
                ([code, item]) => [code, normalizeRate(item)],
              ),
            ),
          },
        };
      },
      providesTags: [{ type: "HonorRate", id: "ACTIVE" }],
    }),

    addHonorRate: builder.mutation({
      query: (body) => ({
        url: "/honorarium/rates",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorRate", id: "LIST" },
        { type: "HonorRate", id: "ACTIVE" },
        "HonorOption",
      ],
    }),

    updateHonorRate: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/rates/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorRate", id: "LIST" },
        { type: "HonorRate", id: arg?.id },
        { type: "HonorRate", id: "ACTIVE" },
        "HonorOption",
      ],
    }),

    deleteHonorRate: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/rates/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "HonorRate", id: "LIST" },
        { type: "HonorRate", id: "ACTIVE" },
        "HonorOption",
      ],
    }),

    getHonorPeople: builder.query({
      query: (params) => `/honorarium/people?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: {
            teachers: Array.isArray(response.data.teachers)
              ? response.data.teachers.map(normalizeTeacherOption)
              : [],
            staff: Array.isArray(response.data.staff)
              ? response.data.staff.map((item) => ({
                  ...normalizeStaff(item),
                  person_type: "staff",
                }))
              : [],
          },
        };
      },
      providesTags: ["HonorPeople", "HonorStaff"],
    }),

    getHonorStaff: builder.query({
      query: (params) => `/honorarium/staff?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeStaff),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorStaff",
                id: item.id,
              })),
              { type: "HonorStaff", id: "LIST" },
            ]
          : [{ type: "HonorStaff", id: "LIST" }],
    }),

    addHonorStaff: builder.mutation({
      query: (body) => ({
        url: "/honorarium/staff",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorStaff", id: "LIST" },
        "HonorPeople",
      ],
    }),

    updateHonorStaff: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/staff/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorStaff", id: "LIST" },
        { type: "HonorStaff", id: arg?.id },
        "HonorPeople",
        { type: "HonorAssignment", id: "LIST" },
      ],
    }),

    deleteHonorStaff: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/staff/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "HonorStaff", id: "LIST" },
        "HonorPeople",
        { type: "HonorAssignment", id: "LIST" },
      ],
    }),

    getHonorAssignments: builder.query({
      query: (params) => `/honorarium/assignments?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeAssignment),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorAssignment",
                id: item.id,
              })),
              { type: "HonorAssignment", id: "LIST" },
            ]
          : [{ type: "HonorAssignment", id: "LIST" }],
    }),

    addHonorAssignment: builder.mutation({
      query: (body) => ({
        url: "/honorarium/assignments",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorAssignment", id: "LIST" },
        { type: "HonorStaff", id: "LIST" },
      ],
    }),

    updateHonorAssignment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/assignments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorAssignment", id: "LIST" },
        { type: "HonorAssignment", id: arg?.id },
        { type: "HonorStaff", id: "LIST" },
      ],
    }),

    deleteHonorAssignment: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/assignments/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "HonorAssignment", id: "LIST" },
        { type: "HonorStaff", id: "LIST" },
      ],
    }),

    getHonorariumPreview: builder.query({
      query: (params) => `/honorarium/preview?${buildQueryString(params)}`,
      providesTags: [{ type: "HonorAssignment", id: "PREVIEW" }],
    }),

    getHonorPayrolls: builder.query({
      query: (params) => `/honorarium/payrolls?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "HonorPayroll",
                id: item.id,
              })),
              { type: "HonorPayroll", id: "LIST" },
            ]
          : [{ type: "HonorPayroll", id: "LIST" }],
    }),

    getHonorPayrollById: builder.query({
      query: ({ id, ...params }) =>
        `/honorarium/payrolls/${id}?${buildQueryString(params)}`,
      providesTags: (_result, _error, arg) => [
        { type: "HonorPayroll", id: arg?.id },
      ],
    }),

    generateHonorPayroll: builder.mutation({
      query: (body) => ({
        url: "/honorarium/payrolls/generate",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "HonorPayroll", id: "LIST" },
        { type: "HonorAssignment", id: "PREVIEW" },
      ],
    }),

    recalcHonorPayroll: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/payrolls/${id}/recalc`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorPayroll", id: "LIST" },
        { type: "HonorPayroll", id: arg?.id },
      ],
    }),

    updateHonorPayrollLine: builder.mutation({
      query: ({ id, lineId, ...body }) => ({
        url: `/honorarium/payrolls/${id}/lines/${lineId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorPayroll", id: arg?.id },
        { type: "HonorPayroll", id: "LIST" },
      ],
    }),

    lockHonorPayroll: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/payrolls/${id}/lock`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorPayroll", id: arg?.id },
        { type: "HonorPayroll", id: "LIST" },
      ],
    }),

    unlockHonorPayroll: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/honorarium/payrolls/${id}/unlock`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "HonorPayroll", id: arg?.id },
        { type: "HonorPayroll", id: "LIST" },
      ],
    }),

    deleteHonorPayroll: builder.mutation({
      query: ({ id, homebase_id }) => ({
        url: `/honorarium/payrolls/${id}?${buildQueryString({ homebase_id })}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "HonorPayroll", id: "LIST" }],
    }),
  }),
});

export const {
  useGetHonorariumOptionsQuery,
  useGetHonorUnitsQuery,
  useAddHonorUnitMutation,
  useUpdateHonorUnitMutation,
  useDeleteHonorUnitMutation,
  useGetHonorPositionsQuery,
  useAddHonorPositionMutation,
  useUpdateHonorPositionMutation,
  useDeleteHonorPositionMutation,
  useGetHonorRatesQuery,
  useGetActiveHonorRatesQuery,
  useAddHonorRateMutation,
  useUpdateHonorRateMutation,
  useDeleteHonorRateMutation,
  useGetHonorPeopleQuery,
  useGetHonorStaffQuery,
  useAddHonorStaffMutation,
  useUpdateHonorStaffMutation,
  useDeleteHonorStaffMutation,
  useGetHonorAssignmentsQuery,
  useAddHonorAssignmentMutation,
  useUpdateHonorAssignmentMutation,
  useDeleteHonorAssignmentMutation,
  useGetHonorariumPreviewQuery,
  useLazyGetHonorariumPreviewQuery,
  useGetHonorPayrollsQuery,
  useGetHonorPayrollByIdQuery,
  useGenerateHonorPayrollMutation,
  useRecalcHonorPayrollMutation,
  useUpdateHonorPayrollLineMutation,
  useLockHonorPayrollMutation,
  useUnlockHonorPayrollMutation,
  useDeleteHonorPayrollMutation,
} = ApiHonorarium;
