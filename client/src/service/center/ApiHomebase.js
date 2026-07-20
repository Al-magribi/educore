import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiHomebase = createApi({
  reducerPath: "ApiHomebase",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/center" }),
  tagTypes: ["Homebase", "HomebaseTeacher", "HomebaseClass", "HomebaseStudent"],
  endpoints: (builder) => ({
    getHomebase: builder.query({
      query: ({ page = 1, limit = 10, search = "" }) =>
        `/get-homebase?page=${page}&limit=${limit}&search=${search}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Homebase", id })),
              { type: "Homebase", id: "LIST" },
            ]
          : [{ type: "Homebase", id: "LIST" }],
    }),

    addHomebase: builder.mutation({
      query: (body) => ({
        url: "/add-homebase",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Homebase", id: "LIST" }],
    }),

    updateHomebase: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/update-homebase/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Homebase", id },
        { type: "Homebase", id: "LIST" },
      ],
    }),

    deleteHomebase: builder.mutation({
      query: (id) => ({
        url: `/delete-homebase/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Homebase", id: "LIST" }],
    }),

    detailHomebase: builder.query({
      query: ({ id, periode_id }) => ({
        url: `/detail-homebase/${id}`,
        params: { periode_id },
      }),
      providesTags: (result, error, arg) => [{ type: "Homebase", id: arg.id }],
    }),

    getHomebaseTeachers: builder.query({
      query: ({ id, page = 1, limit = 10, search = "" }) => ({
        url: `/homebase-teachers/${id}`,
        params: { page, limit, search },
      }),
      providesTags: ["HomebaseTeacher"],
    }),

    addHomebaseTeacher: builder.mutation({
      query: ({ homebase_id, ...body }) => ({
        url: `/homebase-teachers/${homebase_id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["HomebaseTeacher", "Homebase"],
    }),

    updateHomebaseTeacher: builder.mutation({
      query: ({ homebase_id, id, ...body }) => ({
        url: `/homebase-teachers/${homebase_id}/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["HomebaseTeacher", "Homebase"],
    }),

    deleteHomebaseTeacher: builder.mutation({
      query: ({ homebase_id, id }) => ({
        url: `/homebase-teachers/${homebase_id}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["HomebaseTeacher", "Homebase"],
    }),

    getHomebaseOptions: builder.query({
      query: (id) => `/homebase-options/${id}`,
      providesTags: ["HomebaseClass"],
    }),

    getHomebaseClasses: builder.query({
      query: ({ id, page = 1, limit = 10, search = "", periode_id }) => ({
        url: `/homebase-classes/${id}`,
        params: { page, limit, search, periode_id },
      }),
      providesTags: ["HomebaseClass"],
    }),

    getHomebaseClassStudents: builder.query({
      query: ({
        homebase_id,
        class_id,
        periode_id,
        name = "",
        nis = "",
        nisn = "",
        page = 1,
        limit = 10,
      }) => ({
        url: "/homebase-class-students",
        params: {
          homebase_id,
          class_id,
          periode_id,
          name,
          nis,
          nisn,
          page,
          limit,
        },
      }),
      providesTags: ["HomebaseStudent"],
    }),
  }),
});

export const {
  useGetHomebaseQuery,
  useLazyGetHomebaseQuery,
  useAddHomebaseMutation,
  useUpdateHomebaseMutation,
  useDeleteHomebaseMutation,
  useDetailHomebaseQuery,
  useLazyDetailHomebaseQuery,
  useGetHomebaseTeachersQuery,
  useLazyGetHomebaseTeachersQuery,
  useAddHomebaseTeacherMutation,
  useUpdateHomebaseTeacherMutation,
  useDeleteHomebaseTeacherMutation,
  useGetHomebaseOptionsQuery,
  useGetHomebaseClassesQuery,
  useLazyGetHomebaseClassesQuery,
  useGetHomebaseClassStudentsQuery,
  useLazyGetHomebaseClassStudentsQuery,
} = ApiHomebase;
