import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, ConfirmDialog, EmptyState, Field, ModalSheet, Page, Panel, useColors } from '@/components/app-ui';
import { dateKey, useApp } from '@/context/app-context';
import { isValidDateKey } from '@/utils/validation';

const platforms = [
  { label: 'Mobile', value: 'Mobile' },
  { label: 'PC', value: 'PC' },
  { label: 'Console', value: 'Console' },
  { label: 'Lainnya', value: 'Lainnya' },
];
const ratings = [1, 2, 3, 4, 5].map((value) => ({ label: `${value} ★`, value: String(value) }));

function inRecentWeek(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const entry = new Date(year, month - 1, day);
  entry.setHours(0, 0, 0, 0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return entry >= start;
}

export default function GamingScreen() {
  const { data, addGame, updateGame, deleteGame } = useApp();
  const { quickAdd } = useLocalSearchParams<{ quickAdd?: string }>();
  const colors = useColors();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('');
  const [platform, setPlatform] = useState('Mobile');
  const [rating, setRating] = useState('4');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(dateKey());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    hours?: string;
    minutes?: string;
    date?: string;
  }>({});
  const totalWeek = data.games.filter((game) => inRecentWeek(game.date)).reduce((total, game) => total + game.minutes, 0);
  const selectedGames = data.games.filter((game) => game.date === selectedDate);
  const totalSelectedDay = selectedGames.reduce((total, game) => total + game.minutes, 0);

  const shiftDate = (amount: number) => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() + amount);
    setSelectedDate(dateKey(selected));
  };

  useEffect(() => {
    if (quickAdd) {
      setFormOpen(true);
      router.setParams({ quickAdd: '' });
    }
  }, [quickAdd]);

  const openForm = (game?: (typeof data.games)[number]) => {
    setEditingId(game?.id ?? null);
    setTitle(game?.title ?? '');
    setHours(game ? String(Math.floor(game.minutes / 60)) : '0');
    setMinutes(game ? String(game.minutes % 60) : '');
    setPlatform(game?.platform ?? 'Mobile');
    setRating(String(game?.rating ?? 4));
    setNotes(game?.notes ?? '');
    setDate(game?.date ?? selectedDate);
    setFormErrors({});
    setFormOpen(true);
  };

  const saveGame = () => {
    const hoursValue = hours === '' ? 0 : Number(hours);
    const minutesValue = minutes === '' ? 0 : Number(minutes);
    const errors = {
      title: title.trim() ? undefined : 'Judul game wajib diisi.',
      hours: /^\d+$/.test(hours || '0') && Number.isSafeInteger(hoursValue) ? undefined : 'Jam harus berupa bilangan bulat nonnegatif.',
      minutes: /^\d+$/.test(minutes || '0') && Number.isInteger(minutesValue) && minutesValue >= 0 && minutesValue <= 59
        ? undefined
        : 'Menit harus berupa bilangan bulat dari 0 sampai 59.',
      date: isValidDateKey(date) ? undefined : 'Gunakan tanggal kalender yang valid (YYYY-MM-DD).',
    };
    const duration = hoursValue * 60 + minutesValue;
    if (!Number.isSafeInteger(duration)) {
      errors.hours = 'Durasi terlalu besar.';
    } else if (duration <= 0) {
      errors.minutes = 'Durasi sesi harus lebih dari 0 menit.';
    }
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    const entry = { title: title.trim(), minutes: duration, platform, rating: Number(rating), notes: notes.trim(), date: date.trim() };
    if (editingId) updateGame(editingId, entry);
    else addGame(entry);
    setFormOpen(false);
  };

  return (
    <Page title="Log Gaming" subtitle="Nikmati sesi bermain, tetap jaga jeda." action={<Button compact title="+ Catat sesi" onPress={() => openForm()} />}>
      <Panel>
        <Text style={[styles.kicker, { color: colors.muted }]}>TOTAL MINGGU INI</Text>
        <View style={styles.totalRow}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{Math.floor(totalWeek / 60)}j {totalWeek % 60}m</Text>
          <Text style={[styles.smallValue, { color: colors.muted }]}>{data.games.filter((game) => inRecentWeek(game.date)).length} sesi</Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceSoft }]}>
          <View style={[styles.fill, { width: `${Math.min(100, (totalWeek / 1800) * 100)}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.caption, { color: colors.muted }]}>Target nyaman: 30 jam atau kurang per minggu.</Text>
      </Panel>

      <Panel style={styles.datePanel}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hari sebelumnya" onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Text style={[styles.dateArrowText, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.dateCopy}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`))}</Text>
          <Text style={[styles.caption, { color: colors.muted, marginTop: 3 }]}>{selectedGames.length} sesi · {Math.floor(totalSelectedDay / 60)}j {totalSelectedDay % 60}m</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Hari berikutnya" onPress={() => shiftDate(1)} style={styles.dateArrow}>
          <Text style={[styles.dateArrowText, { color: colors.primary }]}>›</Text>
        </Pressable>
      </Panel>

      {totalSelectedDay > 180 ? (
        <Panel style={{ backgroundColor: colors.positive + '12', borderColor: colors.positive + '44' }}>
          <Text style={[styles.alertTitle, { color: colors.positive }]}>Waktunya rehat sejenak</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Kamu sudah bermain {Math.floor(totalSelectedDay / 60)} jam {totalSelectedDay % 60} menit pada tanggal ini. Minum air dan istirahatkan mata, ya.</Text>
        </Panel>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Riwayat sesi</Text>
      {selectedGames.length ? selectedGames.map((game) => (
        <Panel key={game.id}>
          <View style={styles.totalRow}>
            <View style={styles.gameCopy}>
              <Text style={[styles.gameTitle, { color: colors.text }]}>{game.title}</Text>
              <Text style={[styles.caption, { color: colors.muted }]}>{game.platform} · {game.date}</Text>
            </View>
            <View style={styles.gameResult}>
              <Text style={[styles.duration, { color: colors.primary }]}>{Math.floor(game.minutes / 60)}j {game.minutes % 60}m</Text>
              <Text style={[styles.rating, { color: colors.positive }]}>{'★'.repeat(game.rating)}</Text>
            </View>
          </View>
          {game.notes ? <Text style={[styles.notes, { color: colors.muted }]}>{game.notes}</Text> : null}
          <View style={styles.actions}>
            <Button compact title="Edit" variant="secondary" onPress={() => openForm(game)} />
            <Button compact title="Hapus" variant="quiet" onPress={() => setDeleteId(game.id)} />
          </View>
        </Panel>
      )) : <EmptyState title="Belum ada sesi gaming" description="Tambahkan sesi gaming untuk melihat riwayat di sini." />}

      <ModalSheet visible={formOpen} title={editingId ? 'Edit sesi gaming' : 'Catat sesi gaming'} onClose={() => setFormOpen(false)}>
        <Field label="Judul game" value={title} onChangeText={setTitle} placeholder="Nama game" error={formErrors.title} />
        <View style={styles.durationFields}>
          <View style={styles.durationField}><Field label="Jam" value={hours} onChangeText={setHours} keyboardType="numeric" placeholder="0" error={formErrors.hours} /></View>
          <View style={styles.durationField}><Field label="Menit" value={minutes} onChangeText={setMinutes} keyboardType="numeric" placeholder="45" error={formErrors.minutes} /></View>
        </View>
        <ChoiceGroup label="Platform" value={platform} options={platforms} onChange={setPlatform} />
        <ChoiceGroup label="Rating sesi" value={rating} options={ratings} onChange={setRating} />
        <Field label="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={dateKey()} error={formErrors.date} />
        <Field label="Catatan / achievement" value={notes} onChangeText={setNotes} placeholder="Catatan singkat" multiline />
        <Button title={editingId ? 'Simpan sesi' : 'Tambah sesi'} onPress={saveGame} />
      </ModalSheet>

      <ConfirmDialog visible={Boolean(deleteId)} title="Hapus sesi gaming?" message="Riwayat ini akan dihapus dari perangkat." confirmLabel="Hapus" danger onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteGame(deleteId); setDeleteId(null); }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  datePanel: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dateArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  dateArrowText: { fontSize: 31, lineHeight: 34, fontWeight: '500' },
  dateCopy: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  kicker: { fontSize: 10, fontWeight: '800' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  totalValue: { fontSize: 23, fontWeight: '800', marginTop: 5 },
  smallValue: { fontSize: 11, fontWeight: '700' },
  track: { height: 6, borderRadius: 4, overflow: 'hidden', marginTop: 13 },
  fill: { height: '100%' },
  caption: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  alertTitle: { fontSize: 14, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 9, marginBottom: 11 },
  gameCopy: { flex: 1 },
  gameTitle: { fontSize: 15, fontWeight: '800' },
  gameResult: { alignItems: 'flex-end' },
  duration: { fontSize: 14, fontWeight: '800' },
  rating: { fontSize: 11, marginTop: 3 },
  notes: { fontSize: 12, marginTop: 9 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  empty: { textAlign: 'center', fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  durationFields: { flexDirection: 'row', gap: 10 },
  durationField: { flex: 1 },
});
