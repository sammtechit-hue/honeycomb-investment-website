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
    );
}

/** Format Date as YYYY-MM-DD for logs/messages. */
export function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
}

