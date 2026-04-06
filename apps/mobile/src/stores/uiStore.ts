import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import type { EventStatus } from '@hangout/shared';

// MMKV only works on native — use a simple in-memory fallback on web
const storage = Platform.OS !== 'web' ? new MMKV({ id: 'hangout-ui' }) : null;

const KEY_EVENTS_TAB = 'my_events_active_tab';

type EventsTab = EventStatus | 'all';

interface UIState {
  myEventsTab: EventsTab;
  setMyEventsTab: (tab: EventsTab) => void;
}

function readTab(): EventsTab {
  try {
    const v = storage?.getString(KEY_EVENTS_TAB);
    if (v === 'all' || v === 'active' || v === 'draft' || v === 'completed' || v === 'cancelled') {
      return v as EventsTab;
    }
  } catch {
    // ignore
  }
  return 'all';
}

export const useUIStore = create<UIState>(() => ({
  myEventsTab: readTab(),
  setMyEventsTab: (tab: EventsTab) => {
    useUIStore.setState({ myEventsTab: tab });
    try {
      storage?.set(KEY_EVENTS_TAB, tab);
    } catch {
      // ignore
    }
  },
}));
