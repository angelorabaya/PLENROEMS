/**
 * Date utilities for Philippine Standard Time (GMT+8 / Asia/Manila).
 *
 * All helpers ensure consistent timezone handling regardless
 * of the server or browser's local timezone setting.
 */

const PHT_TIMEZONE = 'Asia/Manila';

/**
 * Returns today's date as a YYYY-MM-DD string in Philippine Time.
 * Replaces the common `new Date().toISOString().split('T')[0]` pattern
 * which incorrectly returns a UTC date.
 */
export const getTodayPHT = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: PHT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);

    const y = parts.find((p) => p.type === 'year').value;
    const m = parts.find((p) => p.type === 'month').value;
    const d = parts.find((p) => p.type === 'day').value;
    return `${y}-${m}-${d}`;
};

/**
 * Returns the current year as a number in Philippine Time.
 */
export const getCurrentYearPHT = () => {
    return parseInt(
        new Date().toLocaleString('en-US', {
            timeZone: PHT_TIMEZONE,
            year: 'numeric',
        }),
        10
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

export { PHT_TIMEZONE };
