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

export const ApiMonthly = createApi({
  reducerPath: "ApiMonthly",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["MonthlyTariff", "MonthlyPayment", "MonthlyOption", "MonthlyStudent"],
  endpoints: (builder) => ({
    getMonthlyOptions: builder.query({
      query: (params) => `/monthly/options?${buildQueryString(params)}`,
      providesTags: ["MonthlyOption"],
    }),

    getMonthlyStudents: builder.query({
      query: (params) => `/monthly/students?${buildQueryString(params)}`,
      providesTags: ["MonthlyStudent"],
    }),

    getMonthlyTariffs: builder.query({
      query: (params) => `/monthly/tariffs?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "MonthlyTariff", id })),
              { type: "MonthlyTariff", id: "LIST" },
            ]
          : [{ type: "MonthlyTariff", id: "LIST" }],
    }),

    addMonthlyTariff: builder.mutation({
      query: (body) => ({
        url: "/monthly/tariffs",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "MonthlyTariff", id: "LIST" },
        "MonthlyStudent",
      ],
    }),

    updateMonthlyTariff: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/monthly/tariffs/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "MonthlyTariff", id },
        { type: "MonthlyTariff", id: "LIST" },
        "MonthlyStudent",
      ],
    }),

    deleteMonthlyTariff: builder.mutation({
      query: (id) => ({
        url: `/monthly/tariffs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "MonthlyTariff", id: "LIST" },
        "MonthlyStudent",
      ],
    }),

    getMonthlyPayments: builder.query({
      query: (params) => `/monthly/payments?${buildQueryString(params)}`,
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "MonthlyPayment", id })),
              { type: "MonthlyPayment", id: "LIST" },
            ]
          : [{ type: "MonthlyPayment", id: "LIST" }],
    }),

    addMonthlyPayment: builder.mutation({
      query: (body) => ({
        url: "/monthly/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "MonthlyPayment", id: "LIST" }],
    }),

    updateMonthlyPayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/monthly/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "MonthlyPayment", id },
        { type: "MonthlyPayment", id: "LIST" },
      ],
    }),

    deleteMonthlyPayment: builder.mutation({
      query: (id) => ({
        url: `/monthly/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "MonthlyPayment", id: "LIST" }],
    }),
  }),
});

export const {
  useGetMonthlyOptionsQuery,
  useGetMonthlyStudentsQuery,
  useGetMonthlyTariffsQuery,
  useAddMonthlyTariffMutation,
  useUpdateMonthlyTariffMutation,
  useDeleteMonthlyTariffMutation,
  useGetMonthlyPaymentsQuery,
  useAddMonthlyPaymentMutation,
  useUpdateMonthlyPaymentMutation,
  useDeleteMonthlyPaymentMutation,
} = ApiMonthly;
