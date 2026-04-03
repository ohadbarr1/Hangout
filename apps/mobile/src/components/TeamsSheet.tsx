import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from './BottomSheet';
import { apiClient } from '@/lib/claude';
import { showAlert } from '@/components/Toast';

const TEAM_COLORS: Record<string, { hex: string; light: string }> = {
  coral:    { hex: '#FF6B4A', light: 'rgba(255,107,74,0.12)' },
  violet:   { hex: '#7B61FF', light: 'rgba(123,97,255,0.12)' },
  mint:     { hex: '#06D6A0', light: 'rgba(6,214,160,0.12)' },
  golden:   { hex: '#FFD166', light: 'rgba(255,209,102,0.15)' },
  charcoal: { hex: '#2E2E50', light: 'rgba(46,46,80,0.10)' },
};

const COLOR_OPTIONS = ['coral', 'violet', 'mint', 'golden', 'charcoal'] as const;
const EMOJI_OPTIONS = ['⚡', '🔥', '🌊', '🌿', '🎯', '🦁', '🐺', '🦅', '🚀', '💎'];

interface TeamsSheetProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  currentUserId: string;
  isAdminOrMod: boolean;
  /** Current user's team_id from event_members */
  myTeamId: string | null | undefined;
}

export function TeamsSheet({
  visible,
  onClose,
  eventId,
  currentUserId,
  isAdminOrMod,
  myTeamId,
}: TeamsSheetProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');
  const [newColor, setNewColor] = useState<string>('coral');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => apiClient.getTeams(eventId),
    staleTime: 30_000,
    enabled: visible,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teams', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event-members', eventId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createTeam(eventId, { name: newName.trim(), emoji: newEmoji, color: newColor }),
    onSuccess: () => {
      invalidate();
      setShowCreate(false);
      setNewName('');
      setNewEmoji('⚡');
      setNewColor('coral');
    },
    onError: (err) =>
      showAlert('Error', err instanceof Error ? err.message : 'Failed to create team.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => apiClient.deleteTeam(eventId, teamId),
    onSuccess: () => { invalidate(); setDeletingId(null); },
    onError: (err) => {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to delete team.');
      setDeletingId(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (teamId: string | null) =>
      apiClient.assignTeam(eventId, currentUserId, teamId),
    onSuccess: () => invalidate(),
    onError: (err) =>
      showAlert('Error', err instanceof Error ? err.message : 'Failed to update team.'),
  });

  const sortedTeams = [...(teams ?? [])].sort((a, b) => b.claimedCount - a.claimedCount);
  const maxClaimed = Math.max(...(teams ?? []).map((t) => t.claimedCount), 1);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Teams" snapHeight="78%">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <ActivityIndicator color="#FF6B4A" style={{ marginTop: 32 }} />
        ) : sortedTeams.length === 0 && !showCreate ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No teams yet</Text>
            <Text style={styles.emptyBody}>
              {isAdminOrMod
                ? 'Create teams and let members compete to claim the most items!'
                : 'The host hasn\'t set up teams yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.teamList}>
            {sortedTeams.map((team, idx) => {
              const color = TEAM_COLORS[team.color] ?? TEAM_COLORS.coral;
              const isMyTeam = team.id === myTeamId;
              const barWidth = maxClaimed > 0 ? (team.claimedCount / maxClaimed) * 100 : 0;
              const medal = idx === 0 && team.claimedCount > 0 ? '🥇' : idx === 1 && team.claimedCount > 0 ? '🥈' : idx === 2 && team.claimedCount > 0 ? '🥉' : null;

              return (
                <View
                  key={team.id}
                  style={[
                    styles.teamCard,
                    isMyTeam && { borderColor: color.hex, borderWidth: 2 },
                  ]}
                >
                  {/* Header row */}
                  <View style={styles.teamHeader}>
                    <View style={styles.teamLeft}>
                      <View style={[styles.teamEmojiBadge, { backgroundColor: color.light }]}>
                        <Text style={styles.teamEmoji}>{team.emoji}</Text>
                      </View>
                      <View>
                        <View style={styles.teamNameRow}>
                          <Text style={styles.teamName}>{team.name}</Text>
                          {medal && <Text style={styles.medal}>{medal}</Text>}
                          {isMyTeam && (
                            <View style={[styles.myTeamBadge, { backgroundColor: color.hex }]}>
                              <Text style={styles.myTeamBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.memberCount}>
                          {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.teamRight}>
                      <Text style={[styles.claimedCount, { color: color.hex }]}>
                        {team.claimedCount}
                      </Text>
                      <Text style={styles.claimedLabel}>claimed</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${barWidth}%` as any, backgroundColor: color.hex },
                      ]}
                    />
                  </View>

                  {/* Member avatars */}
                  {team.members.length > 0 && (
                    <View style={styles.memberRow}>
                      {team.members.slice(0, 6).map((m) => (
                        <View key={m.id} style={[styles.memberAvatar, { backgroundColor: color.light }]}>
                          <Text style={[styles.memberInitial, { color: color.hex }]}>
                            {m.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                      {team.members.length > 6 && (
                        <View style={[styles.memberAvatar, styles.memberAvatarExtra]}>
                          <Text style={styles.memberInitialExtra}>+{team.members.length - 6}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.teamActions}>
                    {isMyTeam ? (
                      <TouchableOpacity
                        onPress={() => assignMutation.mutate(null)}
                        disabled={assignMutation.isPending}
                        style={[styles.actionBtn, styles.leaveBtn]}
                        activeOpacity={0.75}
                      >
                        {assignMutation.isPending ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Text style={styles.leaveBtnText}>Leave team</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => assignMutation.mutate(team.id)}
                        disabled={assignMutation.isPending}
                        style={[styles.actionBtn, styles.joinBtn, { backgroundColor: color.hex }]}
                        activeOpacity={0.75}
                      >
                        {assignMutation.isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.joinBtnText}>
                            {myTeamId ? 'Switch here' : 'Join team'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {isAdminOrMod && (
                      <TouchableOpacity
                        onPress={() => {
                          setDeletingId(team.id);
                          deleteMutation.mutate(team.id);
                        }}
                        disabled={deleteMutation.isPending && deletingId === team.id}
                        style={styles.deleteBtn}
                        activeOpacity={0.7}
                      >
                        {deleteMutation.isPending && deletingId === team.id ? (
                          <ActivityIndicator size="small" color="#9999B8" />
                        ) : (
                          <Ionicons name="trash-outline" size={16} color="#9999B8" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Create team form */}
        {isAdminOrMod && showCreate && (
          <View style={styles.createForm}>
            <Text style={styles.createTitle}>New team</Text>

            {/* Name input */}
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Team name..."
              placeholderTextColor="#9999B8"
              style={styles.nameInput}
              maxLength={40}
              autoFocus
            />

            {/* Emoji picker */}
            <Text style={styles.pickerLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={[styles.emojiOption, newEmoji === e && styles.emojiOptionSelected]}
                >
                  <Text style={styles.emojiOptionText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Color picker */}
            <Text style={styles.pickerLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: TEAM_COLORS[c]!.hex },
                    newColor === c && styles.colorSwatchSelected,
                  ]}
                >
                  {newColor === c && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                style={[styles.saveBtn, (!newName.trim() || createMutation.isPending) && styles.saveBtnDisabled]}
                activeOpacity={0.8}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Create team button */}
        {isAdminOrMod && !showCreate && (teams ?? []).length < 4 && (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={styles.createTeamBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FF6B4A" />
            <Text style={styles.createTeamBtnText}>Create team</Text>
          </TouchableOpacity>
        )}

        {isAdminOrMod && (teams ?? []).length >= 4 && (
          <Text style={styles.maxReached}>Maximum 4 teams reached</Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 18,
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9999B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  teamList: { gap: 12, marginBottom: 12 },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,46,0.06)',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  teamEmojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamEmoji: { fontSize: 22 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  teamName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: '#1A1A2E',
  },
  medal: { fontSize: 16 },
  myTeamBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  myTeamBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#fff',
  },
  memberCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9999B8',
    marginTop: 1,
  },
  teamRight: { alignItems: 'flex-end' },
  claimedCount: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    lineHeight: 28,
  },
  claimedLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#9999B8',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(26,26,46,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 4,
  },
  memberRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
  },
  memberAvatarExtra: {
    backgroundColor: 'rgba(26,26,46,0.06)',
  },
  memberInitialExtra: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#9999B8',
  },
  teamActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {},
  joinBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  leaveBtn: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  leaveBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#DC2626',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(26,26,46,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createForm: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,74,0.3)',
  },
  createTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: '#1A1A2E',
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: 'rgba(26,26,46,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  pickerLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#9999B8',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  emojiRow: { marginBottom: 14 },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: 'rgba(26,26,46,0.04)',
  },
  emojiOptionSelected: {
    backgroundColor: 'rgba(255,107,74,0.12)',
    borderWidth: 1.5,
    borderColor: '#FF6B4A',
  },
  emojiOptionText: { fontSize: 20 },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: 'rgba(26,26,46,0.2)',
    transform: [{ scale: 1.15 }],
  },
  createActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,46,0.1)',
  },
  cancelBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#9999B8',
  },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B4A',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  createTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,74,0.3)',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  createTeamBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FF6B4A',
  },
  maxReached: {
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#9999B8',
    marginTop: 8,
  },
});
