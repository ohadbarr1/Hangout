import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Item } from '@hangout/shared';

interface ItemCardProps {
  item: Item;
  currentUserId?: string;
  onClaim?: () => void;
  onUnclaim?: () => void;
  onDelete?: () => void;
  /** Preview mode — no claim/assign actions, used in create flow */
  preview?: boolean;
  /** Admin mode — shows delete button */
  adminMode?: boolean;
}

export const ItemCard = React.memo(function ItemCard({
  item,
  currentUserId,
  onClaim,
  onUnclaim,
  onDelete,
  preview = false,
  adminMode = false,
}: ItemCardProps) {
  const isClaimed = item.assignment != null;
  const isClaimedByMe = item.assignment?.user_id === currentUserId;
  const claimer = item.assignment?.user;

  return (
    <View
      className={`bg-white rounded-2xl px-4 py-3.5 flex-row items-center ${
        isClaimed ? 'opacity-80' : ''
      }`}
      style={{
        borderWidth: 1,
        borderColor: isClaimed ? 'rgba(6, 214, 160, 0.25)' : 'rgba(26,26,46,0.06)',
      }}
    >
      {/* Claimed checkmark or category indicator */}
      <View
        className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${
          isClaimed ? 'bg-mint/15' : 'bg-charcoal/5'
        }`}
      >
        {isClaimed ? (
          <Ionicons name="checkmark" size={18} color="#06D6A0" />
        ) : (
          <Ionicons name="ellipse-outline" size={16} color="#9999B8" />
        )}
      </View>

      {/* Name + meta */}
      <View className="flex-1">
        <Text
          className={`text-base ${isClaimed ? 'text-charcoal/50 line-through' : 'text-charcoal'}`}
          style={{ fontFamily: 'Inter-Medium' }}
          numberOfLines={1}
        >
          {item.name}
          {item.quantity != null && (
            <Text
              className="text-charcoal/40 text-sm"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              {' '}× {item.quantity}{item.unit ? ` ${item.unit}` : ''}
            </Text>
          )}
        </Text>

        {item.notes && (
          <Text
            className="text-charcoal/40 text-xs mt-0.5"
            style={{ fontFamily: 'Inter-Regular' }}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        )}

        {isClaimed && claimer && (
          <View className="flex-row items-center mt-1 gap-1.5">
            {claimer.avatar_url ? (
              <Image
                source={{ uri: claimer.avatar_url }}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <View className="w-4 h-4 rounded-full bg-primary/20 items-center justify-center">
                <Text
                  className="text-primary"
                  style={{ fontSize: 8, fontFamily: 'PlusJakartaSans-Bold' }}
                >
                  {claimer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              className="text-mint text-xs"
              style={{ fontFamily: 'Inter-Medium' }}
            >
              {isClaimedByMe ? 'You' : claimer.name}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {!preview && !adminMode && (
        <>
          {!isClaimed && (
            <TouchableOpacity
              onPress={onClaim}
              className="bg-primary/10 rounded-xl px-3 py-2 ml-2"
              activeOpacity={0.7}
            >
              <Text
                className="text-primary text-xs"
                style={{ fontFamily: 'Inter-SemiBold' }}
              >
                Claim
              </Text>
            </TouchableOpacity>
          )}
          {isClaimedByMe && (
            <TouchableOpacity
              onPress={onUnclaim}
              className="bg-charcoal/5 rounded-xl px-3 py-2 ml-2"
              activeOpacity={0.7}
            >
              <Text
                className="text-charcoal/50 text-xs"
                style={{ fontFamily: 'Inter-Medium' }}
              >
                Unclaim
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {adminMode && (
        <TouchableOpacity
          onPress={onDelete}
          className="w-8 h-8 rounded-full bg-red-50 items-center justify-center ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
});
