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

export const ApiSetting = createApi({
  reducerPath: "ApiSetting",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/finance" }),
  tagTypes: ["FinanceSettingOption", "FinanceSettingDetail", "FinanceBankAccount"],
  endpoints: (builder) => ({
    getSettingOptions: builder.query({
      query: (params) => {
        const queryString = buildQueryString(params);
        return queryString ? `/settings/options?${queryString}` : "/settings/options";
      },
      providesTags: ["FinanceSettingOption"],
    }),

    getFinanceSettings: builder.query({
      query: (params) => {
        const queryString = buildQueryString(params);
        return queryString ? `/settings?${queryString}` : "/settings";
      },
      providesTags: (result) => {
        const bankAccounts = result?.data?.bank_accounts || [];
        return [
          "FinanceSettingDetail",
          ...bankAccounts.map(({ id }) => ({
            type: "FinanceBankAccount",
            id,
          })),
          { type: "FinanceBankAccount", id: "LIST" },
        ];
      },
    }),

    saveMidtransConfig: builder.mutation({
      query: (body) => ({
        url: "/settings/midtrans",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FinanceSettingDetail", "FinanceSettingOption"],
    }),

    saveFinanceProfile: builder.mutation({
      query: (body) => ({
        url: "/settings/finance-profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FinanceSettingDetail", "FinanceSettingOption"],
    }),

    uploadFinanceSignature: builder.mutation({
      query: (body) => ({
        url: "/settings/upload-signature",
        method: "POST",
        body,
      }),
    }),

    addBankAccount: builder.mutation({
      query: (body) => ({
        url: "/settings/bank-accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "FinanceSettingDetail",
        { type: "FinanceBankAccount", id: "LIST" },
      ],
    }),

    updateBankAccount: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/settings/bank-accounts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "FinanceSettingDetail",
        { type: "FinanceBankAccount", id },
        { type: "FinanceBankAccount", id: "LIST" },
      ],
    }),

    deleteBankAccount: builder.mutation({
      query: ({ id, homebase_id }) => {
        const queryString = buildQueryString({ homebase_id });
        return {
          url: queryString
            ? `/settings/bank-accounts/${id}?${queryString}`
            : `/settings/bank-accounts/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, { id }) => [
        "FinanceSettingDetail",
        { type: "FinanceBankAccount", id },
        { type: "FinanceBankAccount", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetSettingOptionsQuery,
  useGetFinanceSettingsQuery,
  useSaveMidtransConfigMutation,
  useSaveFinanceProfileMutation,
  useUploadFinanceSignatureMutation,
  useAddBankAccountMutation,
  useUpdateBankAccountMutation,
  useDeleteBankAccountMutation,
} = ApiSetting;
