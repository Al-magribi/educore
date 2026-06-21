import bcrypt from "bcryptjs";
import { ROLES } from "@/config/roles.js";
import { prisma } from "@/lib/db.js";

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

export async function listSpmbAdminUsers() {
  return prisma.user.findMany({
    where: { role: ROLES.SPMB_ADMIN },
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getSpmbAdminUser(id) {
  return prisma.user.findFirst({
    where: { id, role: ROLES.SPMB_ADMIN },
    select: userSelect,
  });
}

export async function createSpmbAdminUser(payload) {
  const name = payload.name?.trim();
  const email = payload.email?.trim()?.toLowerCase();
  const phone = payload.phone?.trim() || null;
  const password = payload.password;

  if (!name) throw new Error("Nama wajib diisi");
  if (!email) throw new Error("Email wajib diisi");
  if (!password) throw new Error("Password wajib diisi");
  if (password.length < 8) throw new Error("Password minimal 8 karakter");

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new Error("Email sudah digunakan");

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: ROLES.SPMB_ADMIN,
      emailVerifiedAt: new Date(),
    },
    select: userSelect,
  });
}

export async function updateSpmbAdminUser(id, payload) {
  const user = await getSpmbAdminUser(id);
  if (!user) throw new Error("Akun tidak ditemukan");

  const name = payload.name?.trim();
  const email = payload.email?.trim()?.toLowerCase();
  const phone = payload.phone?.trim() || null;
  const password = payload.password?.trim();

  if (!name) throw new Error("Nama wajib diisi");
  if (!email) throw new Error("Email wajib diisi");
  if (password && password.length < 8) throw new Error("Password minimal 8 karakter");

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id } },
    select: { id: true },
  });
  if (existing) throw new Error("Email sudah digunakan");

  /** @type {{ name: string; email: string; phone: string | null; passwordHash?: string }} */
  const data = { name, email, phone };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

export async function deleteSpmbAdminUser(id) {
  const user = await getSpmbAdminUser(id);
  if (!user) throw new Error("Akun tidak ditemukan");
  await prisma.user.delete({ where: { id } });
}
