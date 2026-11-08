import { Prisma } from '@investment-platform/db';
import {
    cycleProfit,
    fromOrd30,
    nextPayoutRows,
    ord30,
    roiShareOfCycle,
    roiStartDate,
    withdrawalNoticeDays,
    type RoiSchedule,
} from './roi-schedule.util';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

// Cycle paid on the 11th of (year, month): 11th of the previous month → 10th.
function cycle(year: number, month: number) {
    return {
        start: new Date(Date.UTC(year, month - 2, 11)),
        end: new Date(Date.UTC(year, month - 1, 10)),
    };
}

// Days earned per payout date, Sep 2026 → Jan 2027.
function payoutDays(s: RoiSchedule) {
    const payouts: [string, number, number][] = [
        ['11 Sep', 2026, 9],
        ['11 Oct', 2026, 10],
        ['11 Nov', 2026, 11],
        ['11 Dec', 2026, 12],
        ['11 Jan', 2027, 1],
    ];
    return Object.fromEntries(
        payouts.map(([label, y, m]) => {
            const c = cycle(y, m);
            return [label, roiShareOfCycle(s, c.start, c.end)?.days ?? 0];
        }),
    );
}

const schedule = (roiStart: string, termMonths = 3): RoiSchedule => ({
    roiStart: d(roiStart),
    termMonths,
    cycleDay: 11,
});

describe('roiStartDate', () => {
    it('is always 10 calendar days after the investment date', () => {
        expect(iso(roiStartDate(d('2026-08-01')))).toBe('2026-08-11');
        expect(iso(roiStartDate(d('2026-08-25')))).toBe('2026-09-04');
        expect(iso(roiStartDate(d('2026-02-25')))).toBe('2026-03-07');
    });
});

describe('withdrawalNoticeDays', () => {
    it.each([
        [1, 40],
        [50_000, 40],
        [200_000, 40],
        [200_001, 60],
        [220_000, 60],
        [300_000, 60],
        [300_001, 80],
        [320_000, 80],
        [1_000_000, 200],
    ])('%d taka → %d days', (amount, days) => {
        expect(withdrawalNoticeDays(amount)).toBe(days);
    });
});

describe('30-day ordinals', () => {
    it('treats the 31st as the 30th', () => {
        expect(ord30(d('2026-08-31'))).toBe(ord30(d('2026-08-30')));
        expect(ord30(d('2026-09-01'))).toBe(ord30(d('2026-08-30')) + 1);
    });

    it('maps Feb 29/30 back to the last real day', () => {
        expect(iso(fromOrd30(ord30(d('2027-02-28')) + 2))).toBe('2027-02-28');
        expect(iso(fromOrd30(ord30(d('2026-08-25'))))).toBe('2026-08-25');
    });
});

describe('roiShareOfCycle — client-confirmed table (3-month term, cycle day 11)', () => {
    it.each([
        // ROI start, 11 Sep, 11 Oct, 11 Nov, 11 Dec, 11 Jan
        ['2026-08-11', 30, 30, 30, 0, 0], // full months, no stubs
        ['2026-08-12', 29, 30, 30, 0, 0], // final 1 day forfeited
        ['2026-08-15', 26, 30, 30, 0, 0], // final 4 days forfeited
        ['2026-08-19', 22, 30, 30, 0, 0], // final 8 days forfeited
        ['2026-08-20', 21, 30, 30, 9, 0], // from the 20th the final stub is paid
        ['2026-08-25', 16, 30, 30, 14, 0],
        ['2026-08-26', 15, 30, 30, 15, 0],
        ['2026-08-27', 14, 30, 30, 16, 0], // 14-day stub joins the 11 Oct payout
        ['2026-08-31', 11, 30, 30, 19, 0], // the 31st counts as the 30th
        ['2026-09-05', 6, 30, 30, 24, 0],
        ['2026-09-10', 1, 30, 30, 29, 0],
    ])('ROI from %s', (start, sep, oct, nov, dec, jan) => {
        expect(payoutDays(schedule(start))).toEqual({
            '11 Sep': sep,
            '11 Oct': oct,
            '11 Nov': nov,
            '11 Dec': dec,
            '11 Jan': jan,
        });
    });

    it('adds up to 30 × term unless the final stub is forfeited', () => {
        for (let day = 1; day <= 30; day++) {
            const start = new Date(Date.UTC(2026, day >= 11 ? 7 : 8, day));
            const days = Object.values(payoutDays(schedule(iso(start)))) as number[];
            const total = days.reduce((a, b) => a + b, 0);
            const forfeited = day >= 12 && day <= 19 ? day - 11 : 0;
            expect(total).toBe(90 - forfeited);
        }
    });

    it('reports the dates, first and last cycle', () => {
        const s = schedule('2026-08-25');
        const first = roiShareOfCycle(s, d('2026-08-11'), d('2026-09-10'))!;
        expect([iso(first.start), iso(first.end), first.isFirst, first.isLast]).toEqual([
            '2026-08-25',
            '2026-09-10',
            true,
            false,
        ]);

        const final = roiShareOfCycle(s, d('2026-11-11'), d('2026-12-10'))!;
        expect([iso(final.start), iso(final.end), final.days, final.isFirst, final.isLast]).toEqual([
            '2026-11-11',
            '2026-11-24',
            14,
            false,
            true,
        ]);
    });

    it('marks the last full cycle as last when the final stub is forfeited', () => {
        const s = schedule('2026-08-15');
        expect(roiShareOfCycle(s, d('2026-10-11'), d('2026-11-10'))!.isLast).toBe(true);
        expect(roiShareOfCycle(s, d('2026-09-11'), d('2026-10-10'))!.isLast).toBe(false);
    });

    it('returns null before ROI starts', () => {
        expect(roiShareOfCycle(schedule('2026-09-15'), d('2026-08-11'), d('2026-09-10'))).toBeNull();
    });
});

describe('cycleProfit', () => {
    const share = { start: d('2026-09-11'), end: d('2026-10-10'), days: 30 };

    it('is principal × rate for a full cycle, never compounded', () => {
        const p = cycleProfit(share, 100_000, 2.5, null);
        expect(p.profitAmount.toString()).toBe('2500');
        expect(p.principalAmount.toString()).toBe('100000');
        expect(p.finalRoiDays).toBeNull();
    });

    it('pays the withdrawn part only until the day before its notice ends', () => {
        // ৳3,00,000, ৳1,00,000 withdrawn with notice ending 26 Sep → 15 days on it.
        const p = cycleProfit(share, 300_000, 2.5, {
            amount: 100_000,
            noticePeriodEnd: d('2026-09-26'),
        });
        expect(p.principalAmount.toString()).toBe('200000');
        expect(p.finalRoiDays).toBe(15);
        expect(p.finalRoiAmount!.toString()).toBe('1250');
        expect(p.profitAmount.toString()).toBe('6250'); // 5000 + 1250
    });

    it('ignores a withdrawal whose notice ends in another cycle', () => {
        const p = cycleProfit(share, 300_000, 2.5, {
            amount: 100_000,
            noticePeriodEnd: d('2026-10-20'),
        });
        expect(p.principalAmount.toString()).toBe('300000');
        expect(p.finalRoiAmount).toBeNull();
    });

    it('pays nothing more once the whole principal is withdrawn', () => {
        const p = cycleProfit(share, 100_000, 2.5, {
            amount: 100_000,
            noticePeriodEnd: d('2026-09-11'),
        });
        expect(p.profitAmount.toString()).toBe('0');
        expect(p.finalRoiDays).toBe(0);
    });

    it('rounds half up to 2 decimals', () => {
        expect(cycleProfit({ ...share, days: 29 }, 12_345, 2.5, null).profitAmount).toEqual(
            new Prisma.Decimal('298.34'),
        );
    });
});

describe('nextPayoutRows', () => {
    const row = (daysCounted: number, isFirst = false, isLast = false) => ({ daysCounted, isFirst, isLast });

    it('monthly: pays a first stub of 15+ days on its own', () => {
        expect(nextPayoutRows([row(16, true)], 1)).toHaveLength(1);
    });

    it('monthly: holds a first stub under 15 days for the next row (14 + 30 = 44)', () => {
        expect(nextPayoutRows([row(14, true)], 1)).toBeNull();
        const group = nextPayoutRows([row(14, true), row(30)], 1)!;
        expect(group.reduce((sum, r) => sum + r.daysCounted, 0)).toBe(44);
    });

    it('quarterly (Option A): the first stub counts as one of the 3 rows', () => {
        expect(nextPayoutRows([row(16, true), row(30)], 3)).toBeNull();
        expect(nextPayoutRows([row(16, true), row(30), row(30), row(30)], 3)).toHaveLength(3);
    });

    it('pays the final stub on its own without waiting for a full group', () => {
        expect(nextPayoutRows([row(14, false, true)], 3)).toHaveLength(1);
        expect(nextPayoutRows([row(30), row(14, false, true)], 3)).toHaveLength(2);
    });

    it('returns null with nothing to pay', () => {
        expect(nextPayoutRows([], 1)).toBeNull();
    });
});
