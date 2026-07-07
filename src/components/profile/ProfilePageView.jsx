"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextInput } from "@/components/admin/home/AdminFormFields.js";
import { formatProfileDate, getRoleLabel } from "@/lib/profile/labels.js";

const emptyProfile = { name: "", email: "", phone: "" };
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };

function ProfileCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProfilePageView({ initialName = "" }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState(emptyPassword);
  const [role, setRole] = useState("");
  const [memberSince, setMemberSince] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            name: data.profile.name ?? "",
            email: data.profile.email ?? "",
            phone: data.profile.phone ?? "",
          });
          setRole(data.profile.role ?? "");
          setMemberSince(data.profile.createdAt ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile.name || initialName || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  const setProfileField = (key) => (e) =>
    setProfile((f) => ({ ...f, [key]: e.target.value }));

  const setPasswordField = (key) => (e) =>
    setPassword((f) => ({ ...f, [key]: e.target.value }));

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.profile) {
        setProfile({
          name: data.profile.name ?? "",
          email: data.profile.email ?? "",
          phone: data.profile.phone ?? "",
        });
      }
      setProfileMessage({ type: "success", text: data.message });
    } catch (err) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (password.newPassword !== password.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Konfirmasi password tidak cocok" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      setPassword(emptyPassword);
      setPasswordMessage({ type: "success", text: data.message });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
          <p className="text-sm">Memuat profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, var(--admin-primary, var(--color-primary, #2563eb)) 0%, color-mix(in srgb, var(--admin-primary, var(--color-primary, #2563eb)) 75%, #0f172a) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg ring-4 ring-white/20"
              style={{
                background: "color-mix(in srgb, white 20%, transparent)",
              }}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{displayName}</h1>
              <p className="mt-0.5 truncate text-sm text-white/85">{profile.email}</p>
              {role ? (
                <span className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/25">
                  {getRoleLabel(role)}
                </span>
              ) : null}
            </div>
          </div>

          {memberSince ? (
            <div className="rounded-xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/20 backdrop-blur-sm sm:text-right">
              <p className="text-white/70">Bergabung sejak</p>
              <p className="mt-0.5 font-semibold">{formatProfileDate(memberSince)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard
          title="Informasi Pribadi"
          description="Perbarui nama dan kontak yang terhubung dengan akun Anda."
        >
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <FormMessage message={profileMessage} />

            <Field label="Nama Lengkap">
              <TextInput value={profile.name} onChange={setProfileField("name")} required />
            </Field>

            <Field label="Email">
              <TextInput
                type="email"
                value={profile.email}
                onChange={setProfileField("email")}
                required
              />
            </Field>

            <Field label="Nomor Telepon" hint="Opsional — untuk keperluan kontak pendaftaran.">
              <TextInput
                type="tel"
                value={profile.phone ?? ""}
                onChange={setProfileField("phone")}
                placeholder="08xxxxxxxxxx"
              />
            </Field>

            <SaveButton saving={savingProfile}>Simpan Perubahan</SaveButton>
          </form>
        </ProfileCard>

        <ProfileCard title="Keamanan Akun" description="Ganti password secara berkala untuk menjaga keamanan.">
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <FormMessage message={passwordMessage} />

            <Field label="Password Saat Ini">
              <TextInput
                type="password"
                value={password.currentPassword}
                onChange={setPasswordField("currentPassword")}
                autoComplete="current-password"
                required
              />
            </Field>

            <Field label="Password Baru" hint="Minimal 8 karakter.">
              <TextInput
                type="password"
                value={password.newPassword}
                onChange={setPasswordField("newPassword")}
                autoComplete="new-password"
                required
              />
            </Field>

            <Field label="Konfirmasi Password Baru">
              <TextInput
                type="password"
                value={password.confirmPassword}
                onChange={setPasswordField("confirmPassword")}
                autoComplete="new-password"
                required
              />
            </Field>

            <SaveButton saving={savingPassword}>Ubah Password</SaveButton>
          </form>
        </ProfileCard>
      </div>
    </div>
  );
}
