export const storageService = {
  // Token management
  setToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  removeToken: () => localStorage.removeItem('token'),

  // User management
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  removeUser: () => localStorage.removeItem('user'),

  // Theme preference
  setTheme: (theme) => localStorage.setItem('theme', theme),
  getTheme: () => localStorage.getItem('theme') || 'dark',

  // Device preferences
  setDevicePreference: (deviceId) => localStorage.setItem('preferredDevice', deviceId),
  getDevicePreference: () => localStorage.getItem('preferredDevice') || '1',

  // Clear all
  clear: () => localStorage.clear(),
};
