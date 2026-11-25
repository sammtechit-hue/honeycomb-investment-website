export function getDhakaDateOnly(now: Date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);

    const year = Number(parts.find((p) => p.type === 'year')!.value);
    const month = Number(parts.find((p) => p.type === 'month')!.value);
    const day = Number(parts.find((p) => p.type === 'day')!.value);

    // Return Bangladesh calendar date as UTC midnight.
    return new Date(Date.UTC(year, month - 1, day));
}


// Current Bangladesh wall-clock time as a UTC-based Date. This matches values in
// `timestamp` columns written as Dhaka local time (e.g. `now() AT TIME ZONE
// 'Asia/Dhaka'`), which Prisma reads back as UTC.
export function getDhakaNow(now: Date = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);

    const pick = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)!.value);

    return new Date(
        Date.UTC(
            pick('year'),
            pick('month') - 1,
            pick('day'),
            pick('hour'),
            pick('minute'),
            pick('second'),
        ),
    );
}


export function toDateOnly(d: Date): Date {
    return new Date(
        Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
        ),
    );
}

export function addDays(d: Date, days: number): Date {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + days);
    return toDateOnly(r);
}

/**
 * Convert a date into a fixed 30-day calendar ordinal.
 * Every month is treated as exactly 30 days.
 */
export function toOrd(d: Date): number {
    return (
        d.getUTCFullYear() * 360 +
        d.getUTCMonth() * 30 +
        d.getUTCDate()
        // Math.min(d.getUTCDate(), 30)
    );
}

/** Format Date as YYYY-MM-DD for logs/messages. */
export function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Add calendar months in UTC; clamps day (e.g. Nov 31 -> Nov 30). */
export function addMonths(d: Date, months: number): Date {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

