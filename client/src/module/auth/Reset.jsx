import React from "react";
import { Alert, Button, Form, Input, Result, message } from "antd";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useResetPasswordMutation } from "../../service/auth/ApiAuth";
import { museColors } from "../../config/theme";
import AuthShell from "./AuthShell";

const MIN_LENGTH = 8;

const BackToLogin = () => (
  <Link to='/' style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
    <ArrowLeft size={16} /> Kembali ke halaman masuk
  </Link>
);

const getErrorText = (error) => {
  if (!error) return null;
  if (error?.data?.message) return error.data.message;
  if (error?.status === "FETCH_ERROR") {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  }
  if (error?.status === 404) {
    return "Reset password belum tersedia. Hubungi admin sekolah untuk mengatur ulang password.";
  }
  return "Gagal mengubah password. Tautan mungkin sudah kedaluwarsa, minta tautan baru.";
};

const Reset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [resetPassword, { isLoading, error, reset }] = useResetPasswordMutation();

  const onFinish = async ({ newPassword }) => {
    try {
      const res = await resetPassword({ token, password: newPassword }).unwrap();
      message.success(res?.message || "Password berhasil diubah. Silakan masuk.");
      navigate("/", { replace: true });
    } catch {
      // pesan ditampilkan lewat Alert di bawah
    }
  };

  if (!token) {
    return (
      <AuthShell title='Tautan tidak valid' footer={<BackToLogin />}>
        <title>Reset Password</title>
        <Result
          status='warning'
          style={{ padding: 0 }}
          subTitle='Tautan reset password tidak lengkap atau sudah tidak berlaku. Minta tautan baru dari halaman lupa password.'
          extra={
            <Link to='/forgot-password'>
              <Button type='primary'>Minta tautan baru</Button>
            </Link>
          }
        />
      </AuthShell>
    );
  }

  const errorText = getErrorText(error);

  return (
    <AuthShell
      icon={<LockKeyhole size={24} />}
      title='Buat password baru'
      description={`Gunakan minimal ${MIN_LENGTH} karakter dan jangan pakai password lama.`}
      footer={<BackToLogin />}
    >
      <title>Reset Password</title>
      <Form
        name='reset'
        layout='vertical'
        requiredMark={false}
        onFinish={onFinish}
        onValuesChange={() => error && reset()}
      >
        {errorText ? (
          <Alert type='error' showIcon title={errorText} style={{ marginBottom: 16 }} />
        ) : null}

        <Form.Item
          label='Password baru'
          name='newPassword'
          hasFeedback
          rules={[
            { required: true, message: "Password baru wajib diisi" },
            { min: MIN_LENGTH, message: `Password minimal ${MIN_LENGTH} karakter` },
          ]}
        >
          <Input.Password
            autoFocus
            autoComplete='new-password'
            prefix={<KeyRound size={16} color={museColors.muted} />}
            placeholder='Password baru'
          />
        </Form.Item>

        <Form.Item
          label='Ulangi password baru'
          name='confirmPassword'
          dependencies={["newPassword"]}
          hasFeedback
          rules={[
            { required: true, message: "Konfirmasi password wajib diisi" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Password tidak sama"));
              },
            }),
          ]}
        >
          <Input.Password
            autoComplete='new-password'
            prefix={<KeyRound size={16} color={museColors.muted} />}
            placeholder='Ketik ulang password baru'
          />
        </Form.Item>

        <Button type='primary' htmlType='submit' block size='large' loading={isLoading}>
          Simpan password baru
        </Button>
      </Form>
    </AuthShell>
  );
};

export default Reset;
