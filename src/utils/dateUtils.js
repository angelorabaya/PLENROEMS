/**
 * Date utilities for Philippine Standard Time (GMT+8 / Asia/Manila).
 *
 * All helpers ensure consistent timezone handling regardless
 * of the server or browser's local timezone setting.
 */

const PHT_TIMEZONE = 'Asia/Manila';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SERVER_TIME_CACHE_KEY = 'serverTimeSnapshot';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const parseServerSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return null;

    const serverNowUtc = Date.parse(snapshot.serverNowUtc || '');
    const syncedAtClientMs =
        typeof snapshot.syncedAtClientMs === 'number' ? snapshot.syncedAtClientMs : null;

    if (!Number.isFinite(serverNowUtc) || !Number.isFinite(syncedAtClientMs)) {
        return null;
    }

    return {
        serverNowUtc,
        syncedAtClientMs,
        manilaDate: snapshot.manilaDate || '',
        manilaDateTime: snapshot.manilaDateTime || '',
        manilaYear:
            typeof snapshot.manilaYear === 'number'
                ? snapshot.manilaYear
                : parseInt(snapshot.manilaYear, 10) || null,
    };
};

const loadCachedServerSnapshot = () => {
    if (!canUseStorage()) return null;

    try {
        const raw = window.localStorage.getItem(SERVER_TIME_CACHE_KEY);
        return raw ? parseServerSnapshot(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
};

let serverTimeSnapshot = loadCachedServerSnapshot();

export const getEffectiveNow = () => {
    if (!serverTimeSnapshot) {
        return new Date();
    }

    const elapsedMs = Math.max(0, Date.now() - serverTimeSnapshot.syncedAtClientMs);
    return new Date(serverTimeSnapshot.serverNowUtc + elapsedMs);
};

const getPHTParts = (value = getEffectiveNow()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: PHT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value;

    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
    };
};

/**
 * Returns today's date as a YYYY-MM-DD string in Philippine Time.
 * Replaces the common `new Date().toISOString().split('T')[0]` pattern
 * which incorrectly returns a UTC date.
 */
export const getTodayPHT = () => {
    const parts = getPHTParts(getEffectiveNow());
    return `${parts.year}-${parts.month}-${parts.day}`;
};

/**
 * Returns the current year as a number in Philippine Time.
 */
export const getCurrentYearPHT = () => {
    if (serverTimeSnapshot?.manilaYear) {
        return serverTimeSnapshot.manilaYear;
    }

    return parseInt(
        getEffectiveNow().toLocaleString('en-US', {
            timeZone: PHT_TIMEZONE,
            year: 'numeric',
        }),
        10
    );
};

export const getCurrentMonthIndexPHT = () => {
    return (
        parseInt(
            getEffectiveNow().toLocaleString('en-US', {
                timeZone: PHT_TIMEZONE,
                month: 'numeric',
            }),
            10
        ) - 1
    );
};

/**
 * Returns a YYYY-MM-DD string offset by a number of years from today in PHT.
 * Useful for computing expiry dates (e.g. +1 year from today).
 */
export const getDateOffsetYearsPHT = (years) => {
    const today = getTodayPHT();
    const [y, m, d] = today.split('-').map(Number);
    const newYear = y + years;
    return `${newYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export const formatDateInputPHT = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim())) {
        return value.trim();
    }

    const parts = getPHTParts(value);
    if (!parts) return '';

    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const dateInputToUTCDate = (value) => {
    const normalized = formatDateInputPHT(value);
    if (!normalized) return null;

    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

export const formatDatePHT = (
    value,
    locale = 'en-US',
    options = { year: 'numeric', month: '2-digit', day: '2-digit' }
) => {
    if (!value) return '';

    const date =
        typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim())
            ? dateInputToUTCDate(value)
            : value instanceof Date
              ? value
              : new Date(value);

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat(locale, {
        timeZone: PHT_TIMEZONE,
        ...options,
    }).format(date);
};

export const formatDateTimePHT = (
    value,
    locale = 'en-US',
    options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    }
) => {
    return formatDatePHT(value, locale, options);
};

export const getFirstDayOfCurrentMonthPHT = () => {
    const [year, month] = getTodayPHT().split('-');
    return `${year}-${month}-01`;
};

export const addYearsToDateInput = (value, years) => {
    const normalized = formatDateInputPHT(value);
    if (!normalized) return '';

    const [year, month, day] = normalized.split('-').map(Number);
    return `${year + years}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const isDateOnOrAfterTodayPHT = (value) => {
    const normalized = formatDateInputPHT(value);
    return normalized ? normalized >= getTodayPHT() : false;
};

export const isDateBeforeTodayPHT = (value) => {
    const normalized = formatDateInputPHT(value);
    return normalized ? normalized < getTodayPHT() : false;
};

export const applyServerTimeSnapshot = (snapshot) => {
    const normalized = parseServerSnapshot({
        ...snapshot,
        syncedAtClientMs: Date.now(),
    });

    if (!normalized) {
        return false;
    }

    serverTimeSnapshot = normalized;

    if (canUseStorage()) {
        window.localStorage.setItem(SERVER_TIME_CACHE_KEY, JSON.stringify(normalized));
    }

    return true;
};

export const getServerTimeSnapshot = () => serverTimeSnapshot;

export { DATE_ONLY_PATTERN, PHT_TIMEZONE };
