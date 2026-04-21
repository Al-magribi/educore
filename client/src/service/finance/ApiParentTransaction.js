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

export const ApiParentTransaction = createApi({
  reducerPath: "ApiParentTransaction",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["ParentTransactionOverview", "ParentTransactionInvoice"],
  endpoints: (builder) => ({
    getParentTransactionOverview: builder.query({
      query: (params) =>
        `/parent/transactions/overview?${buildQueryString(params)}`,
      providesTags: ["ParentTransactionOverview"],
    }),

    getParentTransactionInvoice: builder.query({
      query: (invoiceId) => `/parent/transactions/invoices/${invoiceId}`,
      providesTags: (result, error, invoiceId) => [
        { type: "ParentTransactionInvoice", id: invoiceId },
      ],
    }),
  }),
});

export const {
  useGetParentTransactionOverviewQuery,
  useGetParentTransactionInvoiceQuery,
} = ApiParentTransaction;
