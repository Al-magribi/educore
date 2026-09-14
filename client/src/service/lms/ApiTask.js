import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiTask = createApi({
  reducerPath: "ApiTask",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["TeacherTask", "StudentTask"],
  endpoints: (builder) => ({
    getTeacherTasks: builder.query({
      query: ({ subjectId, chapterId, classId } = {}) => {
        const searchParams = new URLSearchParams();
        if (chapterId) searchParams.set("chapter_id", chapterId);
        if (classId) searchParams.set("class_id", classId);
        const queryString = searchParams.toString();
        return queryString
          ? `/subjects/${subjectId}/tasks?${queryString}`
          : `/subjects/${subjectId}/tasks`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "TeacherTask", id })),
              { type: "TeacherTask", id: "LIST" },
            ]
          : [{ type: "TeacherTask", id: "LIST" }],
    }),
    addTeacherTask: builder.mutation({
      query: ({ subjectId, ...body }) => ({
        url: `/subjects/${subjectId}/tasks`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TeacherTask", id: "LIST" }],
    }),
    updateTeacherTask: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "TeacherTask", id },
        { type: "TeacherTask", id: "LIST" },
      ],
    }),
    deleteTeacherTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "TeacherTask", id: "LIST" }],
    }),
    getTeacherTaskSubmissions: builder.query({
      query: (taskId) => `/tasks/${taskId}/submissions`,
      providesTags: (result, error, taskId) => [
        { type: "TeacherTask", id: taskId },
      ],
    }),
    getStudentTasks: builder.query({
      query: ({ subjectId, classId } = {}) => {
        const searchParams = new URLSearchParams();
        if (classId) searchParams.set("class_id", classId);
        const queryString = searchParams.toString();
        return queryString
          ? `/student/subjects/${subjectId}/tasks?${queryString}`
          : `/student/subjects/${subjectId}/tasks`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "StudentTask", id })),
              { type: "StudentTask", id: "LIST" },
            ]
          : [{ type: "StudentTask", id: "LIST" }],
    }),
    uploadStudentTaskSubmission: builder.mutation({
      query: ({ taskId, formData }) => ({
        url: `/tasks/${taskId}/submission`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "StudentTask", id: taskId },
        { type: "StudentTask", id: "LIST" },
      ],
    }),
    deleteStudentTaskSubmission: builder.mutation({
      query: (taskId) => ({
        url: `/tasks/${taskId}/submission`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, taskId) => [
        { type: "StudentTask", id: taskId },
        { type: "StudentTask", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTeacherTasksQuery,
  useAddTeacherTaskMutation,
  useUpdateTeacherTaskMutation,
  useDeleteTeacherTaskMutation,
  useGetTeacherTaskSubmissionsQuery,
  useGetStudentTasksQuery,
  useUploadStudentTaskSubmissionMutation,
  useDeleteStudentTaskSubmissionMutation,
} = ApiTask;
