import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
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
      providesTags: ["OtherOption"],
    }),

    getOtherPaymentTypes: builder.query({
      query: (params) => `/others/types?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ type_id: id }) => ({ type: "OtherPaymentType", id })),
              { type: "OtherPaymentType", id: "LIST" },
            ]
          : [{ type: "OtherPaymentType", id: "LIST" }],
    }),

    addOtherPaymentType: builder.mutation({
      query: (body) => ({
        url: "/others/types",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "OtherPaymentType", id: "LIST" },
        "OtherOption",
      ],
    }),

    updateOtherPaymentType: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/others/types/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "OtherPaymentType", id },
        { type: "OtherPaymentType", id: "LIST" },
        "OtherOption",
        { type: "OtherCharge", id: "LIST" },
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
        body,
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
        body,
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
