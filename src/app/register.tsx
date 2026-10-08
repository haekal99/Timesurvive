import type { Href } from 'expo-router';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ChoiceGroup, Field, Muted, useColors } from '@/components/app-ui';
import { AuthShell } from '@/components/auth-shell';
import { useApp, type UserRole } from '@/context/app-context';
import { isValidEmail } from '@/utils/validation';

const roleOptions = [
  { label: 'General', value: 'General' },
  { label: 'Gamer', value: 'Gamer' },
  { label: 'Pro', value: 'Professional' },
];

export default function RegisterScreen() {
  const { data, ready, register } = useApp();
  const colors = useColors();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('General');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string; confirmPassword?: string }>({});

  if (ready && data.profile) return <Redirect href={'/(main)/dashboard' as Href} />;

  const submit = async () => {
    setError('');
    const errors = {
      username: username.trim() ? undefined : 'Username wajib diisi.',
      email: isValidEmail(email) ? undefined : 'Masukkan alamat email yang valid.',
      password: password.length >= 8 ? undefined : 'Kata sandi minimal 8 karakter.',
      confirmPassword: password === confirmPassword ? undefined : 'Konfirmasi kata sandi belum sama.',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    if (data.accountEmail) {
      setError('Akun lokal sudah terdaftar. Masuk atau reset password untuk melanjutkan.');
      return;
    }
    setBusy(true);
    try {
      await register({ username: username.trim(), email, role }, password);
      router.replace('/(main)/dashboard' as Href);
    } catch (submitError) {
      setError(`Pendaftaran gagal: ${submitError instanceof Error ? submitError.message : String(submitError)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Buat akunmu" subtitle="Simpan rutinitas, sesi, dan progres dalam satu ruang.">
      <Field label="Username" value={username} onChangeText={setUsername} placeholder="Nama panggilan" error={fieldErrors.username} />
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" error={fieldErrors.email} />
      <ChoiceGroup label="Kategori pengguna" value={role} options={roleOptions} onChange={(value) => setRole(value as UserRole)} />
      <Field label="Kata sandi" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" secureTextEntry error={fieldErrors.password} />
      <Field label="Konfirmasi kata sandi" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi kata sandi" secureTextEntry error={fieldErrors.confirmPassword} />
      {error ? <Text style={{ color: colors.negative, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
      <Button title={busy ? 'Membuat akun...' : 'Daftar Akun'} disabled={busy} loading={busy} onPress={() => void submit()} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 19 }}>
        <Muted>Sudah memiliki akun?</Muted>
        <Link href="/login" asChild>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>Masuk</Text>
        </Link>
      </View>
    </AuthShell>
  );
}
