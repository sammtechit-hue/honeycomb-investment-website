import { writeFileSync } from 'fs';
import { inflateSync } from 'zlib';
import {
  ContractPdfService,
  ContractRenderError,
  type ContractRenderInput,
} from './contract-pdf.service';

// 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// The client's own signed contract (MD. Mahmudur Rahman, 10 lacs).
const sample = (): ContractRenderInput => ({
  agreementAt: new Date('2026-07-26T13:00:00Z'), // 7:00 PM Dhaka
  place: 'ONLINE',
  amount: '1000000.00',
  roi: '50 % of product profit ( estimated margin 2 to 2.5% monthly )',
  period: 'N/A',
  payoutFrequency: 'প্রতিমাসে',
  investor: { name: 'MD. MAHMUDUR RAHMAN', nid: '6413619393', phone: '+8801626-628132' },
  investorGuarantor: null,
  nominee: { name: 'MD MIZANUR RAHMAN', nid: '7765193748', phone: '', relation: '' },
  receiver: { name: 'Israt Sultana Tohfa', nid: '2404976017', phone: '01676623446', signature: PNG },
  receiverGuarantor: {
    name: 'Ashiq Ahmed',
    nid: '4204016036',
    phone: '01720087583',
    relation: 'Spouse',
    signature: PNG,
  },
});

// Every stream in the PDF, inflated where it's Flate-compressed, joined with
// the raw file — enough to find font names whether or not they sit in
// compressed object streams.
function pdfText(pdf: Buffer): string {
  const parts = [pdf.toString('latin1')];
  const raw = pdf.toString('latin1');
  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    try {
      parts.push(inflateSync(pdf.subarray(start, end)).toString('latin1'));
    } catch {
      // Not Flate (e.g. an image) — skip.
    }
  }
  return parts.join('\n');
}

describe('ContractPdfService', () => {
  const service = new ContractPdfService();

  it('renders the client contract as a two-page PDF', () => {
    const { pdf, pages } = service.render(sample());
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pages).toBe(2);
    if (process.env.CONTRACT_SAMPLE_OUT) writeFileSync(process.env.CONTRACT_SAMPLE_OUT, pdf);
  });

  it('embeds only the bundled Hind Siliguri fonts, never a host system font', () => {
    const fonts = [...pdfText(service.render(sample()).pdf).matchAll(/\/BaseFont\s*\/([^\s/<>[\]()]+)/g)].map(
      (m) => m[1],
    );
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(font).toMatch(/^([A-Z]{6}\+)?HindSiliguri-/);
  });

  it('is deterministic for the same input', () => {
    expect(service.render(sample()).pdf.equals(service.render(sample()).pdf)).toBe(true);
  });

  it('renders without signatures and with an investor guarantor', () => {
    const input = sample();
    input.receiver.signature = null;
    input.receiverGuarantor.signature = undefined;
    input.investorGuarantor = { name: 'রহিম উদ্দিন', nid: '1234567890123', phone: '01700000000', relation: 'ভাই' };
    expect(service.render(input).pages).toBe(2);
  });

  it('prints investor data as text, never as Typst markup or code', () => {
    const input = sample();
    input.investor.name = '#panic("injected") *bold* $x$ @ref <label> // comment [x]';
    input.nominee!.name = '#read("../../../package.json")';
    expect(() => service.render(input)).not.toThrow();
  });

  it('folds exotic whitespace and strips invisible control characters', () => {
    const input = sample();
    input.investor.name = ' MD. MAHMUDUR\tRAHMAN​⁦ ';
    expect(() => service.render(input)).not.toThrow();
  });

  it('keeps ZWNJ/ZWJ, which Bengali spelling needs', () => {
    const input = sample();
    input.nominee!.name = 'র‌যাব র‍্যাব';
    expect(() => service.render(input)).not.toThrow();
  });

  it('refuses characters the font would print as empty boxes', () => {
    const input = sample();
    input.investor.name = 'MD 漢 ✓';
    expect(() => service.render(input)).toThrow(ContractRenderError);
    expect(() => service.render(input)).toThrow(/investor\.name.*漢 ✓/);
  });

  it('refuses a contract with required party details missing', () => {
    const input = sample();
    input.investor.nid = '  ';
    input.receiverGuarantor.relation = '';
    expect(() => service.render(input)).toThrow(/investor\.nid is required[\s\S]*receiverGuarantor\.relation is required/);
  });

  it('keeps the signatures with the closing clause even with the longest names the database allows', () => {
    const long = (seed: string) => `${seed} `.repeat(40).slice(0, 150).trim(); // VarChar(150)
    const input = sample();
    for (const p of [input.investor, input.nominee!, input.receiver, input.receiverGuarantor]) {
      p.name = long('মোহাম্মদ আব্দুর রহমান খান');
      p.nid = '12345678901234567'; // longest NID format (17 digits)
    }
    input.investorGuarantor = { name: long('ABDUL KARIM'), nid: '12345678901234567', phone: '+8801700000000', relation: long('ভাই') };
    input.amount = '999999999999.99';
    const { pdf, pages } = service.render(input);
    if (process.env.CONTRACT_STRESS_OUT) writeFileSync(process.env.CONTRACT_STRESS_OUT, pdf);
    // A third page is acceptable here; render() itself throws if the
    // signatures got separated from clause ১০.
    expect(pages).toBeLessThanOrEqual(3);
  });

  it('allows the optional investor guarantor and nominee to be absent', () => {
    const input = sample();
    input.nominee = null;
    expect(service.render(input).pages).toBe(2);
  });

  it('refuses a signature that is not PNG or JPEG', () => {
    const input = sample();
    input.receiver.signature = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(() => service.render(input)).toThrow(ContractRenderError);
  });

  it.each(['0', '-1', 'abc'])('refuses the amount %j', (amount) => {
    expect(() => service.render({ ...sample(), amount })).toThrow(ContractRenderError);
  });

  it('refuses an invalid agreement date', () => {
    expect(() => service.render({ ...sample(), agreementAt: new Date('nope') })).toThrow(ContractRenderError);
  });

  it('unmaps every signature it mapped, even when the render fails part-way', () => {
    const local = new ContractPdfService();
    const compiler = (local as unknown as { compiler: { mapShadow: () => void; unmapShadow: () => void } }).compiler;
    const map = jest.spyOn(compiler, 'mapShadow');
    const unmap = jest.spyOn(compiler, 'unmapShadow');

    const input = sample();
    input.receiverGuarantor.signature = Buffer.from('not an image'); // fails after the receiver's is mapped
    expect(() => local.render(input)).toThrow(ContractRenderError);
    expect(map).toHaveBeenCalledTimes(1);
    expect(unmap.mock.calls).toEqual(map.mock.calls.map(([path]) => [path]));

    map.mockClear();
    unmap.mockClear();
    local.render(sample());
    expect(map).toHaveBeenCalledTimes(2);
    expect(unmap.mock.calls).toEqual(map.mock.calls.map(([path]) => [path]));
  });
});
