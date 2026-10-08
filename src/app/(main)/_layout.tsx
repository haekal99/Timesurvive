import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppNavigation } from '@/components/app-navigation';
import { QuickAddFab } from '@/components/quick-add-fab';
import { AppTheme } from '@/constants/app-theme';
import { useApp } from '@/context/app-context';

export default function MainLayout() {
  const { data, ready } = useApp();
  const colors = AppTheme[data.theme];

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data.profile) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: colors.background } }} />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface }}>
        <AppNavigation />
      </SafeAreaView>
      <QuickAddFab />
    </View>
  );
}
