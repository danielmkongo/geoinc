// SQLite CURRENT_TIMESTAMP returns 'YYYY-MM-DD HH:MM:SS' without timezone indicator.
// JavaScript parses this as local time, but SQLite stores UTC — force UTC interpretation.
const parseDate = (date) => {
  if (!date) return new Date(NaN);
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
    return new Date(date.replace(' ', 'T') + 'Z');
  }
  return new Date(date);
};

const TZ = 'Africa/Dar_es_Salaam';

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return parseDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
};

export const formatTime = (date) => {
  if (!date) return 'N/A';
  return parseDate(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TZ,
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return 'Unknown';

  const now = new Date();
  const diff = now - parseDate(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  return formatDate(date);
};

export const roundToTwo = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return Math.round(value * 100) / 100;
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
