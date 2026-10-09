import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ChoiceGroup, ConfirmDialog, EmptyState, Field, ModalSheet, Page, Panel, useColors } from '@/components/app-ui';
import { dateKey, useApp } from '@/context/app-context';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { isValidDateKey, isValidTimeRange } from '@/utils/validation';

const filters = [
  { label: 'Semua', value: 'all' },
  { label: 'Selesai', value: 'done' },
  { label: 'Belum', value: 'open' },
];
const historyScopes = [
  { label: 'Tanggal ini', value: 'selected' },
  { label: 'Semua tanggal', value: 'all' },
];

export default function DailyScreen() {
  const { data, addRoutine, updateRoutine, deleteRoutine } = useApp();
  const { quickAdd } = useLocalSearchParams<{ quickAdd?: string }>();
  const colors = useColors();
  const [filter, setFilter] = useState('all');
  const [historyScope, setHistoryScope] = useState('all');
  const { successMessage, showSuccess, clearSuccess } = useSuccessFeedback();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dateKey());
  const [formErrors, setFormErrors] = useState<{ time?: string; title?: string; date?: string }>({});
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [clock, setClock] = useState(new Date());
  const [focusTitle, setFocusTitle] = useState('');
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const selectedDayRoutines = data.routines.filter((routine) => routine.date === selectedDate);
  const completed = selectedDayRoutines.filter((routine) => routine.done).length;
  const routines = (historyScope === 'all' ? data.routines : selectedDayRoutines)
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date) || left.time.localeCompare(right.time));
  const visibleRoutines = routines.filter((routine) =>
    filter === 'all' || (filter === 'done' ? routine.done : !routine.done),
  );

  useEffect(() => {
    if (!focusRunning || focusSeconds === 0) return;
    const timeout = setTimeout(() => {
      setFocusSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [focusRunning, focusSeconds]);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (quickAdd) {
      const timeout = setTimeout(() => {
        setEditingId(null);
        setTime('');
        setTitle('');
        setDate(selectedDate);
        setFormErrors({});
        setFormOpen(true);
        router.setParams({ quickAdd: '' });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [quickAdd, selectedDate]);

  const shiftDate = (amount: number) => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() + amount);
    setSelectedDate(dateKey(selected));
  };

  const openForm = (routine?: (typeof data.routines)[number]) => {
    clearSuccess();
    setEditingId(routine?.id ?? null);
    setTime(routine?.time ?? '');
    setTitle(routine?.title ?? '');
    setDate(routine?.date ?? selectedDate);
    setFormErrors({});
    setFormOpen(true);
  };

  const saveRoutine = () => {
    const errors = {
      time: isValidTimeRange(time) ? undefined : 'Gunakan jam valid, misalnya 08:00 atau 08:00 - 10:00.',
      title: title.trim() ? undefined : 'Nama aktivitas wajib diisi.',
      date: isValidDateKey(date) ? undefined : 'Gunakan tanggal kalender yang valid (YYYY-MM-DD).',
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      return;
    }
    const routineDate = date.trim();
    const routineTitle = title.trim();
    if (editingId) {
      updateRoutine(editingId, { time: time.trim(), title: routineTitle, date: routineDate });
      showSuccess(`Aktivitas "${routineTitle}" berhasil diperbarui.`);
    } else {
      addRoutine({ time: time.trim(), title: routineTitle, date: routineDate });
      showSuccess(`Aktivitas "${routineTitle}" berhasil ditambahkan.`);
    }
    setSelectedDate(routineDate);
    setHistoryScope('selected');
    setFormOpen(false);
  };

  return (
    <Page
      title="Log Harian"
      subtitle="Ritme yang ringan, satu agenda pada satu waktu."
      successMessage={successMessage}
      action={<Button compact title="+ Tambah" onPress={() => openForm()} />}>
      <Panel style={styles.datePanel}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hari sebelumnya" onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Text style={[styles.dateArrowText, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.dateCopy}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`))}
          </Text>
          <Text style={[styles.dateHint, { color: colors.muted }]}>
            {selectedDate === dateKey() ? `Sekarang · ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(clock)}` : 'Riwayat jadwal'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Hari berikutnya" onPress={() => shiftDate(1)} style={styles.dateArrow}>
          <Text style={[styles.dateArrowText, { color: colors.primary }]}>›</Text>
        </Pressable>
      </Panel>

      <Panel>
        <View style={styles.summaryLine}>
          <View>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Progres tanggal terpilih</Text>
            <Text style={[styles.summaryCaption, { color: colors.muted }]}>{completed} dari {selectedDayRoutines.length} aktivitas selesai</Text>
          </View>
          <Text style={[styles.percent, { color: colors.positive }]}>
            {selectedDayRoutines.length ? Math.round((completed / selectedDayRoutines.length) * 100) : 0}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSoft }]}>
          <View style={[styles.progressFill, { width: `${selectedDayRoutines.length ? (completed / selectedDayRoutines.length) * 100 : 0}%`, backgroundColor: colors.positive }]} />
        </View>
        <ChoiceGroup label="Tampilkan catatan" value={historyScope} options={historyScopes} onChange={setHistoryScope} />
        <ChoiceGroup value={filter} options={filters} onChange={setFilter} />
      </Panel>

      {visibleRoutines.length ? visibleRoutines.map((routine, index) => (
        <Panel key={routine.id} style={[styles.routinePanel, routine.done && { opacity: 0.68 }]}>
          <View style={styles.timeline}>
            <View style={[styles.timelineDot, { backgroundColor: routine.done ? colors.positive : colors.primary }]} />
            {index < visibleRoutines.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: colors.border }]} /> : null}
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: routine.done }}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              updateRoutine(routine.id, { done: !routine.done });
            }}
            style={[styles.checkbox, { borderColor: routine.done ? colors.positive : colors.border, backgroundColor: routine.done ? colors.positive : 'transparent' }]}>
            <Text style={styles.checkMark}>{routine.done ? '✓' : ''}</Text>
          </Pressable>
          <View style={styles.routineCopy}>
              <Text style={[styles.routineTime, { color: colors.primary }]}>
                {historyScope === 'all' ? `${routine.date} · ` : ''}
                {routine.time}
                {routine.date === dateKey() && isRoutineCurrent(routine.time, clock) ? ' · SEKARANG' : ''}
              </Text>
            <Text style={[styles.routineTitle, { color: routine.done ? colors.muted : colors.text, textDecorationLine: routine.done ? 'line-through' : 'none' }]}>
              {routine.title}
            </Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable accessibilityRole="button" onPress={() => { setFocusTitle(routine.title); setFocusSeconds(25 * 60); setFocusRunning(false); }}>
              <Text style={[styles.actionText, { color: colors.positive }]}>Fokus</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => openForm(routine)}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setDeleteId(routine.id)}>
              <Text style={[styles.actionText, { color: colors.negative }]}>Hapus</Text>
            </Pressable>
          </View>
        </Panel>
      )) : (
        <EmptyState
          title="Tidak ada agenda"
          description={historyScope === 'all' ? 'Tambahkan aktivitas untuk melihat riwayat di sini.' : 'Coba ubah filter atau tambahkan aktivitas untuk tanggal ini.'}
        />
      )}

      <ModalSheet visible={formOpen} title={editingId ? 'Edit aktivitas' : 'Aktivitas baru'} onClose={() => setFormOpen(false)}>
        <Field label="Jam / rentang waktu" value={time} onChangeText={setTime} placeholder="08:00 - 10:00" error={formErrors.time} />
        <Field label="Nama aktivitas" value={title} onChangeText={setTitle} placeholder="Belajar" error={formErrors.title} />
        <Field label="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={selectedDate} error={formErrors.date} />
        <Button title={editingId ? 'Simpan perubahan' : 'Tambah ke jadwal'} onPress={saveRoutine} />
      </ModalSheet>

      <ModalSheet visible={Boolean(focusTitle)} title="Fokus 25 menit" onClose={() => { setFocusTitle(''); setFocusRunning(false); }}>
        <Text style={[styles.focusActivity, { color: colors.muted }]}>{focusTitle}</Text>
        <Text style={[styles.focusClock, { color: colors.primary }]}>{String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:{String(focusSeconds % 60).padStart(2, '0')}</Text>
        {focusSeconds === 0 ? <Text style={[styles.focusDone, { color: colors.positive }]}>Sesi fokus selesai. Ambil jeda sejenak.</Text> : null}
        <Button title={focusRunning ? 'Jeda timer' : focusSeconds === 0 ? 'Mulai lagi' : 'Mulai fokus'} onPress={() => {
          if (focusSeconds === 0) setFocusSeconds(25 * 60);
          setFocusRunning((running) => !running);
        }} />
      </ModalSheet>

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Hapus aktivitas?"
        message="Aktivitas ini akan dihapus dari jadwal harianmu."
        confirmLabel="Hapus"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteRoutine(deleteId);
          setDeleteId(null);
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  datePanel: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dateArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  dateArrowText: { fontSize: 31, lineHeight: 34, fontWeight: '500' },
  dateCopy: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  dateHint: { fontSize: 10, marginTop: 3 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  summaryCaption: { fontSize: 11, marginTop: 4 },
  percent: { fontSize: 21, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 15 },
  progressFill: { height: '100%', borderRadius: 4 },
  routinePanel: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 78 },
  timeline: { width: 10, alignSelf: 'stretch', alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  timelineLine: { width: 1, flex: 1, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFFFFF', fontSize: 14, lineHeight: 17, fontWeight: '900' },
  routineCopy: { flex: 1, minWidth: 0 },
  routineTime: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  routineTitle: { fontSize: 14, fontWeight: '600' },
  rowActions: { alignItems: 'flex-end', gap: 10 },
  actionText: { fontSize: 10, fontWeight: '800' },
  focusActivity: { textAlign: 'center', fontSize: 13, marginBottom: 8 },
  focusClock: { textAlign: 'center', fontSize: 46, fontWeight: '800', marginBottom: 14 },
  focusDone: { textAlign: 'center', fontSize: 12, marginBottom: 14 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 13 },
});

function isRoutineCurrent(time: string, now: Date) {
  const parseMinutes = (value: string) => {
    const [hours, minutes] = value.trim().split(':').map(Number);
    return hours * 60 + minutes;
  };
  const [startLabel, endLabel] = time.split('-');
  const start = parseMinutes(startLabel);
  const end = endLabel ? parseMinutes(endLabel) : start + 60;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= start && current < end;
}
