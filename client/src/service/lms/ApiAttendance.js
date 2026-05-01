import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAttendance = createApi({
  reducerPath: "ApiAttendance",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["Attendance", "AttendanceConfig", "AttendancePolicy", "AttendanceDevice", "AttendanceAssignment"],
  endpoints: (builder) => ({
    getAttendanceStudents: builder.query({
      query: ({ subjectId, classId, date }) =>
        `/attendance/students?subject_id=${subjectId || ""}&class_id=${
          classId || ""
        }&date=${date || ""}`,
      providesTags: [{ type: "Attendance", id: "LIST" }],
    }),
    submitAttendance: builder.mutation({
      query: (body) => ({
        url: "/attendance/submit",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Attendance", id: "LIST" }],
    }),

    getAttendanceConfig: builder.query({
      query: () => "/attendance/config",
      providesTags: [{ type: "AttendanceConfig", id: "BOOTSTRAP" }],
    }),
    updateAttendanceFeatures: builder.mutation({
      query: (body) => ({
        url: "/attendance/config/features",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "AttendanceConfig", id: "BOOTSTRAP" }],
    }),
    getAttendancePolicies: builder.query({
      query: ({ targetRole, policyType } = {}) =>
        `/attendance/config/policies?target_role=${targetRole || ""}&policy_type=${
          policyType || ""
        }`,
      providesTags: [{ type: "AttendancePolicy", id: "LIST" }],
    }),
    saveAttendancePolicy: builder.mutation({
      query: (body) => ({
        url: body?.id
          ? `/attendance/config/policies/${body.id}`
          : "/attendance/config/policies",
        method: body?.id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AttendancePolicy", id: "LIST" },
        { type: "AttendanceConfig", id: "BOOTSTRAP" },
      ],
    }),
    getRfidDevices: builder.query({
      query: () => "/attendance/config/devices",
      providesTags: [{ type: "AttendanceDevice", id: "LIST" }],
    }),
    saveRfidDevice: builder.mutation({
      query: (body) => ({
        url: body?.id
          ? `/attendance/config/devices/${body.id}`
          : "/attendance/config/devices",
        method: body?.id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AttendanceDevice", id: "LIST" },
        { type: "AttendanceConfig", id: "BOOTSTRAP" },
      ],
    }),
    getPolicyAssignmentBootstrap: builder.query({
      query: () => "/attendance/config/policy-assignments/bootstrap",
      providesTags: [{ type: "AttendanceAssignment", id: "BOOTSTRAP" }],
    }),
    getPolicyAssignments: builder.query({
      query: ({ targetRole, assignmentScope } = {}) =>
        `/attendance/config/policy-assignments?target_role=${targetRole || ""}&assignment_scope=${
          assignmentScope || ""
        }`,
      providesTags: [{ type: "AttendanceAssignment", id: "LIST" }],
    }),
    savePolicyAssignment: builder.mutation({
      query: (body) => ({
        url: body?.id
          ? `/attendance/config/policy-assignments/${body.id}`
          : "/attendance/config/policy-assignments",
        method: body?.id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
      ],
    }),
    deletePolicyAssignment: builder.mutation({
      query: (id) => ({
        url: `/attendance/config/policy-assignments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
      ],
    }),
    getStudentAttendanceReport: builder.query({
      query: ({ startDate, endDate, classId, gradeId, status } = {}) => ({
        url: "/attendance/reports/students",
        params: {
          start_date: startDate,
          end_date: endDate,
          class_id: classId,
          grade_id: gradeId,
          status,
        },
      }),
      providesTags: [{ type: "Attendance", id: "STUDENT_REPORT" }],
    }),
    getTeacherAttendanceReport: builder.query({
      query: ({ startDate, endDate, status } = {}) => ({
        url: "/attendance/reports/teachers",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
        },
      }),
      providesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),
  }),
});

export const {
  useGetAttendanceStudentsQuery,
  useSubmitAttendanceMutation,
  useGetAttendanceConfigQuery,
  useUpdateAttendanceFeaturesMutation,
  useGetAttendancePoliciesQuery,
  useSaveAttendancePolicyMutation,
  useGetRfidDevicesQuery,
  useSaveRfidDeviceMutation,
  useGetPolicyAssignmentBootstrapQuery,
  useGetPolicyAssignmentsQuery,
  useSavePolicyAssignmentMutation,
  useDeletePolicyAssignmentMutation,
  useGetStudentAttendanceReportQuery,
  useGetTeacherAttendanceReportQuery,
} = ApiAttendance;
