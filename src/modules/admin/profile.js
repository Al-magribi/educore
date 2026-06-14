import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db.js";

const profileSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

export async function getAdminProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
}

export async function updateAdminProfile(userId, payload) {
  const name = payload.name?.trim();
  const email = payload.email?.trim()?.toLowerCase();
  const phone = payload.phone?.trim() || null;

  if (!name) throw new Error("Nama wajib diisi");
  if (!email) throw new Error("Email wajib diisi");

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  });
  if (existing) throw new Error("Email sudah digunakan akun lain");

  return prisma.user.update({
    where: { id: userId },
    data: { name, email, phone },
    select: profileSelect,
  });
}

export async function changeAdminPassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw new Error("Password lama dan baru wajib diisi");
  }
  if (newPassword.length < 8) {
    throw new Error("Password baru minimal 8 karakter");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new Error("Pengguna tidak ditemukan");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Password lama tidak sesuai");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
