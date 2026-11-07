// Pure formatting helpers for the investment contract (বিনিয়োগ চুক্তি).
// Amounts arrive as strings (Prisma Decimal.toString()) so no value ever
// passes through a float.

// Bangladesh has no DST, but the server runs in UTC: always format in Dhaka
// time, never the host's zone.
export const CONTRACT_TIME_ZONE = 'Asia/Dhaka';

// Decimal(14, 2) → at most 12 integer digits.
const AMOUNT_RE = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

function parseAmount(amount: string): { taka: number; paisa: number } {
  const match = AMOUNT_RE.exec(amount.trim());
  if (!match) throw new Error(`Invalid contract amount: "${amount}"`);
  const taka = Number(match[1]);
  const paisa = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  if (taka === 0 && paisa === 0) throw new Error('Contract amount must be greater than zero');
  return { taka, paisa };
}

// South Asian digit grouping: 10,00,000 / 1,25,50,000. Paisa only when non-zero.
export function formatAmount(amount: string): string {
  const { taka, paisa } = parseAmount(amount);
  const digits = String(taka);
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;
  return paisa ? `${grouped}.${String(paisa).padStart(2, '0')}` : grouped;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', belowHundred(n % 100)]
    .filter(Boolean)
    .join(' ');
}

// Units match the client's contract wording ("Ten Lacs Taka Only"):
// singular for one, plural otherwise.
function integerToWords(n: number): string {
  const crore = Math.floor(n / 10_000_000);
  const lac = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  return [
    // Crore counts above 99 are themselves spelled in this system.
    crore ? `${integerToWords(crore)} ${crore === 1 ? 'Crore' : 'Crores'}` : '',
    lac ? `${belowHundred(lac)} ${lac === 1 ? 'Lac' : 'Lacs'}` : '',
    thousand ? `${belowHundred(thousand)} Thousand` : '',
    rest ? belowThousand(rest) : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// 1000000 → "Ten Lacs Taka Only"; 150000.5 → "One Lac Fifty Thousand Taka and Fifty Paisa Only"
export function amountToWords(amount: string): string {
  const { taka, paisa } = parseAmount(amount);
  const parts: string[] = [];
  if (taka) parts.push(`${integerToWords(taka)} Taka`);
  if (paisa) parts.push(`${belowHundred(paisa)} Paisa`);
  return `${parts.join(' and ')} Only`;
}

// "26 July 2026" and "7:00 PM", in Dhaka time. Built from parts so ICU
// version differences (e.g. U+202F before "PM" since ICU 72) can't leak in.
export function formatAgreementDateTime(at: Date): { date: string; time: string } {
  if (Number.isNaN(at.getTime())) throw new Error('Invalid contract date');
  const part = (options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: CONTRACT_TIME_ZONE, ...options })
      .formatToParts(at)
      .find((p) => p.type === type)!.value;

  const day = Number(part({ day: 'numeric' }, 'day'));
  const month = part({ month: 'long' }, 'month');
  const year = part({ year: 'numeric' }, 'year');
  const hour = Number(part({ hour: 'numeric', hour12: true }, 'hour'));
  const minute = part({ minute: '2-digit' }, 'minute').padStart(2, '0');
  const dayPeriod = Number(part({ hour: 'numeric', hourCycle: 'h23' }, 'hour')) < 12 ? 'AM' : 'PM';

  return { date: `${day} ${month} ${year}`, time: `${hour}:${minute} ${dayPeriod}` };
}
