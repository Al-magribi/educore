import React, { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Flex, Form, Input, Segmented, message } from "antd";
import { KeyRound, LogIn, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useDoSigninMutation } from "../../service/auth/ApiAuth";
import { museColors } from "../../config/theme";
import AuthShell from "./AuthShell";

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "Guru", value: "guru" },
  { label: "Siswa", value: "siswa" },
  { label: "Wali", value: "wali" },
];

const usernameHint = {
  admin: "Username admin",
  guru: "Username atau NIP",
  siswa: "Username atau NIS",
  wali: "Username wali",
};

const Signin = () => {
  const [role, setRole] = useState("admin");
  const [doSignin, { data, error, isLoading, isSuccess, reset }] = useDoSigninMutation();

  const roleLabel = roleOptions.find((item) => item.value === role)?.label;

  const onFinish = (values) => {
    doSignin({
      ...values,
      username: (values.username || "").trim(),
      password: (values.password || "").trim(),
      role,
    });
  };

  useEffect(() => {
    if (isSuccess) {
      message.success(data?.message || "Berhasil masuk");
    }
  }, [data, isSuccess]);

  const errorText = error
    ? error?.data?.message ||
      (error?.status === "FETCH_ERROR"
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
        : "Gagal masuk. Periksa username dan password.")
    : null;

  return (
    <AuthShell
      title='Masuk'
      description='Pilih peran Anda, lalu masuk dengan akun yang diberikan sekolah.'
    >
      <title>{`Masuk ${roleLabel}`}</title>
      <Form
        name='login'
        layout='vertical'
        requiredMark={false}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        onValuesChange={() => error && reset()}
      >
        <Form.Item label='Masuk sebagai'>
          <Segmented
            block
            aria-label='Pilih peran'
            options={roleOptions}
            value={role}
            onChange={(value) => {
              setRole(value);
              if (error) reset();
            }}
            style={{ background: museColors.bgSoft, padding: 3 }}
          />
        </Form.Item>

        {errorText ? (
          <Alert type='error' showIcon title={errorText} style={{ marginBottom: 16 }} />
        ) : null}

        <Form.Item
          label='Username'
          name='username'
          rules={[{ required: true, whitespace: true, message: "Username wajib diisi" }]}
        >
          <Input
            autoFocus
            autoComplete='username'
            prefix={<UserRound size={16} color={museColors.muted} />}
            placeholder={usernameHint[role]}
          />
        </Form.Item>

        <Form.Item
          label='Password'
          name='password'
          rules={[{ required: true, message: "Password wajib diisi" }]}
        >
          <Input.Password
            autoComplete='current-password'
            prefix={<KeyRound size={16} color={museColors.muted} />}
            placeholder='Masukkan password'
          />
        </Form.Item>

        <Flex justify='space-between' align='center' style={{ marginBottom: 24 }}>
          <Form.Item name='remember' valuePropName='checked' noStyle>
            <Checkbox>Ingat saya</Checkbox>
          </Form.Item>
          <Link to='/forgot-password' style={{ fontWeight: 600 }}>
            Lupa password?
          </Link>
        </Flex>

        <Button
          type='primary'
          htmlType='submit'
          block
          size='large'
          loading={isLoading}
          icon={<LogIn size={16} />}
        >
          Masuk sebagai {roleLabel}
        </Button>
      </Form>
    </AuthShell>
  );
};

export default Signin;
