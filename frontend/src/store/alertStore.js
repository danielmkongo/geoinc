import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  alerts: [],       // active (unacknowledged) only
  unreadCount: 0,

  addAlert: (alert) => {
    set((state) => {
      // If same type already active, update it instead of duplicating
      const existing = state.alerts.find((a) => a.type === alert.type);
      if (existing) {
        return {
          alerts: state.alerts.map((a) =>
            a.type === alert.type
              ? { ...a, value: alert.value, occurrence_count: (a.occurrence_count || 1) + 1, last_seen_at: alert.created_at }
              : a
          ),
        };
      }
      return {
        alerts: [alert, ...state.alerts],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  setAlerts: (alerts) => {
    set({ alerts, unreadCount: alerts.length });
  },

  // Remove from active list when acknowledged (moves to history on the server)
  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  clearUnread: () => {
    set({ alerts: [], unreadCount: 0 });
  },

  setLoadingAlerts: () => {},
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
}));
