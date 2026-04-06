/**
 * A zero-dependency date picker bottom sheet.
 * Three scrollable columns: Day / Month / Year.
 * Works on iOS, Android and Web.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const ITEM_H = 48;
const VISIBLE_ITEMS = 5;
const PICKER_H = ITEM_H * VISIBLE_ITEMS;
const COL_W = (SW - 40) / 3;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function parseISO(iso: string): { d: number; m: number; y: number } {
  const parts = iso.split('-');
  const y = parseInt(parts[0] ?? '', 10);
  const m = parseInt(parts[1] ?? '', 10);
  const d = parseInt(parts[2] ?? '', 10);
  if (iso && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
    return { d, m, y };
  }
  const now = new Date();
  return { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() };
}

function toISO(d: number, m: number, y: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  value: string; // ISO date string, e.g. "2026-04-15"
  onChange: (iso: string) => void;
  title?: string;
}

export function DatePickerSheet({ visible, onClose, value, onChange, title = 'Pick a date' }: DatePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const initial = parseISO(value);

  const [day, setDay]   = useState(initial.d);
  const [month, setMonth] = useState(initial.m);
  const [year, setYear]  = useState(initial.y);

  const maxDay = daysInMonth(month, year);
  const safeDay = Math.min(day, maxDay);

  // Clamp day when month/year changes
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [month, year, maxDay, day]);

  // Sync to incoming value when sheet opens
  useEffect(() => {
    if (visible) {
      const p = parseISO(value);
      setDay(p.d); setMonth(p.m); setYear(p.y);
    }
  }, [visible]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const days  = Array.from({ length: maxDay }, (_, i) => i + 1);

  const handleConfirm = () => {
    onChange(toISO(safeDay, month, year));
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        {/* Handle */}
        <View style={styles.handleBar}><View style={styles.handle} /></View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Picker */}
        <View style={styles.pickerContainer}>
          {/* Selection highlight */}
          <View style={styles.selectionBg} pointerEvents="none" />

          {/* Day column */}
          <Column
            items={days}
            selectedIndex={safeDay - 1}
            onSelect={(i) => setDay(i + 1)}
            formatItem={(v) => String(v).padStart(2, '0')}
          />

          {/* Month column */}
          <Column
            items={MONTHS}
            selectedIndex={month - 1}
            onSelect={(i) => setMonth(i + 1)}
            formatItem={(v) => String(v)}
          />

          {/* Year column */}
          <Column
            items={years}
            selectedIndex={years.indexOf(year) === -1 ? 0 : years.indexOf(year)}
            onSelect={(i) => setYear(years[i]!)}
            formatItem={(v) => String(v)}
          />
        </View>
      </View>
    </Modal>
  );
}

function Column<T>({
  items,
  selectedIndex,
  onSelect,
  formatItem,
}: {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem: (item: T) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [localIndex, setLocalIndex] = useState(selectedIndex);

  // Jump to selectedIndex when it changes from parent
  useEffect(() => {
    setLocalIndex(selectedIndex);
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  const handleScrollEnd = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    setLocalIndex(clamped);
    onSelect(clamped);
    // Snap
    scrollRef.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
  }, [items.length, onSelect]);

  return (
    <View style={styles.column}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_H }}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        scrollEventThrottle={16}
        bounces={false}
      >
        {items.map((item, i) => {
          const dist = Math.abs(i - localIndex);
          const isSelected = i === localIndex;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setLocalIndex(i);
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              activeOpacity={0.7}
              style={styles.item}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                  dist === 1 && styles.itemTextNear,
                  dist >= 2 && styles.itemTextFar,
                ]}
              >
                {formatItem(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF8F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleBar: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(26,26,46,0.15)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,26,46,0.06)',
  },
  headerBtn: { minWidth: 60 },
  title: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: '#1A1A2E' },
  cancelText: { fontFamily: 'Inter-Regular', fontSize: 15, color: '#9999B8' },
  doneText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FF6B4A', textAlign: 'right' },

  pickerContainer: {
    flexDirection: 'row',
    height: PICKER_H,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionBg: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: ITEM_H * 2,
    height: ITEM_H,
    backgroundColor: 'rgba(255,107,74,0.08)',
    borderRadius: 12,
  },
  column: {
    width: COL_W,
    height: PICKER_H,
    overflow: 'hidden',
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: 'Inter-Medium',
    fontSize: 17,
    color: '#1A1A2E',
  },
  itemTextSelected: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 19,
    color: '#FF6B4A',
  },
  itemTextNear: {
    color: 'rgba(26,26,46,0.45)',
    fontSize: 16,
  },
  itemTextFar: {
    color: 'rgba(26,26,46,0.2)',
    fontSize: 14,
  },
});
