import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ApiAttendance = createApi({
  reducerPath: "ApiAttendance",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/lms" }),
  tagTypes: ["Attendance", "AttendanceConfig", "AttendancePolicy", "AttendanceDevice", "AttendanceAssignment", "TelegramNotification", "AttendanceCalendar"],
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
      // Auto-save updates local state; avoid full-list refetch flicker.
    }),
    deleteAttendance: builder.mutation({
      query: (body) => ({
        url: "/attendance/delete",
        method: "POST",
        body,
      }),
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
      query: ({ homebaseId } = {}) => ({
        url: "/attendance/config/devices",
        params: homebaseId ? { homebase_id: homebaseId } : undefined,
      }),
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
      query: (body) => {
        const editId =
          Number(body?.id || 0) ||
          (Array.isArray(body?.group_ids) ? Number(body.group_ids[0] || 0) : 0) ||
          null;
        return {
          url: editId
            ? `/attendance/config/policy-assignments/${editId}`
            : "/attendance/config/policy-assignments",
          method: editId ? "PUT" : "POST",
          body,
        };
      },
      invalidatesTags: [
        { type: "AttendanceAssignment", id: "LIST" },
        { type: "AttendanceAssignment", id: "BOOTSTRAP" },
      ],
    }),
    deletePolicyAssignment: builder.mutation({
      query: (payload) => {
        const id = typeof payload === "object" ? payload?.id : payload;
        const groupIds =
          typeof payload === "object" && Array.isArray(payload?.group_ids)
            ? payload.group_ids
            : undefined;
        return {
          url: `/attendance/config/policy-assignments/${id}`,
          method: "DELETE",
          ...(groupIds ? { body: { group_ids: groupIds } } : {}),
        };
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
      query: ({
        startDate,
        endDate,
        classId,
        gradeId,
        status,
        userName,
        homebaseId,
        periodeId,
      } = {}) => ({
        url: "/attendance/reports/students",
        params: {
          start_date: startDate,
          end_date: endDate,
          class_id: classId,
          grade_id: gradeId,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "Attendance", id: "STUDENT_REPORT" }],
    }),
    getTeacherAttendanceReport: builder.query({
      query: ({
        startDate,
        endDate,
        status,
        userName,
        homebaseId,
        periodeId,
        classId,
        cardUid,
      } = {}) => ({
        url: "/attendance/reports/teachers",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
          class_id: classId,
          card_uid: cardUid,
        },
      }),
      providesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),
    getStaffAttendanceReport: builder.query({
      query: ({ startDate, endDate, status, userName, homebaseId, periodeId } = {}) => ({
        url: "/attendance/reports/staff",
        params: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "Attendance", id: "STAFF_REPORT" }],
    }),
    getTeacherTeachingRecap: builder.query({
      query: ({ month, classId, homebaseId, periodeId } = {}) => ({
        url: "/attendance/reports/teachers/teaching-recap",
        params: {
          month,
          class_id: classId,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "Attendance", id: "TEACHER_TEACHING_RECAP" }],
    }),
    getAttendanceScanLogReport: builder.query({
      query: ({
        startDate,
        endDate,
        deviceId,
        resultStatus,
        userName,
        homebaseId,
        periodeId,
      } = {}) => ({
        url: "/attendance/reports/scan-logs",
        params: {
          start_date: startDate,
          end_date: endDate,
          device_id: deviceId,
          result_status: resultStatus,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      }),
      providesTags: [{ type: "Attendance", id: "SCAN_LOG_REPORT" }],
    }),
    deleteAttendanceScanLog: builder.mutation({
      query: ({ id, homebaseId } = {}) => ({
        url: `/attendance/reports/scan-logs/${id}`,
        method: "DELETE",
        params: homebaseId ? { homebase_id: homebaseId } : undefined,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "STAFF_REPORT" },
      ],
    }),
    bulkDeleteAttendanceScanLogs: builder.mutation({
      query: ({ ids, homebaseId } = {}) => ({
        url: "/attendance/reports/scan-logs/bulk-delete",
        method: "POST",
        body: { ids, homebase_id: homebaseId },
      }),
      invalidatesTags: [
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "STAFF_REPORT" },
      ],
    }),
    getClassAttendanceWorkspace: builder.query({
      query: () => "/attendance/class/workspace",
      transformResponse: (response) => response?.data,
      providesTags: [{ type: "Attendance", id: "CLASS_WORKSPACE" }],
    }),
    getClassAttendanceRecords: builder.query({
      query: ({ startDate, endDate }) => ({
        url: "/attendance/class/records",
        params: { start_date: startDate, end_date: endDate },
      }),
      transformResponse: (response) => response?.data || [],
      providesTags: [{ type: "Attendance", id: "CLASS_RECORDS" }],
    }),
    saveClassAttendanceRecord: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/attendance/class/records/${id}` : "/attendance/class/records",
        method: id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "CLASS_RECORDS" },
        { type: "Attendance", id: "STUDENT_REPORT" },
      ],
    }),
    deleteClassAttendanceRecord: builder.mutation({
      query: (id) => ({
        url: `/attendance/class/records/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Attendance", id: "CLASS_RECORDS" },
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
      ],
    }),
    saveClassAttendanceOfficers: builder.mutation({
      query: (studentIds) => ({
        url: "/attendance/class/officers",
        method: "PUT",
        body: { student_ids: studentIds },
      }),
      invalidatesTags: [{ type: "Attendance", id: "CLASS_WORKSPACE" }],
    }),
    updateDailyAttendanceRecord: builder.mutation({
      query: ({ id, homebaseId, ...body }) => ({
        url: `/attendance/reports/daily/${id}`,
        method: "PUT",
        body: { ...body, homebase_id: homebaseId },
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
      ],
    }),
    deleteDailyAttendanceRecord: builder.mutation({
      query: ({ id, homebaseId } = {}) => ({
        url: `/attendance/reports/daily/${id}`,
        method: "DELETE",
        params: homebaseId ? { homebase_id: homebaseId } : undefined,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
      ],
    }),
    bulkDeleteDailyAttendanceRecords: builder.mutation({
      query: ({ ids, homebaseId } = {}) => ({
        url: "/attendance/reports/daily/bulk-delete",
        method: "POST",
        body: { ids, homebase_id: homebaseId },
      }),
      invalidatesTags: [
        { type: "Attendance", id: "STUDENT_REPORT" },
        { type: "Attendance", id: "TEACHER_REPORT" },
        { type: "Attendance", id: "SCAN_LOG_REPORT" },
      ],
    }),
    updateTeacherSessionRecord: builder.mutation({
      query: ({ id, homebaseId, ...body }) => ({
        url: `/attendance/reports/teacher-sessions/${id}`,
        method: "PUT",
        body: { ...body, homebase_id: homebaseId },
      }),
      invalidatesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),
    deleteTeacherSessionRecord: builder.mutation({
      query: ({ id, homebaseId } = {}) => ({
        url: `/attendance/reports/teacher-sessions/${id}`,
        method: "DELETE",
        params: homebaseId ? { homebase_id: homebaseId } : undefined,
      }),
      invalidatesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),
    bulkDeleteTeacherSessionRecords: builder.mutation({
      query: ({ ids, homebaseId } = {}) => ({
        url: "/attendance/reports/teacher-sessions/bulk-delete",
        method: "POST",
        body: { ids, homebase_id: homebaseId },
      }),
      invalidatesTags: [{ type: "Attendance", id: "TEACHER_REPORT" }],
    }),

    getTelegramNotificationConfig: builder.query({
      query: () => "/attendance/telegram/config",
      providesTags: [{ type: "TelegramNotification", id: "CONFIG" }],
    }),
    updateTelegramNotificationConfig: builder.mutation({
      query: (body) => ({
        url: "/attendance/telegram/config",
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "TelegramNotification", id: "CONFIG" },
        { type: "TelegramNotification", id: "PARENTS" },
      ],
    }),
    verifyTelegramBot: builder.mutation({
      query: (body) => ({
        url: "/attendance/telegram/bot/verify",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "TelegramNotification", id: "CONFIG" }],
    }),
    getTelegramStatus: builder.query({
      query: () => "/attendance/telegram/status",
      providesTags: [{ type: "TelegramNotification", id: "CONFIG" }],
      keepUnusedDataFor: 0,
    }),
    getTelegramParents: builder.query({
      query: ({ limit } = {}) => ({
        url: "/attendance/telegram/parents",
        params: { limit },
      }),
      providesTags: [{ type: "TelegramNotification", id: "PARENTS" }],
    }),
    unbindTelegramParent: builder.mutation({
      query: (parentUserId) => ({
        url: `/attendance/telegram/parents/${parentUserId}/bind`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "TelegramNotification", id: "PARENTS" },
        { type: "TelegramNotification", id: "CONFIG" },
      ],
    }),
    sendTelegramTestMessage: builder.mutation({
      query: (body) => ({
        url: "/attendance/telegram/test",
        method: "POST",
        body,
      }),
    }),
    getTeacherTelegram: builder.query({
      query: () => "/teacher/telegram",
      providesTags: [{ type: "TelegramNotification", id: "TEACHER_BIND" }],
    }),
    getStudentTelegram: builder.query({
      query: () => "/student/telegram",
      providesTags: [{ type: "TelegramNotification", id: "STUDENT_BIND" }],
    }),

    getAttendanceCalendarConfig: builder.query({
      query: () => "/attendance/calendar/config",
      providesTags: [{ type: "AttendanceCalendar", id: "CONFIG" }],
    }),
    updateAttendanceCalendarConfig: builder.mutation({
      query: (body) => ({
        url: "/attendance/calendar/config",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "AttendanceCalendar", id: "CONFIG" }],
    }),
    getAttendanceHolidays: builder.query({
      query: ({ year, startDate, endDate } = {}) => ({
        url: "/attendance/calendar/holidays",
        params: {
          year,
          start_date: startDate,
          end_date: endDate,
        },
      }),
      providesTags: [{ type: "AttendanceCalendar", id: "HOLIDAYS" }],
    }),
    saveAttendanceHoliday: builder.mutation({
      query: (body) => ({
        url: body?.id
          ? `/attendance/calendar/holidays/${body.id}`
          : "/attendance/calendar/holidays",
        method: body?.id ? "PUT" : "POST",
        body,
      }),
      invalidatesTags: [{ type: "AttendanceCalendar", id: "HOLIDAYS" }],
    }),
    deleteAttendanceHoliday: builder.mutation({
      query: (id) => ({
        url: `/attendance/calendar/holidays/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "AttendanceCalendar", id: "HOLIDAYS" }],
    }),
    bulkDeleteAttendanceHolidays: builder.mutation({
      query: (ids) => ({
        url: "/attendance/calendar/holidays/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [{ type: "AttendanceCalendar", id: "HOLIDAYS" }],
    }),
  }),
});

export const {
  useGetAttendanceStudentsQuery,
  useSubmitAttendanceMutation,
  useDeleteAttendanceMutation,
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
  useGetStaffAttendanceReportQuery,
  useGetTeacherTeachingRecapQuery,
  useGetAttendanceScanLogReportQuery,
  useDeleteAttendanceScanLogMutation,
  useBulkDeleteAttendanceScanLogsMutation,
  useUpdateDailyAttendanceRecordMutation,
  useDeleteDailyAttendanceRecordMutation,
  useBulkDeleteDailyAttendanceRecordsMutation,
  useUpdateTeacherSessionRecordMutation,
  useDeleteTeacherSessionRecordMutation,
  useBulkDeleteTeacherSessionRecordsMutation,
  useGetTelegramNotificationConfigQuery,
  useUpdateTelegramNotificationConfigMutation,
  useVerifyTelegramBotMutation,
  useGetTelegramStatusQuery,
  useGetTelegramParentsQuery,
  useUnbindTelegramParentMutation,
  useSendTelegramTestMessageMutation,
  useGetTeacherTelegramQuery,
  useGetStudentTelegramQuery,
  useGetAttendanceCalendarConfigQuery,
  useUpdateAttendanceCalendarConfigMutation,
  useGetAttendanceHolidaysQuery,
  useSaveAttendanceHolidayMutation,
  useDeleteAttendanceHolidayMutation,
  useBulkDeleteAttendanceHolidaysMutation,
  useGetClassAttendanceWorkspaceQuery,
  useGetClassAttendanceRecordsQuery,
  useSaveClassAttendanceRecordMutation,
  useDeleteClassAttendanceRecordMutation,
  useSaveClassAttendanceOfficersMutation,
} = ApiAttendance;
