import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ConfirmDialog, Page, Panel, useColors } from '@/components/app-ui';
import { dateKey, getStreak, useApp } from '@/context/app-context';

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const destinations = [
  { title: 'Log Harian', detail: 'Jadwal dan checklist', route: '/(main)/daily' as Href, symbol: '✓' },
  { title: 'Log Gaming', detail: 'Waktu bermain', route: '/(main)/gaming' as Href, symbol: '◉' },
  { title: 'Log Gold', detail: 'Pemasukan dan pengeluaran', route: '/(main)/gold' as Href, symbol: 'Rp' },
  { title: 'Profil & Pengaturan', detail: 'Akun dan preferensi', route: '/(main)/profile' as Href, symbol: '◎' },
];

export default function DashboardScreen() {
  const { data, logout } = useApp();
  const colors = useColors();
  const [showLogout, setShowLogout] = useState(false);
  const today = dateKey();
  const todayRoutines = data.routines.filter((routine) => routine.date === today);
  const completed = todayRoutines.filter((routine) => routine.done).length;
  const dailyProgress = todayRoutines.length ? completed / todayRoutines.length : 0;
  const todayGames = data.games.filter((game) => game.date === today);
  const gamingMinutes = todayGames.reduce((total, game) => total + game.minutes, 0);
  const income = data.transactions.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = data.transactions.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const xp = completed * 20 + data.completedDays.length * 50 + data.games.length * 10;
  const level = Math.floor(xp / 500) + 1;
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const timeLabel = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(now);

  const open = (route: Href) => router.push(route);

  return (
    <Page
      title={`Halo, ${data.profile?.username ?? 'Player'}`}
      subtitle={`${dateLabel} · luangkan waktu untuk hal yang berarti`}>
      <Panel style={[styles.profilePanel, { backgroundColor: colors.hero, borderColor: colors.hero }]}>
        <View pointerEvents="none" style={styles.heroOrbit} />
        <View pointerEvents="none" style={styles.heroOrbitSmall} />
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: '#FFFFFF24' }]}>
            <Text style={[styles.avatarText, { color: colors.heroText }]}>{data.profile?.username.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileEyebrow, { color: '#FFFFFFB8' }]}>HARI INI MILIKMU</Text>
            <Text style={[styles.profileName, { color: colors.heroText }]}>{data.profile?.username}</Text>
            <Text style={[styles.profileRole, { color: '#FFFFFFC7' }]}>{data.profile?.role} · Level {level}</Text>
          </View>
          <View style={[styles.streak, { backgroundColor: '#FFFFFF20' }]}>
            <Text style={styles.streakIcon}>✦</Text>
            <Text style={[styles.streakValue, { color: colors.heroText }]}>{getStreak(data.completedDays)} hari</Text>
            <Text style={[styles.streakLabel, { color: '#FFFFFFB8' }]}>STREAK</Text>
          </View>
        </View>
        <View style={styles.progressMeta}>
          <View style={styles.progressHeading}>
            <View>
              <Text style={[styles.progressLabel, { color: '#FFFFFFD6' }]}>Ritme harimu</Text>
              <Text style={[styles.progressHint, { color: '#FFFFFFA8' }]}>Satu langkah kecil tetap berarti.</Text>
            </View>
            <Text style={[styles.progressValue, { color: colors.highlight }]}>{Math.round(dailyProgress * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: '#FFFFFF30' }]}>
            <View style={[styles.progressFill, { width: `${Math.round(dailyProgress * 100)}%`, backgroundColor: colors.highlight }]} />
          </View>
          <View style={styles.heroFooter}>
            <Text style={[styles.xpLabel, { color: '#FFFFFFB8' }]}>{xp} XP · {500 - (xp % 500)} XP menuju level berikutnya</Text>
            <Text style={[styles.clockLabel, { color: colors.heroText }]}>◷ {timeLabel}</Text>
          </View>
        </View>
      </Panel>

      <View style={styles.summaryRow}>
        <SummaryCard symbol="✓" label="Rutinitas" value={`${completed}/${todayRoutines.length}`} detail="selesai hari ini" accent={colors.positive} />
        <SummaryCard symbol="◷" label="Gaming" value={`${Math.floor(gamingMinutes / 60)}j ${gamingMinutes % 60}m`} detail="hari ini" accent={colors.primary} />
        <SummaryCard symbol="↗" label="Saldo" value={money.format(balance)} detail="bersih" accent={balance >= 0 ? colors.positive : colors.negative} />
      </View>

      <View style={styles.sectionHeading}>
        <View style={[styles.sectionMark, { backgroundColor: colors.highlight }]} />
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ruang aktivitas</Text>
          <Text style={[styles.sectionCaption, { color: colors.muted }]}>Pilih cara merawat waktumu</Text>
        </View>
      </View>
      <View style={styles.menuGrid}>
        {destinations.map((item) => (
          <Pressable key={item.title} onPress={() => open(item.route)} style={({ pressed }) => [styles.menuCell, pressed && styles.pressed]}>
            <Panel style={styles.menuPanel}>
              <View style={[styles.menuSymbol, { backgroundColor: colors.surfaceSoft }]}>
                <Text style={[styles.menuSymbolText, { color: colors.primary }]}>{item.symbol}</Text>
              </View>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuDetail, { color: colors.muted }]}>{item.detail}</Text>
              <Text style={[styles.menuArrow, { color: colors.primary }]}>→</Text>
            </Panel>
          </Pressable>
        ))}
      </View>

      <Panel>
        <View style={styles.rowBetween}>
          <View style={styles.summaryHeading}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.menuSymbolText, { color: colors.primary }]}>☼</Text>
            </View>
            <View style={styles.summaryHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Ringkasan hari ini</Text>
            <Text style={[styles.menuDetail, { color: colors.muted }]}>{todayRoutines.length - completed} agenda tersisa · {todayGames.length} sesi game</Text>
            </View>
          </View>
          <Text style={[styles.summaryArrow, { color: colors.highlight }]}>✦</Text>
        </View>
        <View style={[styles.balanceLine, { borderTopColor: colors.border }]}>
          <Text style={[styles.menuDetail, { color: colors.muted }]}>Pemasukan · Pengeluaran</Text>
          <Text style={[styles.amountLine, { color: colors.text }]}>{money.format(income)} · {money.format(expenses)}</Text>
        </View>
      </Panel>

      <Button title="Keluar sesi" variant="quiet" onPress={() => setShowLogout(true)} />
      <ConfirmDialog
        visible={showLogout}
        title="Keluar dari sesi?"
        message="Data tetap tersimpan di perangkat ini dan dapat dibuka kembali dengan akun lokalmu."
        confirmLabel="Keluar"
        onCancel={() => setShowLogout(false)}
        onConfirm={() => {
          setShowLogout(false);
          logout();
          router.replace('/login');
        }}
      />
    </Page>
  );
}

function SummaryCard({ symbol, label, value, detail, accent }: { symbol: string; label: string; value: string; detail: string; accent: string }) {
  const colors = useColors();
  return (
    <Panel style={styles.summaryCard}>
      <View style={styles.summaryCardHeading}>
        <View style={[styles.summaryDot, { backgroundColor: accent }]} />
        <Text numberOfLines={1} style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.summaryCardSymbol, { color: accent }]}>{symbol}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.summaryDetail, { color: colors.muted }]}>{detail}</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  profilePanel: { position: 'relative', overflow: 'hidden', marginBottom: 14, padding: 18, borderRadius: 24 },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '800' },
  profileCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  profileEyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 1.3, marginBottom: 3 },
  profileName: { fontSize: 17, fontWeight: '800' },
  profileRole: { fontSize: 11, marginTop: 3 },
  streak: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 66 },
  streakIcon: { color: '#E4B35D', fontSize: 12, marginBottom: 2 },
  streakValue: { fontSize: 11, fontWeight: '800' },
  streakLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  progressMeta: { width: '100%', marginTop: 22 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '800' },
  progressHint: { fontSize: 10, marginTop: 3 },
  progressValue: { fontSize: 18, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, marginTop: 11, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  xpLabel: { fontSize: 9 },
  clockLabel: { fontSize: 10, fontWeight: '800' },
  heroOrbit: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: '#FFFFFF12', top: -100, right: -45 },
  heroOrbitSmall: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 1, borderColor: '#FFFFFF12', top: -70, right: -14 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 21 },
  summaryCard: { flex: 1, padding: 11, borderRadius: 17, marginBottom: 0, minWidth: 0 },
  summaryCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryLabel: { flex: 1, fontSize: 9, fontWeight: '700' },
  summaryCardSymbol: { fontSize: 10, fontWeight: '800' },
  summaryValue: { fontSize: 17, fontWeight: '800', marginTop: 9 },
  summaryDetail: { fontSize: 9, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  sectionMark: { width: 4, height: 30, borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionCaption: { fontSize: 10, marginTop: 3 },
  menuGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  menuCell: { flexBasis: '48%', flexGrow: 1, flexShrink: 1, minWidth: 0 },
  menuPanel: { position: 'relative', minHeight: 132, marginBottom: 0, borderRadius: 20 },
  menuSymbol: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  menuSymbolText: { fontSize: 17, fontWeight: '800' },
  menuTitle: { fontSize: 13, fontWeight: '800' },
  menuDetail: { fontSize: 10, marginTop: 4 },
  menuArrow: { position: 'absolute', right: 15, bottom: 14, fontSize: 14, fontWeight: '800' },
  summaryHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryHeadingCopy: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryArrow: { fontSize: 18, fontWeight: '800' },
  balanceLine: { borderTopWidth: 1, paddingTop: 11, marginTop: 13, gap: 5 },
  amountLine: { fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.74 },
});
