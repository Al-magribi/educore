import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiJournal = createApi({
  reducerPath: "ApiJournal",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["TeacherJournal"],
  endpoints: (builder) => ({
    getTeacherJournals: builder.query({
      query: ({ subjectId, classId, date } = {}) => {
        const searchParams = new URLSearchParams();
        if (classId) searchParams.set("class_id", classId);
        if (date) searchParams.set("date", date);
        const queryString = searchParams.toString();
        return queryString
          ? `/subjects/${subjectId}/journals?${queryString}`
          : `/subjects/${subjectId}/journals`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "TeacherJournal", id })),
              { type: "TeacherJournal", id: "LIST" },
            ]
          : [{ type: "TeacherJournal", id: "LIST" }],
    }),
    addTeacherJournal: builder.mutation({
      query: ({ subjectId, ...body }) => ({
        url: `/subjects/${subjectId}/journals`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TeacherJournal", id: "LIST" }],
    }),
    updateTeacherJournal: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/journals/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "TeacherJournal", id },
        { type: "TeacherJournal", id: "LIST" },
      ],
    }),
    deleteTeacherJournal: builder.mutation({
      query: (id) => ({
        url: `/journals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "TeacherJournal", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTeacherJournalsQuery,
  useAddTeacherJournalMutation,
  useUpdateTeacherJournalMutation,
  useDeleteTeacherJournalMutation,
} = ApiJournal;
