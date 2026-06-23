import { prisma } from "@/lib/db.js";

export { getApplicantDashboardData, applicationStatusLabels } from "./applicant-dashboard.js";

export async function getApplicationByUserId(userId) {
  return prisma.application.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, periodId: true, submittedAt: true, updatedAt: true },
  });
}
