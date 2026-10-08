import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/components/app-ui';

const options = [
  { label: 'Log harian', symbol: '✓', route: '/(main)/daily' },
  { label: 'Sesi gaming', symbol: '◉', route: '/(main)/gaming' },
  { label: 'Transaksi gold', symbol: 'Rp', route: '/(main)/gold' },
] as const;

export function QuickAddFab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: 77 + insets.bottom, right: Math.max(20, insets.right + 16) }]}>
      {open ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.route}
              onPress={() => {
                setOpen(false);
                router.push({
                  pathname: option.route,
                  params: { quickAdd: Date.now().toString() },
                } as Href);
              }}
              style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.optionSymbol, { color: colors.primary }]}>{option.symbol}</Text>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Tutup menu tambah' : 'Tambah catatan'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
        <Text style={styles.fabSymbol}>{open ? '×' : '+'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', alignItems: 'flex-end' },
  menu: { alignItems: 'flex-end', gap: 9, marginBottom: 12 },
  option: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  optionSymbol: { minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  optionLabel: { fontSize: 12, fontWeight: '700' },
  fab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabSymbol: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '400' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});