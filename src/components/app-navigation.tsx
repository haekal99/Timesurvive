import type { Href } from 'expo-router';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/components/app-ui';

const items = [
  { label: 'Home', route: '/(main)/dashboard', symbol: '⌂' },
  { label: 'Harian', route: '/(main)/daily', symbol: '✓' },
  { label: 'Gaming', route: '/(main)/gaming', symbol: '◉' },
  { label: 'Gold', route: '/(main)/gold', symbol: 'Rp' },
  { label: 'Profil', route: '/(main)/profile', symbol: '◎' },
] as const;

export function AppNavigation() {
  const colors = useColors();
  const pathname = usePathname();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.map((item) => {
        const active = pathname.endsWith(item.route.split('/').pop() ?? '');
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item.route}
            onPress={() => router.replace(item.route as Href)}
            style={styles.item}>
            <Text style={[styles.symbol, { color: active ? colors.primary : colors.muted }]}>{item.symbol}</Text>
            <Text style={[styles.label, { color: active ? colors.primary : colors.muted }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 62, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 5 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 0 },
  symbol: { fontSize: 17, fontWeight: '800', lineHeight: 20 },
  label: { fontSize: 9, fontWeight: '700' },
});
