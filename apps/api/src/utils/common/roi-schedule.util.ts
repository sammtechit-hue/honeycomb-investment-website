import { Prisma } from '@investment-platform/db';
import { addDays, toDateOnly } from './bangladeshTime.util';

// ROI timing rules (client-confirmed 2026-11-08). Every month is 30 days.
//
// - ROI starts 10 calendar days after the investment date, always.
// - The term runs from ROI start for N months.
// - A cycle runs from the cycle day (11th) to the day before, paid on the
//   cycle day. The first cycle is a stub from ROI start to the 10th.
// - A first stub under 15 days isn't paid alone; it joins the next payout.
// - The final stub (11th → end of term) is forfeited when ROI started on
//   the 11th–19th, otherwise paid on the next cycle day.
//
// Example, 3-month term, cycle day 11:
//   ROI start 15 Aug → 26 / 30 / 30, final 4 days forfeited (86)
//   ROI start 25 Aug → 16 / 30 / 30, then 14 on 11 Dec (90)

export const ROI_START_DELAY_DAYS = 10;
export const MIN_STANDALONE_FIRST_PAYOUT_DAYS = 15;
// Final stub forfeited when ROI starts 0–8 days after the cycle day (11th–19th).
const FORFEIT_FINAL_STUB_MAX_OFFSET = 8;

const ROUND_HALF_UP = 4;

/** Fixed 30-day ordinal; the 31st counts as the 30th. */
export function ord30(d: Date): number {
    return (
        d.getUTCFullYear() * 360 +
        d.getUTCMonth() * 30 +
        Math.min(d.getUTCDate(), 30)
    );
}

/** Calendar date for a 30-day ordinal; Feb 29/30 fall back to the month's last day. */
export function fromOrd30(o: number): Date {
    const year = Math.floor((o - 1) / 360);
    const month = Math.floor((o - 1 - year * 360) / 30);
    const day = o - year * 360 - month * 30;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function roiStartDate(investmentDate: Date): Date {
    return addDays(toDateOnly(investmentDate), ROI_START_DELAY_DAYS);
}

/** 40 days up to 2,00,000, then +20 days per further 1,00,000 or part of it. */
export function withdrawalNoticeDays(amount: Prisma.Decimal.Value): number {
    const extra = new Prisma.Decimal(amount).sub(200_000);
    if (extra.lte(0)) return 40;
    return 40 + 20 * extra.div(100_000).ceil().toNumber();
}

export function computeProfit(
    amount: Prisma.Decimal.Value,
    ratePercent: Prisma.Decimal.Value,
    days: number,
): Prisma.Decimal {
    return new Prisma.Decimal(amount)
        .mul(ratePercent)
        .div(100)
        .mul(days)
        .div(30)
        .toDecimalPlaces(2, ROUND_HALF_UP);
}

export interface RoiSchedule {
    roiStart: Date;
    termMonths: number;
    cycleDay: number;
}

export interface CycleShare {
    start: Date;
    end: Date;
    days: number;
    isFirst: boolean;
    /** No later cycle earns ROI (term over, or the final stub is forfeited). */
    isLast: boolean;
}

/**
 * The part of one cycle (cycleStart = the cycle day, cycleEnd = the day
 * before the next one) that earns ROI, or null when none of it does.
 */
export function roiShareOfCycle(
    s: RoiSchedule,
    cycleStart: Date,
    cycleEnd: Date,
): CycleShare | null {
    const share = shareInOrd(s, ord30(cycleStart), ord30(cycleEnd));
    if (!share) return null;

    const next = shareInOrd(s, ord30(cycleEnd) + 1, ord30(cycleEnd) + 30);
    return {
        start: fromOrd30(share.from),
        end: fromOrd30(share.to),
        days: share.to - share.from + 1,
        isFirst: share.isFirst,
        isLast: next === null,
    };
}

function shareInOrd(s: RoiSchedule, cs: number, ce: number) {
    const roiStart = ord30(s.roiStart);
    const termLast = roiStart + 30 * s.termMonths - 1;

    const from = Math.max(roiStart, cs);
    const to = Math.min(termLast, ce);
    if (from > to) return null;

    const isFirst = from === roiStart;
    const endsTerm = to === termLast && termLast < ce;
    if (endsTerm && !isFirst) {
        const offset = (Math.min(s.roiStart.getUTCDate(), 30) - s.cycleDay + 30) % 30;
        if (offset <= FORFEIT_FINAL_STUB_MAX_OFFSET) return null;
    }
    return { from, to, isFirst };
}

export interface WithdrawalInCycle {
    amount: Prisma.Decimal.Value;
    noticePeriodEnd: Date;
}

export interface CycleProfit {
    principalAmount: Prisma.Decimal; // what stays invested
    profitAmount: Prisma.Decimal; // includes finalRoiAmount
    finalRoiDays: number | null;
    finalRoiAmount: Prisma.Decimal | null;
}

/**
 * Profit for one cycle share. `principal` is what was invested when the share
 * began. A withdrawal whose notice ends inside the share earns until the day
 * before its notice-end date; the rest earns every day.
 */
export function cycleProfit(
    share: Pick<CycleShare, 'start' | 'end' | 'days'>,
    principal: Prisma.Decimal.Value,
    ratePercent: Prisma.Decimal.Value,
    withdrawal: WithdrawalInCycle | null,
): CycleProfit {
    const total = new Prisma.Decimal(principal);
    const endsHere =
        withdrawal &&
        ord30(withdrawal.noticePeriodEnd) >= ord30(share.start) &&
        ord30(withdrawal.noticePeriodEnd) <= ord30(share.end);

    if (!endsHere) {
        return {
            principalAmount: total,
            profitAmount: computeProfit(total, ratePercent, share.days),
            finalRoiDays: null,
            finalRoiAmount: null,
        };
    }

    const principalAmount = total.sub(withdrawal.amount);
    const finalRoiDays = ord30(withdrawal.noticePeriodEnd) - ord30(share.start);
    const finalRoiAmount = computeProfit(withdrawal.amount, ratePercent, finalRoiDays);

    return {
        principalAmount,
        profitAmount: computeProfit(principalAmount, ratePercent, share.days).add(finalRoiAmount),
        finalRoiDays,
        finalRoiAmount,
    };
}

/**
 * The next unpaid ledger rows to pay together, oldest first, or null when
 * nothing is due. A payout takes `cyclesPerPayout` rows (the first stub
 * counts as a row). A first stub under 15 days waits for the next row. The
 * term's last row is paid without waiting for a full group.
 */
export function nextPayoutRows<T extends { daysCounted: number; isFirst: boolean; isLast: boolean }>(
    rows: T[],
    cyclesPerPayout: number,
): T[] | null {
    if (rows.length === 0) return null;

    let needed = cyclesPerPayout;
    if (
        cyclesPerPayout === 1 &&
        rows[0].isFirst &&
        !rows[0].isLast &&
        rows[0].daysCounted < MIN_STANDALONE_FIRST_PAYOUT_DAYS
    ) {
        needed = 2;
    }

    const group = rows.slice(0, needed);
    if (group.length === needed || group[group.length - 1].isLast) return group;
    return null;
}
