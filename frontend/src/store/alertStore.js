import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  alerts: [],
  unreadCount: 0,
  isLoadingAlerts: false,

  addAlert: (alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setAlerts: (alerts) => {
    const unreadCount = alerts.filter((a) => !a.acknowledged).length;
    set({ alerts, unreadCount });
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  clearUnread: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
      unreadCount: 0,
    }));
  },

  setLoadingAlerts: (isLoading) => {
    set({ isLoadingAlerts: isLoading });
  },

  clearAlerts: () => {
    set({ alerts: [], unreadCount: 0 });
  },
}));
