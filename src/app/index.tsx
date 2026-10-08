import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppTheme } from '@/constants/app-theme';
import { useApp } from '@/context/app-context';

export default function IndexRoute() {
  const { data, ready } = useApp();
  const colors = AppTheme[data.theme];

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={data.profile ? '/(main)/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});