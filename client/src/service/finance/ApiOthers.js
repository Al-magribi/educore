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

const normalizeOtherPaymentType = (item = {}) => ({
  ...item,
  type_id: Number(item.type_id || item.id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  periode_id: Number(item.periode_id || 0) || null,
  amount: Number(item.amount || 0),
  scope: item.scope === "student" ? "student" : "grade",
  description: item.description || null,
  grade_ids: toNumberArray(item.grade_ids),
  grade_names: Array.isArray(item.grade_names)
    ? item.grade_names.filter(Boolean)
    : [],
  student_ids: toNumberArray(item.student_ids),
  student_names: Array.isArray(item.student_names)
    ? item.student_names.filter(Boolean)
    : [],
  student_count: Number(item.student_count || 0),
  charge_count: Number(item.charge_count || 0),
  is_active: item.is_active !== false,
});

const normalizeOtherCharge = (item = {}) => ({
  ...item,
  charge_id: Number(item.charge_id || 0) || null,
  type_id: Number(item.type_id || 0) || null,
  student_id: Number(item.student_id || 0) || null,
  periode_id: Number(item.periode_id || 0) || null,
  homebase_id: Number(item.homebase_id || 0) || null,
  amount_due: Number(item.amount_due || 0),
  paid_amount: Number(item.paid_amount || 0),
  remaining_amount: Number(item.remaining_amount || 0),
  type_scope: item.type_scope === "student" ? "student" : item.type_scope || "grade",
});

const buildOtherTypeBody = (payload = {}) => {
  const body = {
    homebase_id: payload.homebase_id,
    periode_id: payload.periode_id,
    name: payload.name,
    description: payload.description,
    amount: payload.amount,
    scope: payload.scope === "student" ? "student" : "grade",
    is_active: payload.is_active !== false,
  };

  if (body.scope === "student") {
    body.student_ids = toNumberArray(payload.student_ids);
  } else {
    body.grade_ids = toNumberArray(payload.grade_ids);
  }

  return body;
};

const buildOtherChargeTagId = (item) =>
  item?.charge_id ??
  `student-${item?.student_id ?? "unknown"}-periode-${item?.periode_id ?? "unknown"}-type-${item?.type_id ?? "unknown"}`;

export const ApiOthers = createApi({
  reducerPath: "ApiOthers",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["OtherPaymentType", "OtherCharge", "OtherOption"],
  endpoints: (builder) => ({
    getOtherOptions: builder.query({
      query: (params) => `/others/options?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: {
            ...response.data,
            types: (response.data.types || []).map(normalizeOtherPaymentType),
          },
        };
      },
      providesTags: ["OtherOption"],
    }),

    getOtherPaymentTypes: builder.query({
      query: (params) => `/others/types?${buildQueryString(params)}`,
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeOtherPaymentType),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ type_id: id }) => ({
                type: "OtherPaymentType",
                id,
              })),
              { type: "OtherPaymentType", id: "LIST" },
            ]
          : [{ type: "OtherPaymentType", id: "LIST" }],
    }),

    addOtherPaymentType: builder.mutation({
      query: (payload) => ({
        url: "/others/types",
        method: "POST",
        body: buildOtherTypeBody(payload),
      }),
      invalidatesTags: [
        { type: "OtherPaymentType", id: "LIST" },
        { type: "OtherCharge", id: "LIST" },
        "OtherOption",
      ],
    }),

    updateOtherPaymentType: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/others/types/${id}`,
        method: "PUT",
        body: buildOtherTypeBody(payload),
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "OtherPaymentType", id },
        { type: "OtherPaymentType", id: "LIST" },
        { type: "OtherCharge", id: "LIST" },
        "OtherOption",
      ],
    }),

    deleteOtherPaymentType: builder.mutation({
      query: (payload) => {
        const id = typeof payload === "object" ? payload.id : payload;
        const homebaseId =
          typeof payload === "object" ? payload.homebase_id : undefined;

        return {
          url: homebaseId
            ? `/others/types/${id}?${buildQueryString({ homebase_id: homebaseId })}`
            : `/others/types/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: [
        { type: "OtherPaymentType", id: "LIST" },
        { type: "OtherCharge", id: "LIST" },
        "OtherOption",
      ],
    }),

    getOtherCharges: builder.query({
      query: (params) => {
        const normalizedParams = { ...(params || {}) };

        if (normalizedParams.student_search !== undefined) {
          normalizedParams.search = normalizedParams.student_search;
          delete normalizedParams.student_search;
        }

        return `/others/charges?${buildQueryString(normalizedParams)}`;
      },
      transformResponse: (response) => {
        if (!response?.data) {
          return response;
        }

        return {
          ...response,
          data: response.data.map(normalizeOtherCharge),
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({
                type: "OtherCharge",
                id: buildOtherChargeTagId(item),
              })),
              { type: "OtherCharge", id: "LIST" },
            ]
          : [{ type: "OtherCharge", id: "LIST" }],
    }),

    addOtherCharge: builder.mutation({
      query: (body) => ({
        url: "/others/charges",
        method: "POST",
        body: {
          homebase_id: body.homebase_id,
          periode_id: body.periode_id,
          grade_id: body.grade_id,
          type_id: body.type_id,
          student_id: body.student_id,
          notes: body.notes,
        },
      }),
      invalidatesTags: [
        { type: "OtherCharge", id: "LIST" },
        { type: "OtherPaymentType", id: "LIST" },
      ],
    }),

    updateOtherCharge: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/others/charges/${id}`,
        method: "PUT",
        body: {
          homebase_id: body.homebase_id,
          periode_id: body.periode_id,
          grade_id: body.grade_id,
          type_id: body.type_id,
          student_id: body.student_id,
          notes: body.notes,
        },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "OtherCharge", id },
        { type: "OtherCharge", id: "LIST" },
        { type: "OtherPaymentType", id: "LIST" },
        "OtherOption",
      ],
    }),

    deleteOtherCharge: builder.mutation({
      query: (payload) => {
        const id = typeof payload === "object" ? payload.id : payload;
        const homebaseId =
          typeof payload === "object" ? payload.homebase_id : undefined;

        return {
          url: homebaseId
            ? `/others/charges/${id}?${buildQueryString({ homebase_id: homebaseId })}`
            : `/others/charges/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: [
        { type: "OtherCharge", id: "LIST" },
        { type: "OtherPaymentType", id: "LIST" },
        "OtherOption",
      ],
    }),

    addOtherInstallment: builder.mutation({
      query: (body) => ({
        url: "/others/installments",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OtherCharge", id: "LIST" }, "OtherOption"],
    }),

    updateOtherInstallment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/others/installments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "OtherCharge", id: "LIST" }, "OtherOption"],
    }),

    deleteOtherInstallment: builder.mutation({
      query: (id) => ({
        url: `/others/installments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "OtherCharge", id: "LIST" }, "OtherOption"],
    }),
  }),
});

export const {
  useGetOtherOptionsQuery,
  useGetOtherPaymentTypesQuery,
  useAddOtherPaymentTypeMutation,
  useUpdateOtherPaymentTypeMutation,
  useDeleteOtherPaymentTypeMutation,
  useGetOtherChargesQuery,
  useAddOtherChargeMutation,
  useUpdateOtherChargeMutation,
  useDeleteOtherChargeMutation,
  useAddOtherInstallmentMutation,
  useUpdateOtherInstallmentMutation,
  useDeleteOtherInstallmentMutation,
} = ApiOthers;
