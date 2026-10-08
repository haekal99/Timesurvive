import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/app-theme';
import { AppProvider, useApp } from '@/context/app-context';

function RootNavigator() {
  const { data } = useApp();
  const colors = AppTheme[data.theme];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={data.theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
