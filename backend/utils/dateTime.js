const MANILA_TIME_ZONE = 'Asia/Manila';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getManilaParts = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MANILA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);

    const pick = (type) => parts.find((part) => part.type === type)?.value;

    return {
        year: pick('year'),
        month: pick('month'),
        day: pick('day'),
        hour: pick('hour'),
        minute: pick('minute'),
        second: pick('second'),
    };
};

const formatDateOnlyInManila = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim())) {
        return value.trim();
    }

    const parts = getManilaParts(value);
    if (!parts) {
        return null;
    }

    return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatDateTimeInManila = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const parts = getManilaParts(date);
    if (!parts) {
        return null;
    }

    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}`;
};

const toSqlDateLiteral = (value, fallbackValue = null) => {
    if (!value) {
        return fallbackValue;
    }

    return formatDateOnlyInManila(value);
};

const toSqlDateTimeLiteral = (value, { fallbackToNow = false } = {}) => {
    if (!value) {
        return fallbackToNow ? formatDateTimeInManila(new Date()) : null;
    }

    if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value.trim())) {
        return `${value.trim()}T00:00:00.000`;
    }

    return formatDateTimeInManila(value);
};

module.exports = {
    DATE_ONLY_PATTERN,
    MANILA_TIME_ZONE,
    formatDateOnlyInManila,
    formatDateTimeInManila,
    toSqlDateLiteral,
    toSqlDateTimeLiteral,
};
