import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, ConfirmDialog, Field, ModalSheet, Page, Panel, ThemeToggle, useColors } from '@/components/app-ui';
import { useApp, type UserRole } from '@/context/app-context';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import type { LocalDataExportFormat } from '@/types';
import { isValidEmail } from '@/utils/validation';
import { exportLocalData } from '@/utils/local-data-export';

const roles = [
  { label: 'General', value: 'General' },
  { label: 'Gamer', value: 'Gamer' },
  { label: 'Pro', value: 'Professional' },
];

export default function ProfileScreen() {
  const { data, updateProfile, resetPassword, logout, deleteAccount } = useApp();
  const colors = useColors();
  const { successMessage, showSuccess, clearSuccess } = useSuccessFeedback();
  const profile = data.profile;
  const [formOpen, setFormOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(profile?.role ?? 'General');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<LocalDataExportFormat | null>(null);
  const [exportError, setExportError] = useState('');

  const openForm = () => {
    clearSuccess();
    setUsername(profile?.username ?? '');
    setEmail(profile?.email ?? '');
    setPassword('');
    setConfirmPassword('');
    setRole(profile?.role ?? 'General');
    setError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const saveProfile = async () => {
    const errors = {
      username: username.trim() ? undefined : 'Username wajib diisi.',
      email: isValidEmail(email) ? undefined : 'Masukkan alamat email yang valid.',
      password: password && password.length < 8 ? 'Kata sandi minimal 8 karakter.' : undefined,
      confirmPassword: password && password !== confirmPassword ? 'Konfirmasi kata sandi belum sama.' : undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    setError('');
    try {
      if (password && !(await resetPassword(profile?.email ?? '', password))) {
        setError('Kata sandi belum dapat diperbarui.');
        return;
      }
      updateProfile({ username: username.trim(), email: email.trim().toLowerCase(), role });
      showSuccess('Profil berhasil diperbarui.');
      setFormOpen(false);
    } catch (saveError) {
      setError(`Profil gagal disimpan: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const chooseAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Izinkan akses foto untuk memilih avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.55,
        base64: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const avatarUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        updateProfile({ avatarUri });
        showSuccess('Foto profil berhasil diperbarui.');
        setError('');
      }
    } catch {
      setError('Foto belum dapat dibuka. Coba pilih gambar lain.');
    }
  };

  const exportData = async (format: LocalDataExportFormat) => {
    setExporting(format);
    setExportError('');
    try {
      await exportLocalData(data, format);
      showSuccess(`Ekspor ${format.toUpperCase()} berhasil disiapkan.`);
    } catch (exportFailure) {
      setExportError(`Ekspor data gagal: ${exportFailure instanceof Error ? exportFailure.message : String(exportFailure)}`);
    } finally {
      setExporting(null);
    }
  };

  const leave = () => {
    setLogoutOpen(false);
    logout();
    router.replace('/login');
  };

  const reset = () => {
    setDeleteOpen(false);
    deleteAccount();
    router.replace('/login');
  };

  return (
    <Page title="Profil" subtitle="Akun lokal dan preferensi aplikasi." successMessage={successMessage}>
      <Panel style={styles.profilePanel}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceSoft }]}>
          {profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarLetter, { color: colors.primary }]}>{profile?.username.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={[styles.username, { color: colors.text }]}>{profile?.username}</Text>
          <Text style={[styles.email, { color: colors.muted }]}>{profile?.email}</Text>
          <Text style={[styles.status, { color: colors.positive }]}>AKUN LOKAL AKTIF</Text>
        </View>
      </Panel>

      <View style={styles.actions}>
        <Button compact title="Pilih foto avatar" variant="secondary" onPress={() => void chooseAvatar()} />
        <Button compact title="Edit profil" onPress={openForm} />
      </View>
      {error ? <Text style={{ color: colors.negative, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}

      <Panel>
        <InfoRow label="Kategori" value={profile?.role ?? '-'} />
        <InfoRow label="Bergabung" value={profile?.joinedAt ?? '-'} />
        <InfoRow label="Mode tampilan" value={data.theme === 'dark' ? 'Eye-care malam' : 'Clean day'} last />
      </Panel>

      <Panel>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferensi tampilan</Text>
        <Text style={[styles.helpText, { color: colors.muted }]}>Pilihan ini diterapkan langsung ke semua layar dan disimpan di perangkat.</Text>
        <View style={styles.themeRow}>
          <Text style={[styles.themeName, { color: colors.text }]}>{data.theme === 'dark' ? 'Dark mode' : 'Light mode'}</Text>
          <ThemeToggle />
        </View>
      </Panel>

      <Panel>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Keamanan lokal</Text>
        <Text style={[styles.helpText, { color: colors.muted }]}>Kata sandi disimpan sebagai digest. Data aplikasi berada di penyimpanan perangkat dan tidak disinkronkan ke server.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/forgot-password')}>
          <Text style={[styles.link, { color: colors.primary }]}>Atur ulang kata sandi</Text>
        </Pressable>
      </Panel>

      <Panel>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ekspor data lokal</Text>
        <Text style={[styles.helpText, { color: colors.muted }]}>
          Bagikan cadangan rutinitas, gaming, transaksi, tagihan, dan progres dalam format JSON atau CSV.
        </Text>
        <View style={styles.actions}>
          <Button
            compact
            title="Ekspor JSON"
            variant="secondary"
            loading={exporting === 'json'}
            disabled={exporting !== null}
            onPress={() => { void exportData('json'); }}
          />
          <Button
            compact
            title="Ekspor CSV"
            variant="secondary"
            loading={exporting === 'csv'}
            disabled={exporting !== null}
            onPress={() => { void exportData('csv'); }}
          />
        </View>
        {exportError ? <Text style={{ color: colors.negative, fontSize: 12, marginTop: 10 }}>{exportError}</Text> : null}
      </Panel>

      <Button title="Keluar dari akun" variant="secondary" onPress={() => setLogoutOpen(true)} />
      <Button title="Hapus akun & reset semua data" variant="quiet" onPress={() => setDeleteOpen(true)} />

      <ModalSheet visible={formOpen} title="Edit profil" onClose={() => setFormOpen(false)}>
        <Field label="Username" value={username} onChangeText={setUsername} placeholder="Nama panggilan" error={fieldErrors.username} />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="nama@email.com" keyboardType="email-address" error={fieldErrors.email} />
        <ChoiceGroup label="Kategori pengguna" value={role} options={roles} onChange={(value) => setRole(value as UserRole)} />
        <Field label="Kata sandi baru (opsional)" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" secureTextEntry error={fieldErrors.password} />
        {password ? <Field label="Konfirmasi kata sandi baru" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi kata sandi" secureTextEntry error={fieldErrors.confirmPassword} /> : null}
        {error ? <Text style={{ color: colors.negative, fontSize: 12, marginBottom: 12 }}>{error}</Text> : null}
        <Button title="Simpan profil" loading={saving} disabled={saving} onPress={() => void saveProfile()} />
      </ModalSheet>

      <ConfirmDialog visible={logoutOpen} title="Keluar dari sesi?" message="Rutinitas, catatan gaming, dan transaksi tetap tersimpan di perangkat." confirmLabel="Keluar" onCancel={() => setLogoutOpen(false)} onConfirm={leave} />
      <ConfirmDialog visible={deleteOpen} title="Hapus semua data?" message="Akun lokal, jadwal, sesi gaming, foto avatar, dan seluruh transaksi akan dihapus permanen dari perangkat ini." confirmLabel="Hapus semua" danger onCancel={() => setDeleteOpen(false)} onConfirm={reset} />
    </Page>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profilePanel: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 25, fontWeight: '800' },
  identity: { flex: 1, minWidth: 0 },
  username: { fontSize: 17, fontWeight: '800' },
  email: { fontSize: 12, marginTop: 4 },
  status: { fontSize: 9, fontWeight: '800', marginTop: 7 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  infoRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  helpText: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  themeName: { fontSize: 13, fontWeight: '700' },
  link: { fontSize: 12, fontWeight: '800', marginTop: 14 },
});
