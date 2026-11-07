import { amountToWords, formatAgreementDateTime, formatAmount } from './contract-format';

describe('contract-format', () => {
  describe('formatAmount', () => {
    it.each([
      ['1000000', '10,00,000'],
      ['1000000.00', '10,00,000'],
      ['200000', '2,00,000'],
      ['12550000', '1,25,50,000'],
      ['999', '999'],
      ['1000', '1,000'],
      ['150000.5', '1,50,000.50'],
      ['10000.05', '10,000.05'],
      ['999999999999.99', '9,99,99,99,99,999.99'],
    ])('%s → %s', (input, expected) => {
      expect(formatAmount(input)).toBe(expected);
    });
  });

  describe('amountToWords', () => {
    it.each([
      // The client's own contract.
      ['1000000', 'Ten Lacs Taka Only'],
      ['100000', 'One Lac Taka Only'],
      ['150000', 'One Lac Fifty Thousand Taka Only'],
      ['200000', 'Two Lacs Taka Only'],
      ['10000', 'Ten Thousand Taka Only'],
      ['25500', 'Twenty Five Thousand Five Hundred Taka Only'],
      ['1', 'One Taka Only'],
      ['19', 'Nineteen Taka Only'],
      ['101', 'One Hundred One Taka Only'],
      ['10000000', 'One Crore Taka Only'],
      ['12550000', 'One Crore Twenty Five Lacs Fifty Thousand Taka Only'],
      ['1234567890', 'One Hundred Twenty Three Crores Forty Five Lacs Sixty Seven Thousand Eight Hundred Ninety Taka Only'],
      ['150000.50', 'One Lac Fifty Thousand Taka and Fifty Paisa Only'],
      ['150000.5', 'One Lac Fifty Thousand Taka and Fifty Paisa Only'],
      ['100.05', 'One Hundred Taka and Five Paisa Only'],
      ['0.75', 'Seventy Five Paisa Only'],
    ])('%s → %s', (input, expected) => {
      expect(amountToWords(input)).toBe(expected);
    });

    it.each(['0', '0.00', '-5', '1e6', '10,000', '1.234', '', 'abc', '1000000000000'])(
      'rejects %j',
      (input) => {
        expect(() => amountToWords(input)).toThrow();
        expect(() => formatAmount(input)).toThrow();
      },
    );
  });

  describe('formatAgreementDateTime', () => {
    it('prints Dhaka time whatever the host zone (the client contract: 26 July 2026, 7:00 PM)', () => {
      expect(formatAgreementDateTime(new Date('2026-07-26T13:00:00Z'))).toEqual({
        date: '26 July 2026',
        time: '7:00 PM',
      });
    });

    it('rolls the date over at Dhaka midnight, not UTC midnight', () => {
      expect(formatAgreementDateTime(new Date('2026-07-26T18:30:00Z'))).toEqual({
        date: '27 July 2026',
        time: '12:30 AM',
      });
    });

    it('prints noon as 12 PM and keeps two-digit minutes', () => {
      expect(formatAgreementDateTime(new Date('2026-01-01T06:05:00Z'))).toEqual({
        date: '1 January 2026',
        time: '12:05 PM',
      });
    });

    it('uses plain ASCII spaces only (no U+202F from newer ICU)', () => {
      const { date, time } = formatAgreementDateTime(new Date('2026-07-26T13:00:00Z'));
      expect(`${date}${time}`).toMatch(/^[\x20-\x7e]+$/);
    });

    it('rejects an invalid date', () => {
      expect(() => formatAgreementDateTime(new Date('nope'))).toThrow();
    });
  });
});
