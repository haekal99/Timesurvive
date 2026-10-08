import type { Href } from 'expo-router';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Field, Muted, useColors } from '@/components/app-ui';
import { AuthShell } from '@/components/auth-shell';
import { useApp } from '@/context/app-context';

export default function LoginScreen() {
  const { data, ready, login } = useApp();
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (ready && data.profile) return <Redirect href={'/(main)/dashboard' as Href} />;

  const submit = async () => {
    setError('');
    setEmailError('');
    setPasswordError('');
    if (!email.trim()) {
      setEmailError('Email atau username wajib diisi.');
      return;
    }
    if (!password) {
      setPasswordError('Kata sandi wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      const success = await login(email, password);
      if (success) router.replace('/(main)/dashboard' as Href);
      else setError('Email atau kata sandi tidak cocok dengan akun di perangkat ini.');
    } catch (submitError) {
      setError(`Gagal masuk: ${submitError instanceof Error ? submitError.message : String(submitError)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Selamat datang kembali" subtitle="Masuk untuk melanjutkan perjalananmu.">
      <Field label="Email atau username" value={email} onChangeText={setEmail} placeholder="nama@email.com atau username" error={emailError} />
      <Field label="Kata sandi" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" secureTextEntry error={passwordError} />
      {error ? <Text style={{ color: colors.negative, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
      <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
        <Link href="/forgot-password" asChild>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Lupa Password?</Text>
        </Link>
      </View>
      <Button title={busy ? 'Memeriksa...' : 'Masuk'} disabled={busy} loading={busy} onPress={() => void submit()} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 19 }}>
        <Muted>Belum memiliki akun?</Muted>
        <Link href="/register" asChild>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>Daftar</Text>
        </Link>
      </View>
    </AuthShell>
  );
}
