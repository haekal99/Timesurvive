import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/app-theme';
import { useApp } from '@/context/app-context';

type ThemeColors = (typeof AppTheme)[keyof typeof AppTheme];

type FormScrollContextValue = {
  onInputFocus: (input: TextInput) => void;
};

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const focusedInput = useRef<TextInput | null>(null);

  const scrollFocusedInput = () => {
    const input = focusedInput.current;
    const visibleBottom = keyboardTop.current;
    if (!input || visibleBottom === null) return;

    input.measureInWindow((_x, y, _width, height) => {
      const overflow = y + height + 20 - visibleBottom;
      if (overflow > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.current + overflow, animated: true });
      }
    });
  };

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      scrollFocusedInput();
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      subscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const contextValue: FormScrollContextValue = {
    onInputFocus: (input) => {
      focusedInput.current = input;
      requestAnimationFrame(scrollFocusedInput);
    },
  };

  return (
    <FormScrollContext.Provider value={contextValue}>
      <View style={styles.formScrollContainer}>
        <ScrollView
          {...props}
          ref={scrollRef}
          contentContainerStyle={contentContainerStyle}
          keyboardDismissMode={props.keyboardDismissMode ?? 'on-drag'}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
            props.onScroll?.(event);
          }}
          scrollEventThrottle={16}>
          {children}
        </ScrollView>
      </View>
    </FormScrollContext.Provider>
  );
}

export function Page({
  title,
  subtitle,
  children,
  action,
  successMessage,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  successMessage?: string;
}) {
  const { data, persistenceError } = useApp();
  const colors = AppTheme[data.theme];
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoiding}>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.pageHeading}>
              <View style={styles.titleBlock}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
                {subtitle ? <Text style={[styles.pageSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
              </View>
              <View style={styles.pageActions}>
                {action}
                <ThemeToggle />
              </View>
            </View>
            {persistenceError ? (
              <Text style={[styles.storageWarning, { color: colors.negative }]}>{persistenceError}</Text>
            ) : null}
            {children}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
        {successMessage ? (
          <View pointerEvents="none" style={styles.successToastPosition}>
            <SuccessNotice message={successMessage} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.emptyMark, { color: colors.primary }]}>○</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text> : null}
    </View>
  );
}

export function SuccessNotice({ message }: { message: string }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.successNotice,
        { backgroundColor: colors.positive + '14', borderColor: colors.positive + '55' },
      ]}>
      <Text style={[styles.successNoticeText, { color: colors.positive }]}>{message}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.loadingState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.loadingLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  compact?: boolean;
  loading?: boolean;
}) {
  const colors = useColors();
  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.negative : 'transparent';
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
        ? colors.primary
        : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: variant === 'secondary' ? colors.surfaceSoft : backgroundColor,
          borderColor: variant === 'quiet' ? 'transparent' : colors.border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.76 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  error?: string;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const formScroll = useContext(FormScrollContext);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        editable={true}
        ref={inputRef}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={() => {
          if (inputRef.current) formScroll?.onInputFocus(inputRef.current);
        }}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: colors.field,
            color: colors.text,
            borderColor: colors.border,
            minHeight: multiline ? 96 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        value={value}
      />
      {error ? <Text style={[styles.fieldError, { color: colors.negative }]}>{error}</Text> : null}
    </View>
  );
}

export function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.choiceWrap}>
      {label ? <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text> : null}
      <View style={[styles.choiceGroup, { backgroundColor: colors.surfaceSoft }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.choice,
                selected && { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text style={[styles.choiceText, { color: selected ? colors.primary : colors.muted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ThemeToggle() {
  const { data, toggleTheme } = useApp();
  const colors = AppTheme[data.theme];
  const isDark = data.theme === 'dark';
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      accessibilityState={{ checked: isDark }}
      onPress={toggleTheme}
      style={[styles.themeToggle, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <Text style={[styles.themeIcon, { color: isDark ? colors.primary : '#D97706' }]}>{isDark ? '☾' : '☀'}</Text>
      <View style={[styles.switchTrack, { backgroundColor: isDark ? colors.primary : colors.border }]}>
        <View style={[styles.switchThumb, { alignSelf: isDark ? 'flex-end' : 'flex-start', backgroundColor: '#FFFFFF' }]} />
      </View>
    </Pressable>
  );
}

export function ModalSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Tutup dialog"
          onPress={onClose}
          style={styles.backdrop}
          testID="modal-sheet-backdrop"
        />
        <SafeAreaView
          accessibilityViewIsModal
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          testID="modal-sheet-content">
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeading}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose}>
              <Text style={[styles.closeMark, { color: colors.muted }]}>×</Text>
            </Pressable>
          </View>
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroll}>
            {children}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  onCancel,
  onConfirm,
  danger = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.dialogRoot}>
        <Pressable onPress={onCancel} style={styles.backdrop} />
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.dialogMessage, { color: colors.muted }]}>{message}</Text>
          <View style={styles.dialogActions}>
            <Button compact onPress={onCancel} title="Batal" variant="secondary" />
            <Button compact onPress={onConfirm} title={confirmLabel} variant={danger ? 'danger' : 'primary'} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Heading({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[styles.heading, { color: colors.text }]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <Text style={[{ color: colors.muted }, style]}>{children}</Text>;
}

export function useColors(): ThemeColors {
  const { data } = useApp();
  return AppTheme[data.theme];
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  keyboardAvoiding: { flex: 1, width: '100%' },
  formScrollContainer: { flex: 1 },
  content: { width: '100%', maxWidth: 700, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 112, alignSelf: 'center' },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  titleBlock: { flex: 1 },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  pageTitle: { fontSize: 25, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 5 },
  panel: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 28, marginBottom: 12 },
  emptyMark: { fontSize: 27, lineHeight: 32, fontWeight: '800', marginBottom: 7 },
  emptyTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  successNotice: { padding: 16, borderWidth: 1, borderRadius: 20, marginBottom: 12 },
  successNoticeText: { fontSize: 13, fontWeight: '700' },
  successToastPosition: { position: 'absolute', top: 8, left: 20, right: 20, zIndex: 10, elevation: 10 },
  loadingState: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  loadingLabel: { fontSize: 12 },
  button: { minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonCompact: { minHeight: 42, flex: 1 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  fieldWrap: { marginBottom: 13 },
  fieldError: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  storageWarning: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  choiceWrap: { marginBottom: 13 },
  choiceGroup: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  choice: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 7 },
  choiceText: { fontSize: 12, fontWeight: '700' },
  themeToggle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, paddingHorizontal: 11 },
  themeIcon: { width: 18, textAlign: 'center', fontSize: 17, lineHeight: 20, fontWeight: '700' },
  switchTrack: { width: 30, height: 18, borderRadius: 10, justifyContent: 'center', padding: 2 },
  switchThumb: { width: 14, height: 14, borderRadius: 7 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: {
    width: '100%',
    height: '78%',
    minHeight: 300,
    maxHeight: '88%',
    flexShrink: 0,
    zIndex: 1,
    elevation: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetScroll: { flex: 1 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sheetTitle: { fontSize: 19, fontWeight: '800' },
  closeMark: { fontSize: 28, lineHeight: 30, paddingHorizontal: 3 },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 20, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800' },
  dialogMessage: { fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  heading: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 8 },
});
