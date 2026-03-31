import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/components/Toast';
import { useMyEventsWithCounts } from '@/hooks/useEvent';
import { useFadeInUp } from '@/hooks/useFadeInUp';
import Animated from 'react-native-reanimated';
import { useT } from '@/i18n';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const { lang, setLang } = useLanguageStore();
  const { t } = useT();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const { data: events } = useMyEventsWithCounts();

  // Compute stats from events
  const allEvents = events ?? [];
  const hostedCount = allEvents.filter((e) => e.admin_id === user?.id).length;
  const joinedCount = allEvents.filter((e) => e.admin_id !== user?.id).length;
  const completedCount = allEvents.filter((e) => e.status === 'completed').length;

  const handleSignOut = () => {
    showAlert(t('profile_sign_out'), t('profile_sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('profile_sign_out'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    setNewName(user?.name ?? '');
    setEditModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert(t('error'), t('profile_name_required'));
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (error) throw error;
      if (user) setUser({ ...user, name: trimmed });
      setEditModalVisible(false);
    } catch (err) {
      showAlert(t('error'), err instanceof Error ? err.message : 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSetLang = (newLang: 'en' | 'he') => {
    if (newLang === lang) return;
    showAlert(t('profile_language'), t('profile_language_restart'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        onPress: () => setLang(newLang),
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile_title')}</Text>
        </View>

        {/* Avatar + name card */}
        <Animated.View style={useFadeInUp({ delay: 0 }).animatedStyle}>
          <View style={styles.avatarCard}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}

            <Text style={styles.userName}>{user?.name ?? 'Anonymous'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>

            <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
              <Text style={styles.editBtnLabel}>{t('profile_edit')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={useFadeInUp({ delay: 80 }).animatedStyle}>
          <View style={styles.statsRow}>
            <StatBox value={hostedCount} label={t('profile_hosted')} icon="star-outline" />
            <StatBox value={joinedCount} label={t('profile_joined')} icon="people-outline" />
            <StatBox value={completedCount} label={t('profile_done')} icon="checkmark-circle-outline" />
          </View>
        </Animated.View>

        {/* Language toggle */}
        <Animated.View style={useFadeInUp({ delay: 140 }).animatedStyle}>
          <View style={styles.menuCard}>
            <View style={styles.langRow}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="globe-outline" size={18} color="#1A1A2E" />
              </View>
              <Text style={styles.langLabel}>{t('profile_language')}</Text>
              <View style={styles.langPills}>
                <TouchableOpacity
                  style={[styles.langPill, lang === 'en' && styles.langPillActive]}
                  onPress={() => handleSetLang('en')}
                >
                  <Text style={[styles.langPillText, lang === 'en' && styles.langPillTextActive]}>
                    {t('lang_en')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langPill, lang === 'he' && styles.langPillActive]}
                  onPress={() => handleSetLang('he')}
                >
                  <Text style={[styles.langPillText, lang === 'he' && styles.langPillTextActive]}>
                    {t('lang_he')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Menu */}
        <Animated.View style={useFadeInUp({ delay: 200 }).animatedStyle}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              label={t('profile_sign_out')}
              onPress={handleSignOut}
              destructive
              isLast
            />
          </View>
        </Animated.View>

        <Text style={styles.version}>Hangout v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile_edit')}</Text>

            <Text style={styles.modalLabel}>{t('profile_display_name')}</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={t('profile_name_placeholder')}
              placeholderTextColor="#9999B8"
              autoCapitalize="words"
              style={styles.modalInput}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCancelBtn}
                disabled={savingName}
              >
                <Text style={styles.modalCancelLabel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                disabled={savingName}
                style={[styles.modalSaveBtn, savingName && { opacity: 0.6 }]}
              >
                {savingName ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveLabel}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ value, label, icon }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color="#FF6B4A" style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, destructive, isLast }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={destructive ? '#EF4444' : '#1A1A2E'} />
      </View>
      <Text style={[styles.menuLabel, destructive && { color: '#EF4444' }]}>{label}</Text>
      {!destructive && <Ionicons name="chevron-forward" size={16} color="#9999B8" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F3' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontFamily: 'PlusJakartaSans-Bold', color: '#1A1A2E' },

  avatarCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,107,74,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarInitial: { fontSize: 32, fontFamily: 'PlusJakartaSans-Bold', color: '#FF6B4A' },
  userName: { fontSize: 20, fontFamily: 'PlusJakartaSans-SemiBold', color: '#1A1A2E', marginBottom: 4 },
  userEmail: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#9999B8', marginBottom: 16 },
  editBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,74,0.3)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editBtnLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#FF6B4A' },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: '#1A1A2E', marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: 'Inter-Regular', color: '#9999B8' },

  menuCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(26,26,46,0.05)' },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(26,26,46,0.05)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular', color: '#1A1A2E' },

  version: { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(26,26,46,0.3)', textAlign: 'center', marginTop: 32 },

  langRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  langLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular', color: '#1A1A2E', marginLeft: 14 },
  langPills: { flexDirection: 'row', gap: 8 },
  langPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(26,26,46,0.12)',
  },
  langPillActive: { backgroundColor: '#FF6B4A', borderColor: '#FF6B4A' },
  langPillText: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(26,26,46,0.6)' },
  langPillTextActive: { color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#fff', width: '100%', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#1A1A2E', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(26,26,46,0.7)', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#FFF8F3',
    borderWidth: 1, borderColor: 'rgba(26,26,46,0.1)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: 'Inter-Regular', color: '#1A1A2E', marginBottom: 24,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(26,26,46,0.1)' },
  modalCancelLabel: { fontSize: 15, fontFamily: 'Inter-Medium', color: 'rgba(26,26,46,0.7)' },
  modalSaveBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FF6B4A' },
  modalSaveLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
