"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextInput } from "@/components/admin/home/AdminFormFields.js";

const emptyProfile = { name: "", email: "", phone: "" };
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfileTab() {
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState(emptyPassword);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            name: data.profile.name ?? "",
            email: data.profile.email ?? "",
            phone: data.profile.phone ?? "",
          });
          setRole(data.profile.role ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setProfileField = (key) => (e) =>
    setProfile((f) => ({ ...f, [key]: e.target.value }));

  const setPasswordField = (key) => (e) =>
    setPassword((f) => ({ ...f, [key]: e.target.value }));

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/admin/profile", {
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
      const res = await fetch("/api/admin/profile/password", {
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
    return <p className="text-sm text-slate-500">Memuat profil...</p>;
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleProfileSubmit} className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Informasi Akun</h3>
          <p className="mt-1 text-sm text-slate-500">
            Perbarui nama dan kontak admin yang sedang login.
          </p>
        </div>

        <FormMessage message={profileMessage} />

        {role ? (
          <p className="text-sm text-slate-600">
            Peran: <span className="font-medium text-slate-900">{role.replace("_", " ")}</span>
          </p>
        ) : null}

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

        <Field label="Telepon">
          <TextInput value={profile.phone} onChange={setProfileField("phone")} />
        </Field>

        <SaveButton saving={savingProfile}>Simpan Profil</SaveButton>
      </form>

      <hr className="border-slate-200" />

      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Ubah Password</h3>
          <p className="mt-1 text-sm text-slate-500">Minimal 8 karakter.</p>
        </div>

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

        <Field label="Password Baru">
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
    </div>
  );
}
