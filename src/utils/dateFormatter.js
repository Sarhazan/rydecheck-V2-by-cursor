function pad2(value) {
  return String(value).padStart(2, '0');
}

function normalizeYear(year) {
  const numericYear = Number(year);
  if (!Number.isFinite(numericYear)) return null;
  if (numericYear < 100) return 2000 + numericYear;
  return numericYear;
}

function parseDateParts(dateStr) {
  if (!dateStr) return null;

  const text = String(dateStr).trim();
  if (!text) return null;

  // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, with optional HH:MM[:SS]
  const dayFirstMatch = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if (dayFirstMatch) {
    const [, day, month, year, hour, minute] = dayFirstMatch;
    return {
      day: Number(day),
      month: Number(month),
      year: normalizeYear(year),
      hour: hour === undefined ? null : Number(hour),
      minute: minute === undefined ? null : Number(minute)
    };
  }

  // ISO-like YYYY-MM-DD, with optional HH:MM[:SS]
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch;
    return {
      day: Number(day),
      month: Number(month),
      year: normalizeYear(year),
      hour: hour === undefined ? null : Number(hour),
      minute: minute === undefined ? null : Number(minute)
    };
  }

  return null;
}

function isValidParts(parts) {
  if (!parts || !parts.year || !parts.month || !parts.day) return false;
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return false;
  if (parts.hour !== null && (parts.hour < 0 || parts.hour > 23)) return false;
  if (parts.minute !== null && (parts.minute < 0 || parts.minute > 59)) return false;

  const date = new Date(parts.year, parts.month - 1, parts.day);
  return date.getFullYear() === parts.year && date.getMonth() === parts.month - 1 && date.getDate() === parts.day;
}

function extractTime(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatRideDateTime(dateStr, timeStr = '') {
  if (!dateStr && !timeStr) return '-';

  const parts = parseDateParts(dateStr);
  if (!isValidParts(parts)) {
    return [dateStr, timeStr].filter(Boolean).join(' ') || '-';
  }

  const separateTime = extractTime(timeStr);
  const hour = separateTime?.hour ?? parts.hour;
  const minute = separateTime?.minute ?? parts.minute;

  const formattedDate = `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`;
  if (hour === null || hour === undefined || minute === null || minute === undefined) {
    return formattedDate;
  }

  return `${formattedDate} ${pad2(hour)}:${pad2(minute)}`;
}
