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
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
      ],
    }),
    deleteAttendancePolicy: builder.mutation({
      query: (id) => ({
        url: `/attendance/config/policies/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResults = [
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getAttendancePolicies",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data)) {
                  draft.data = draft.data.filter((item) => item.id !== id);
                }
              },
            ),
          ),
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getAttendanceConfig",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data?.policies)) {
                  draft.data.policies = draft.data.policies.filter(
                    (item) => item.id !== id,
                  );
                }
              },
            ),
          ),
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getPolicyAssignmentBootstrap",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data?.options?.policies)) {
                  draft.data.options.policies =
                    draft.data.options.policies.filter((item) => item.id !== id);
                }
                if (Array.isArray(draft?.data?.assignments)) {
                  draft.data.assignments = draft.data.assignments.filter(
                    (item) => item.policy_id !== id,
                  );
                }
              },
            ),
          ),
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getPolicyAssignments",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data)) {
                  draft.data = draft.data.filter((item) => item.policy_id !== id);
                }
              },
            ),
          ),
        ];

        try {
          await queryFulfilled;
        } catch {
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [
        { type: "AttendancePolicy", id: "LIST" },
        { type: "AttendanceConfig", id: "BOOTSTRAP" },
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
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
    rotateRfidDeviceToken: builder.mutation({
      query: (id) => ({
        url: `/attendance/config/devices/${id}/rotate-token`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "AttendanceDevice", id: "LIST" },
        { type: "AttendanceConfig", id: "BOOTSTRAP" },
      ],
    }),
    bulkDeleteRfidDevices: builder.mutation({
      query: (ids) => ({
        url: "/attendance/config/devices/bulk-delete",
        method: "POST",
        body: { ids },
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
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResults = [
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getPolicyAssignments",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data)) {
                  draft.data = draft.data.filter((item) => item.id !== id);
                }
              },
            ),
          ),
          dispatch(
            ApiAttendance.util.updateQueryData(
              "getPolicyAssignmentBootstrap",
              undefined,
              (draft) => {
                if (Array.isArray(draft?.data?.assignments)) {
                  draft.data.assignments = draft.data.assignments.filter(
                    (item) => item.id !== id,
                  );
                }
              },
            ),
          ),
        ];

        try {
          await queryFulfilled;
        } catch {
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
      ],
    }),
    bulkDeletePolicyAssignments: builder.mutation({
      query: (ids) => ({
        url: "/attendance/config/policy-assignments/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
        { type: "AttendanceConfig", id: "BOOTSTRAP" },
      ],
    }),
    getStudentAttendanceReport: builder.query({
      query: ({ startDate, endDate, classId, gradeId, status, userName } = {}) => ({
        url: "/attendance/reports/students",
        params: {
          start_date: startDate,
          end_date: endDate,
          class_id: classId,
          grade_id: gradeId,
          status,
          user_name: userName,
        },
      }),
      providesTags: [{ type: "Attendance", id: "STUDENT_REPORT" }],
    }),
    getTeacherAttendanceReport: builder.query({
      query: ({ startDate, endDate, status, userName } = {}) => ({
        url: "/attendance/reports/teachers",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
        },
      }),
      providesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),
    getAttendanceScanLogReport: builder.query({
      query: ({ startDate, endDate, deviceId, resultStatus, userName } = {}) => ({
        url: "/attendance/reports/scan-logs",
        params: {
          start_date: startDate,
          end_date: endDate,
          device_id: deviceId,
          result_status: resultStatus,
          user_name: userName,
        },
      }),
      providesTags: [{ type: "Attendance", id: "SCAN_LOG_REPORT" }],
    }),
    deleteAttendanceScanLog: builder.mutation({
      query: (id) => ({
        url: `/attendance/reports/scan-logs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
      ],
    }),
    bulkDeleteAttendanceScanLogs: builder.mutation({
      query: (ids) => ({
        url: "/attendance/reports/scan-logs/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
      ],
    }),
    updateDailyAttendanceRecord: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/reports/daily/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
      ],
    }),
    deleteDailyAttendanceRecord: builder.mutation({
      query: (id) => ({
        url: `/attendance/reports/daily/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
      ],
    }),
    bulkDeleteDailyAttendanceRecords: builder.mutation({
      query: (ids) => ({
        url: "/attendance/reports/daily/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
      ],
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
  useDeleteAttendancePolicyMutation,
  useGetRfidDevicesQuery,
  useSaveRfidDeviceMutation,
  useRotateRfidDeviceTokenMutation,
  useBulkDeleteRfidDevicesMutation,
  useGetPolicyAssignmentBootstrapQuery,
  useGetPolicyAssignmentsQuery,
  useSavePolicyAssignmentMutation,
  useDeletePolicyAssignmentMutation,
  useBulkDeletePolicyAssignmentsMutation,
  useGetStudentAttendanceReportQuery,
  useGetTeacherAttendanceReportQuery,
  useGetAttendanceScanLogReportQuery,
  useDeleteAttendanceScanLogMutation,
  useBulkDeleteAttendanceScanLogsMutation,
  useUpdateDailyAttendanceRecordMutation,
  useDeleteDailyAttendanceRecordMutation,
  useBulkDeleteDailyAttendanceRecordsMutation,
} = ApiAttendance;
