import Animated from 'react-native-reanimated';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { useSpringPress } from '@/hooks/useSpringPress';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({
    pressScale: 0.95,
    haptic: !isDisabled,
  });

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        {...props}
        onPress={onPress}
        onPressIn={isDisabled ? undefined : onPressIn}
        onPressOut={isDisabled ? undefined : onPressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.base,
          styles[`variant_${variant}`],
          styles[`size_${size}`],
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'outline' || variant === 'ghost' ? '#FF6B4A' : '#fff'}
            size="small"
          />
        ) : (
          <>
            {leftIcon}
            <Text
              style={[
                styles.label,
                styles[`labelVariant_${variant}`],
                styles[`labelSize_${size}`],
                leftIcon != null && { marginLeft: 8 },
                rightIcon != null && { marginRight: 8 },
              ]}
            >
              {label}
            </Text>
            {rightIcon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },

  // ── Variants ─────────────────────────────────────────────────
  variant_primary: {
    backgroundColor: '#FF6B4A',
  },
  variant_secondary: {
    backgroundColor: '#7B61FF',
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF6B4A',
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_destructive: {
    backgroundColor: '#EF4444',
  },

  // ── Sizes ────────────────────────────────────────────────────
  size_sm: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  size_md: {
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  size_lg: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
  },

  // ── Labels ───────────────────────────────────────────────────
  label: {
    fontFamily: 'Inter-SemiBold',
  },
  labelVariant_primary: {
    color: '#FFFFFF',
  },
  labelVariant_secondary: {
    color: '#FFFFFF',
  },
  labelVariant_outline: {
    color: '#FF6B4A',
  },
  labelVariant_ghost: {
    color: '#FF6B4A',
  },
  labelVariant_destructive: {
    color: '#FFFFFF',
  },
  labelSize_sm: {
    fontSize: 13,
  },
  labelSize_md: {
    fontSize: 15,
  },
  labelSize_lg: {
    fontSize: 17,
  },
});
