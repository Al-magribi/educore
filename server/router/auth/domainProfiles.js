// Titik sambung profil login per domain (milik main).
//
// RouterAuth hanya memuat data inti (student, teacher, parent, admin). Data
// tambahan milik sebuah domain ditaruh di file domain itu sendiri:
//
//   server/router/lms/authProfile.js
//   server/router/finance/authProfile.js
//   server/router/tahfiz/authProfile.js
//
// File domain dimiliki feature/<domain> dan ikut dipulihkan compose bersama
// folder server/router/<domain>/. Produk tanpa domain itu tidak punya filenya,
// jadi dilewati. Feature tidak perlu (dan tidak boleh) mengedit RouterAuth.js.
//
// Bentuk file domain (semua properti opsional):
//
//   import { AuthDeniedError } from "../auth/domainProfiles.js";
//
//   export default {
//     // Role di luar role inti. Dipakai saat signin, load-user, dan update-profile.
//     roles: {
//       staff: {
//         loadSigninProfile: async (db, userId) => ({ ...kolom profil }),
//         loadUserProfile: async (db, userId) => ({ id, username, ..., kolom profil }),
//         detailTable: "u_staff", // tabel email/phone untuk update-profile
//       },
//     },
//     // Tambah/ubah field user setelah profil dimuat. phase: "signin" | "load-user".
//     // Lempar AuthDeniedError untuk menolak login dengan pesan 403.
//     enrichProfile: async ({ db, user, phase }) => {},
//   };

import fs from "fs";
import { fileURLToPath } from "url";

// Urutan berpengaruh: enrichProfile dijalankan berurutan dan boleh membaca
// field yang diisi domain sebelumnya.
const DOMAIN_PROFILE_MODULES = [
  "../lms/authProfile.js",
  "../finance/authProfile.js",
  "../tahfiz/authProfile.js",
];

export class AuthDeniedError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "AuthDeniedError";
    this.status = status;
  }
}

let loadedProfiles = null;

const loadProfileModule = async (modulePath) => {
  const filePath = fileURLToPath(new URL(modulePath, import.meta.url));

  // Hanya "file domain tidak ada" yang dilewati. Error lain di dalam file domain
  // (import rusak, syntax error) tetap dilempar agar tidak hilang diam-diam.
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const { default: profile } = await import(modulePath);
  return profile || null;
};

export const getDomainProfiles = async () => {
  if (!loadedProfiles) {
    loadedProfiles = Promise.all(DOMAIN_PROFILE_MODULES.map(loadProfileModule))
      .then((profiles) => profiles.filter(Boolean))
      .catch((error) => {
        loadedProfiles = null;
        throw error;
      });
  }
  return loadedProfiles;
};

export const findDomainRole = async (role) => {
  const profiles = await getDomainProfiles();
  return profiles.map((profile) => profile.roles?.[role]).find(Boolean) || null;
};

export const enrichDomainProfiles = async ({ db, user, phase }) => {
  const profiles = await getDomainProfiles();
  for (const profile of profiles) {
    if (typeof profile.enrichProfile === "function") {
      await profile.enrichProfile({ db, user, phase });
    }
  }
  return user;
};
