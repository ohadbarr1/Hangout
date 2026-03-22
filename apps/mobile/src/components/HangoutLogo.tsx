import { View, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface HangoutLogoProps {
  size?: number;
  showWordmark?: boolean;
  light?: boolean;
}

export function HangoutLogo({ size = 40, showWordmark = false, light = false }: HangoutLogoProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {/* Icon mark */}
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FF6B4A" />
            <Stop offset="100%" stopColor="#FFD166" />
          </LinearGradient>
        </Defs>
        {/* Rounded square background */}
        <Path
          d="M8 0h24a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z"
          fill="url(#logoGrad)"
        />
        {/* Confetti / celebration dots */}
        <Circle cx="14" cy="14" r="3" fill="rgba(255,255,255,0.9)" />
        <Circle cx="26" cy="12" r="2" fill="rgba(255,255,255,0.7)" />
        <Circle cx="20" cy="22" r="4" fill="rgba(255,255,255,0.95)" />
        <Circle cx="12" cy="26" r="2" fill="rgba(255,255,255,0.6)" />
        <Circle cx="28" cy="27" r="2.5" fill="rgba(255,255,255,0.8)" />
      </Svg>

      {showWordmark && (
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-Bold',
            fontSize: size * 0.55,
            color: light ? '#FFFFFF' : '#1A1A2E',
            letterSpacing: -0.5,
          }}
        >
          Hangout
        </Text>
      )}
    </View>
  );
}
