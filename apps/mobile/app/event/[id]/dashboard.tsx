import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useEvent, useEventMembers } from '@/hooks/useEvent';
import { useItems } from '@/hooks/useItems';

const HERO_COLORS: Record<string, string> = {
  coral: '#FF6B4A',
  violet: '#7B61FF',
  mint: '#06D6A0',
  golden: '#FFD166',
  charcoal: '#2E2E50',
};

export default function DashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data: event } = useEvent(id);
  const { data: items } = useItems(id);
  const { data: members } = useEventMembers(id);

  const accentColor = HERO_COLORS[event?.hero_color ?? 'coral'] ?? HERO_COLORS.coral;

  // ── By-person breakdown ────────────────────────────────────────────────────
  // Map each member to the items they've claimed
  const byPerson: Array<{
    userId: string;
    name: string;
    claimed: Array<{ itemName: string; category: string; quantity: number | null; unit: string | null }>;
  }> = (members ?? []).map((m) => {
    const claimed = (items ?? [])
      .filter((item) => item.assignment?.user_id === m.user_id)
      .map((item) => ({
        itemName: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
      }));
    return {
      userId: m.user_id,
      name: m.user?.name ?? 'Unknown',
      claimed,
    };
  });

  // ── Unclaimed items ────────────────────────────────────────────────────────
  const unclaimed = (items ?? []).filter((item) => !item.assignment);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalItems = items?.length ?? 0;
  const claimedCount = (items ?? []).filter((i) => i.assignment != null).length;
  const coveragePct = totalItems > 0 ? Math.round((claimedCount / totalItems) * 100) : 0;

  return (
    <View className="flex-1 bg-warmwhite" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="px-5 pb-5"
        style={{ backgroundColor: accentColor, paddingTop: 16 }}
      >
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text
            className="text-white text-xl flex-1"
            style={{ fontFamily: 'PlusJakartaSans-Bold' }}
            numberOfLines={1}
          >
            {event?.title ?? 'Dashboard'}
          </Text>
        </View>

        {/* Summary row */}
        <View className="flex-row gap-3">
          <StatPill label="Total items" value={String(totalItems)} />
          <StatPill label="Claimed" value={String(claimedCount)} />
          <StatPill label="Coverage" value={`${coveragePct}%`} />
          <StatPill label="Members" value={String(members?.length ?? 0)} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── By person ─────────────────────────────────────────────────── */}
        <Text
          className="text-charcoal text-base mb-4"
          style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
        >
          By person
        </Text>

        {byPerson.length === 0 ? (
          <Text className="text-charcoal/40 text-sm mb-8" style={{ fontFamily: 'Inter-Regular' }}>
            No members yet.
          </Text>
        ) : (
          <View className="gap-3 mb-8">
            {byPerson.map((person) => (
              <View key={person.userId} className="bg-white rounded-2xl p-4 shadow-sm shadow-charcoal/5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: accentColor + '22' }}
                    >
                      <Text
                        style={{ fontFamily: 'PlusJakartaSans-Bold', color: accentColor, fontSize: 13 }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      className="text-charcoal text-sm"
                      style={{ fontFamily: 'Inter-SemiBold' }}
                    >
                      {person.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text
                      className="text-charcoal/50 text-xs"
                      style={{ fontFamily: 'Inter-Regular' }}
                    >
                      {person.claimed.length} item{person.claimed.length !== 1 ? 's' : ''}
                    </Text>
                    {person.claimed.length > 0 && (
                      <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                    )}
                  </View>
                </View>

                {person.claimed.length === 0 ? (
                  <Text
                    className="text-charcoal/35 text-xs italic"
                    style={{ fontFamily: 'Inter-Regular' }}
                  >
                    Nothing claimed yet
                  </Text>
                ) : (
                  <View className="gap-1.5">
                    {person.claimed.map((c, i) => (
                      <View key={i} className="flex-row items-center gap-2">
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        <Text
                          className="text-charcoal/70 text-xs flex-1"
                          style={{ fontFamily: 'Inter-Regular' }}
                        >
                          {c.itemName}
                          {c.quantity ? ` · ${c.quantity}${c.unit ? ' ' + c.unit : ''}` : ''}
                        </Text>
                        <Text
                          className="text-charcoal/30 text-xs"
                          style={{ fontFamily: 'Inter-Regular' }}
                        >
                          {c.category}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Unclaimed items ────────────────────────────────────────────── */}
        {unclaimed.length > 0 && (
          <>
            <View className="flex-row items-center gap-2 mb-4">
              <Text
                className="text-charcoal text-base"
                style={{ fontFamily: 'PlusJakartaSans-SemiBold' }}
              >
                Unclaimed
              </Text>
              <View className="bg-red-100 rounded-full px-2 py-0.5">
                <Text
                  className="text-red-500 text-xs"
                  style={{ fontFamily: 'Inter-SemiBold' }}
                >
                  {unclaimed.length}
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-charcoal/5">
              {unclaimed.map((item, i) => (
                <View
                  key={item.id}
                  className={`flex-row items-center px-4 py-3 ${
                    i < unclaimed.length - 1 ? 'border-b border-charcoal/5' : ''
                  }`}
                >
                  <View className="w-1.5 h-1.5 rounded-full bg-red-400 mr-3" />
                  <Text
                    className="text-charcoal/70 text-sm flex-1"
                    style={{ fontFamily: 'Inter-Regular' }}
                  >
                    {item.name}
                    {item.quantity ? ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})` : ''}
                  </Text>
                  <Text
                    className="text-charcoal/30 text-xs"
                    style={{ fontFamily: 'Inter-Regular' }}
                  >
                    {item.category}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {totalItems === 0 && (
          <View className="items-center py-16">
            <Ionicons name="clipboard-outline" size={48} color="#C8C8D8" />
            <Text
              className="text-charcoal/40 text-base mt-4"
              style={{ fontFamily: 'Inter-Regular' }}
            >
              No items yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-white/20 rounded-2xl px-3 py-2.5 items-center">
      <Text
        className="text-white text-lg"
        style={{ fontFamily: 'PlusJakartaSans-Bold' }}
      >
        {value}
      </Text>
      <Text
        className="text-white/70 text-xs"
        style={{ fontFamily: 'Inter-Regular' }}
      >
        {label}
      </Text>
    </View>
  );
}
