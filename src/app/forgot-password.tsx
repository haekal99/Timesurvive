import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Field, useColors } from '@/components/app-ui';
import { AuthShell } from '@/components/auth-shell';
import { useApp } from '@/context/app-context';
import { isValidEmail } from '@/utils/validation';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useApp();
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmation?: string }>({});

  const submit = async () => {
    setError('');
    setMessage('');
    const errors = {
      email: isValidEmail(email) ? undefined : 'Masukkan alamat email yang valid.',
      password: password.length >= 8 ? undefined : 'Kata sandi minimal 8 karakter.',
      confirmation: password === confirmation ? undefined : 'Konfirmasi kata sandi belum sama.',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      const success = await resetPassword(email, password);
      if (!success) {
        setError('Email tidak cocok dengan akun lokal di perangkat ini.');
        return;
      }
      setMessage('Kata sandi lokal berhasil diperbarui. Silakan masuk kembali.');
    } catch (submitError) {
      setError(`Kata sandi gagal diperbarui: ${submitError instanceof Error ? submitError.message : String(submitError)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Atur ulang password" subtitle="Pemulihan akun lokal dikelola langsung di perangkat ini.">
      <Field label="Email akun" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" error={fieldErrors.email} />
      <Field label="Kata sandi baru" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" secureTextEntry error={fieldErrors.password} />
      <Field label="Ulangi kata sandi baru" value={confirmation} onChangeText={setConfirmation} placeholder="Konfirmasi kata sandi" secureTextEntry error={fieldErrors.confirmation} />
      {error ? <Text style={{ color: colors.negative, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
      {message ? <Text style={{ color: colors.positive, fontSize: 12, marginBottom: 12 }}>{message}</Text> : null}
      <Button title="Perbarui Password" loading={busy} disabled={busy} onPress={() => void submit()} />
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 13 }}>
        Tidak ada email yang dikirim. Pastikan perangkat ini milikmu sebelum mengganti kata sandi.
      </Text>
      <Link href="/login" asChild>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 18 }}>
          Kembali ke Masuk
        </Text>
      </Link>
    </AuthShell>
  );
}
