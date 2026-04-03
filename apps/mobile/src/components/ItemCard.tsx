import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Item } from '@hangout/shared';
import { useSpringPress } from '@/hooks/useSpringPress';
import { useT } from '@/i18n';

interface ItemCardProps {
  item: Item;
  currentUserId?: string;
  onClaim?: () => void;
  onUnclaim?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  preview?: boolean;
  adminMode?: boolean;
  canManage?: boolean;
  isLoading?: boolean;
}

export const ItemCard = React.memo(function ItemCard({
  item,
  currentUserId,
  onClaim,
  onUnclaim,
  onDelete,
  onPress,
  preview = false,
  adminMode = false,
  canManage = false,
  isLoading = false,
}: ItemCardProps) {
  const isClaimed = item.assignment != null;
  const isClaimedByMe = item.assignment?.user_id === currentUserId;
  const claimer = item.assignment?.user;
  const { t } = useT();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <View style={[styles.card, isClaimed && styles.cardClaimed]}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={isClaimedByMe ? onUnclaim : isClaimed ? undefined : onClaim}
          disabled={isLoading || preview || (!isClaimedByMe && isClaimed && !canManage)}
          activeOpacity={0.7}
          style={styles.checkTouchable}
        >
          <View style={[styles.checkbox, isClaimed && styles.checkboxChecked]}>
            {isClaimed && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.name, isClaimed && styles.nameClaimed]}
            numberOfLines={1}
          >
            {item.name}
            {item.quantity != null && (
              <Text style={styles.quantity}>
                {' '}× {item.quantity}{item.unit ? ` ${item.unit}` : ''}
              </Text>
            )}
          </Text>

          {item.notes && (
            <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
          )}

          {isClaimed && claimer && (
            <View style={styles.claimerRow}>
              {claimer.avatar_url ? (
                <Image source={{ uri: claimer.avatar_url }} style={styles.claimerAvatar} />
              ) : (
                <View style={styles.claimerAvatarFallback}>
                  <Text style={styles.claimerInitial}>{claimer.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.claimerName}>
                {isClaimedByMe ? t('items_you') : claimer.name}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {!preview && !adminMode && (
          <>
            {!isClaimed && (
              <ClaimButton onPress={onClaim} isLoading={isLoading} label={t('items_claim')} />
            )}
            {!isClaimedByMe && isClaimed && canManage && (
              <UnclaimButton onPress={onUnclaim} isLoading={isLoading} label={t('remove')} />
            )}
            {isClaimedByMe && (
              <UnclaimButton onPress={onUnclaim} isLoading={isLoading} label={t('items_unclaim')} />
            )}
          </>
        )}

        {adminMode && (
          <SpringIconButton onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </SpringIconButton>
        )}
      </View>
    </TouchableOpacity>
  );
});

function ClaimButton({ onPress, isLoading, label }: { onPress?: () => void; isLoading?: boolean; label: string }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.9 });
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isLoading}
        activeOpacity={1}
        style={[styles.claimBtn, isLoading && { opacity: 0.6 }]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.claimBtnText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function UnclaimButton({ onPress, isLoading, label }: { onPress?: () => void; isLoading?: boolean; label: string }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.9 });
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isLoading}
        activeOpacity={1}
        style={[styles.unclaimBtn, isLoading && { opacity: 0.6 }]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#9999B8" />
        ) : (
          <Text style={styles.unclaimBtnText}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SpringIconButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressScale: 0.88 });
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        disabled={disabled}
        activeOpacity={1}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.06)',
  },
  cardClaimed: {
    borderColor: 'rgba(6,214,160,0.2)',
    backgroundColor: 'rgba(6,214,160,0.03)',
  },
  checkTouchable: {
    flexShrink: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(26,26,46,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#06D6A0',
    borderColor: '#06D6A0',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1A1A2E',
    lineHeight: 20,
  },
  nameClaimed: {
    color: 'rgba(26,26,46,0.35)',
    textDecorationLine: 'line-through',
  },
  quantity: {
    fontFamily: 'Inter-Regular',
    color: 'rgba(26,26,46,0.4)',
    fontSize: 14,
  },
  notes: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(26,26,46,0.4)',
  },
  claimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  claimerAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  claimerAvatarFallback: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(6,214,160,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimerInitial: {
    fontSize: 7,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#06D6A0',
  },
  claimerName: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#06D6A0',
  },
  claimBtn: {
    backgroundColor: '#FF6B4A',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  unclaimBtn: {
    backgroundColor: 'rgba(26,26,46,0.06)',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unclaimBtnText: {
    color: 'rgba(26,26,46,0.45)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
