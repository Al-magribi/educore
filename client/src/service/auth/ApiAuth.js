import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAuth = createApi({
  reducerPath: "ApiAuth",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/auth" }),
  tagTypes: ["Auth"],
  endpoints: (builder) => ({
    DoSignup: builder.mutation({
      query: (body) => ({
        url: "/signup",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    DoSignin: builder.mutation({
      query: (body) => ({
        url: "/signin",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
    loadUser: builder.query({
      query: () => ({
        url: "/load-user",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),
    DoLogout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/update-profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    forgotPassword: builder.mutation({
      query: (body) => ({
        url: "/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({
        url: "/reset-password",
        method: "PUT",
        body,
      }),
    }),
  }),
});

export const {
  useDoSignupMutation,
  useDoSigninMutation,
  useLoadUserQuery,
  useDoLogoutMutation,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = ApiAuth;
