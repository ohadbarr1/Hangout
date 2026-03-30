import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  subtitle?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (params: { title: string; subtitle?: string; variant?: ToastVariant }) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; icon: keyof typeof Ionicons.glyphMap; emoji: string }
> = {
  success: { bg: '#06D6A0', icon: 'checkmark-circle', emoji: '✓' },
  error:   { bg: '#EF4444', icon: 'alert-circle',     emoji: '!' },
  info:    { bg: '#2E2E50', icon: 'information-circle', emoji: 'i' },
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;

// ---------------------------------------------------------------------------
// Single animated toast row
// ---------------------------------------------------------------------------

function ToastRow({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up + fade in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(item.id));
  }, [item.id, onDismiss, translateY, opacity]);

  const config = VARIANT_STYLES[item.variant];

  return (
    <Animated.View
      style={[
        styles.toastRow,
        { backgroundColor: config.bg, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity
        style={styles.toastInner}
        onPress={dismiss}
        activeOpacity={0.85}
      >
        <Ionicons
          name={config.icon}
          size={22}
          color="#fff"
          style={styles.toastIcon}
        />
        <View style={styles.toastTextBlock}>
          <Text style={styles.toastTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.toastSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(
    ({
      title,
      subtitle,
      variant = 'info',
    }: {
      title: string;
      subtitle?: string;
      variant?: ToastVariant;
    }) => {
      const id = `toast-${Date.now()}-${counterRef.current++}`;
      setToasts((prev) => {
        const next = [...prev, { id, title, subtitle, variant }];
        // Keep max visible
        return next.slice(-MAX_TOASTS);
      });
    },
    [],
  );

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const bottomOffset = insets.bottom + 16;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Overlay — pointer-events none on wrapper so it doesn't block taps */}
      <View
        style={[styles.overlay, { bottom: bottomOffset }]}
        pointerEvents="box-none"
      >
        {toasts.map((item) => (
          <ToastRow key={item.id} item={item} onDismiss={handleDismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Backward-compatible showAlert shim
// ---------------------------------------------------------------------------

// We need a way to call showToast from outside React. We store the latest
// reference in a module-level ref so the shim can use it.
let _showToastRef: ToastContextValue['showToast'] | null = null;

/** Internal: called by ToastProvider to register the global reference */
export function _registerShowToast(fn: ToastContextValue['showToast']) {
  _showToastRef = fn;
}

// Wrap provider so it also registers the global ref
export function ToastProviderWithRef({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RegisterRef />
      {children}
    </ToastProvider>
  );
}

function RegisterRef() {
  const { showToast } = useToast();
  useEffect(() => {
    _showToastRef = showToast;
    return () => { _showToastRef = null; };
  }, [showToast]);
  return null;
}

/**
 * showAlert — backward-compatible shim.
 *
 * Single/no-button calls → animated toast
 * Multi-button (confirm pattern) → window.confirm / Alert.alert
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: Array<{ text: string; onPress?: () => void; style?: string }>,
) {
  // Multi-button = confirmation dialog — keep native behavior
  if (buttons && buttons.length > 1) {
    if (Platform.OS === 'web') {
      const actionButton = buttons.find((b) => b.style !== 'cancel');
      const confirmed = window.confirm(`${title}\n\n${message ?? ''}`);
      if (confirmed && actionButton?.onPress) {
        actionButton.onPress();
      }
    } else {
      Alert.alert(title, message, buttons as any);
    }
    return;
  }

  // Single / no buttons → toast
  const variant = inferVariant(title);

  if (_showToastRef) {
    _showToastRef({ title, subtitle: message, variant });
    // Still run the button callback if provided
    if (buttons?.[0]?.onPress) buttons[0].onPress();
  } else {
    // Fallback if provider hasn't mounted yet
    if (Platform.OS === 'web') {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    } else {
      Alert.alert(title, message, buttons as any);
    }
  }
}

function inferVariant(title: string): ToastVariant {
  const t = title.toLowerCase();
  if (/error|fail|failed|oops/.test(t)) return 'error';
  if (/copied|sent|success|saved|done|updated|created/.test(t)) return 'success';
  return 'info';
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    // bottom set inline from safe area
    gap: 8,
    // On web use a high zIndex
    zIndex: 9999,
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed' } as any)
      : {}),
  },
  toastRow: {
    borderRadius: 16,
    overflow: 'hidden',
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toastIcon: {
    marginRight: 12,
    flexShrink: 0,
  },
  toastTextBlock: {
    flex: 1,
  },
  toastTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  toastSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});
