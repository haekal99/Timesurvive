import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView, ThemeToggle } from '@/components/app-ui';
import { AppTheme } from '@/constants/app-theme';
import { useApp } from '@/context/app-context';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { data, persistenceError } = useApp();
  const colors = AppTheme[data.theme];
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoiding}>
          <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.brand}>
                <View style={[styles.mark, { backgroundColor: colors.primary }]}>
                  <Text style={styles.markText}>T</Text>
                </View>
                <Text style={[styles.brandText, { color: colors.text }]}>TimeSurvive</Text>
              </View>
              <ThemeToggle />
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.kicker, { color: colors.primary }]}>YOUR TIME, YOURS</Text>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
              {persistenceError ? <Text style={[styles.storageWarning, { color: colors.negative }]}>{persistenceError}</Text> : null}
              {children}
            </View>
            <Text style={[styles.footer, { color: colors.muted }]}>PRIVATE BY DESIGN · STORED ON THIS DEVICE</Text>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  keyboardAvoiding: { flex: 1, width: '100%' },
  scroll: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, paddingTop: 18, flexGrow: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  brandText: { fontSize: 16, fontWeight: '800' },
  formCard: { borderWidth: 1, borderRadius: 22, padding: 22 },
  kicker: { fontSize: 10, fontWeight: '800', marginBottom: 9 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 22 },
  footer: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 17 },
  storageWarning: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
});
