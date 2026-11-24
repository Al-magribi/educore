import React, { useState } from "react";
import { Alert, Button, Form, Input, Typography } from "antd";
import { ArrowLeft, KeyRound, Mail, MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../../service/auth/ApiAuth";
import { museColors } from "../../config/theme";
import AuthShell from "./AuthShell";

const { Text } = Typography;

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
    return "Reset password lewat email belum tersedia. Hubungi admin sekolah untuk mengatur ulang password.";
  }
  return "Gagal mengirim tautan reset. Coba lagi beberapa saat lagi.";
};

const Forgot = () => {
  const [sentTo, setSentTo] = useState(null);
  const [forgotPassword, { isLoading, error, reset }] = useForgotPasswordMutation();

  const onFinish = async ({ email }) => {
    const normalized = email.trim();
    try {
      await forgotPassword({ email: normalized }).unwrap();
      setSentTo(normalized);
    } catch {
      // pesan ditampilkan lewat Alert di bawah
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        icon={<MailCheck size={24} />}
        title='Cek email Anda'
        description={
          <>
            Jika <Text strong>{sentTo}</Text> terdaftar, tautan untuk membuat password baru sudah
            dikirim. Tautan hanya berlaku sementara.
          </>
        }
        footer={<BackToLogin />}
      >
        <title>Lupa Password</title>
        <Alert
          type='info'
          showIcon
          title='Tidak menerima email?'
          description='Periksa folder spam, atau kirim ulang setelah beberapa menit.'
          style={{ marginBottom: 16 }}
        />
        <Button block onClick={() => setSentTo(null)}>
          Kirim ulang ke email lain
        </Button>
      </AuthShell>
    );
  }

  const errorText = getErrorText(error);

  return (
    <AuthShell
      icon={<KeyRound size={24} />}
      title='Lupa password?'
      description='Masukkan email yang terdaftar. Kami akan mengirim tautan untuk membuat password baru.'
      footer={<BackToLogin />}
    >
      <title>Lupa Password</title>
      <Form
        name='forgot'
        layout='vertical'
        requiredMark={false}
        onFinish={onFinish}
        onValuesChange={() => error && reset()}
      >
        {errorText ? (
          <Alert type='error' showIcon title={errorText} style={{ marginBottom: 16 }} />
        ) : null}

        <Form.Item
          label='Email'
          name='email'
          rules={[
            { required: true, message: "Email wajib diisi" },
            { type: "email", message: "Format email tidak valid" },
          ]}
        >
          <Input
            autoFocus
            type='email'
            autoComplete='email'
            prefix={<Mail size={16} color={museColors.muted} />}
            placeholder='nama@sekolah.sch.id'
          />
        </Form.Item>

        <Button type='primary' htmlType='submit' block size='large' loading={isLoading}>
          Kirim tautan reset
        </Button>
      </Form>
    </AuthShell>
  );
};

export default Forgot;
