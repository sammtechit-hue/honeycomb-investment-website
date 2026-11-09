import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { CONTRACT_COMPANY } from './contract-company';
import { amountToWords, formatAgreementDateTime, formatAmount } from './contract-format';
import { missingCharacters, readCmapCoverage } from './font-coverage';

// apps/api/assets/contract — two levels up from both src/contract-pdf (dev,
// tests) and dist/contract-pdf (production), so no build step copies it.
export const CONTRACT_ASSETS_DIR = resolve(__dirname, '..', '..', 'assets', 'contract');
const TEMPLATE_PATH = join(CONTRACT_ASSETS_DIR, 'investment-contract.typ');
const FONTS_DIR = join(CONTRACT_ASSETS_DIR, 'fonts');
const FONT_FILES = ['HindSiliguri-Regular.ttf', 'HindSiliguri-SemiBold.ttf', 'HindSiliguri-Bold.ttf'];
// Optional letterhead logo; the template prints the company name when absent.
const LOGO_FILE = 'logo.png';

export interface ContractPerson {
  name: string;
  nid: string;
  phone: string;
  relation?: string;
}

export interface ContractSigner extends ContractPerson {
  // Scanned signature, PNG or JPEG.
  signature?: Buffer | null;
}

export interface ContractRenderInput {
  // When the contract is made; printed as date and time in Dhaka time.
  agreementAt: Date;
  place: string;
  // Decimal string, e.g. Prisma Decimal.toString().
  amount: string;
  roi: string;
  period: string;
  // Opens the "*** … বিনিয়োগকারীকে ROI পরিশোধ করা হবে। ***" line, e.g. "প্রতিমাসে".
  payoutFrequency: string;
  investor: ContractPerson;
  investorGuarantor: ContractPerson | null;
  nominee: ContractPerson | null;
  receiver: ContractSigner;
  receiverGuarantor: ContractSigner & { relation: string };
}

export class ContractRenderError extends Error {}

const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/gu;
const ZWNJ = '‌';
const ZWJ = '‍';

// NFC, single spaces (folds NBSP, U+202F and friends) and no invisible
// control/format characters — except ZWJ/ZWNJ, which Bengali spelling uses.
function clean(value: string): string {
  return value
    .normalize('NFC')
    .replace(CONTROL_CHARS, (char) => (char === ZWNJ || char === ZWJ ? char : ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function imageExtension(data: Buffer): 'png' | 'jpg' {
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg';
  throw new ContractRenderError('Signature images must be PNG or JPEG');
}

// A plain class on purpose: it has no constructor dependencies, so Nest can
// provide it without @Injectable(), and its spec runs without loading Nest
// (which this repo's Jest setup can't import as ESM yet).
export class ContractPdfService {
  private readonly compiler: NodeCompiler;
  private readonly coverage: Set<number>;
  private readonly logo: string;

  constructor() {
    const fonts = FONT_FILES.map((file) => readFileSync(join(FONTS_DIR, file)));
    // Every weight must cover the same characters, or bold text could tofu
    // where regular text doesn't.
    const [regular, ...others] = fonts.map(readCmapCoverage);
    for (const other of others) {
      if (other.size !== regular.size || [...other].some((code) => !regular.has(code))) {
        throw new Error('Contract font weights cover different characters');
      }
    }
    this.coverage = regular;
    // Fonts are passed as blobs, and the template pins its family with
    // fallback disabled, so text never renders in a host system font.
    this.compiler = NodeCompiler.create({
      workspace: CONTRACT_ASSETS_DIR,
      fontArgs: [{ fontBlobs: fonts }],
    });
    this.logo = existsSync(join(CONTRACT_ASSETS_DIR, LOGO_FILE)) ? LOGO_FILE : '';
  }

  render(input: ContractRenderInput): { pdf: Buffer; pages: number } {
    const problems: string[] = [];
    const text = (field: string, value: string | undefined, required: boolean): string => {
      const cleaned = clean(value ?? '');
      if (required && !cleaned) problems.push(`${field} is required`);
      const missing = missingCharacters(cleaned, this.coverage);
      if (missing.length) problems.push(`${field} has characters the contract font can't print: ${missing.join(' ')}`);
      return cleaned;
    };
    const person = (field: string, p: ContractPerson | null, required: boolean, withRelation: boolean) => ({
      name: text(`${field}.name`, p?.name, required),
      nid: text(`${field}.nid`, p?.nid, required),
      phone: text(`${field}.phone`, p?.phone, required),
      relation: withRelation ? text(`${field}.relation`, p?.relation, required) : '',
    });

    let date: string;
    let time: string;
    let amount: string;
    let amountInWords: string;
    try {
      ({ date, time } = formatAgreementDateTime(input.agreementAt));
      amount = formatAmount(input.amount);
      amountInWords = amountToWords(input.amount);
    } catch (error) {
      throw new ContractRenderError((error as Error).message);
    }

    // Shadow-mapped next to the template for this render only. compile(),
    // pdf() and the unmap below are synchronous, so concurrent requests
    // can't interleave between them.
    const shadowPaths: string[] = [];
    const mapSignature = (role: string, image: Buffer | null | undefined): string => {
      if (!image) return '';
      const relative = `runtime/${randomUUID()}-${role}.${imageExtension(image)}`;
      const absolute = join(CONTRACT_ASSETS_DIR, relative);
      shadowPaths.push(absolute);
      this.compiler.mapShadow(absolute, image);
      return relative;
    };

    const data = {
      company: { ...CONTRACT_COMPANY, logo: this.logo },
      agreement: { date, time, place: text('place', input.place, true) },
      investment: {
        amount,
        amountInWords,
        roi: text('roi', input.roi, true),
        period: text('period', input.period, true),
        payoutFrequency: text('payoutFrequency', input.payoutFrequency, true),
      },
      investor: person('investor', input.investor, true, false),
      investorGuarantor: person('investorGuarantor', input.investorGuarantor, false, true),
      nominee: person('nominee', input.nominee, false, true),
      receiver: { ...person('receiver', input.receiver, true, false), signature: '' },
      receiverGuarantor: {
        ...person('receiverGuarantor', input.receiverGuarantor, true, true),
        signature: '',
      },
    };
    if (problems.length) {
      throw new ContractRenderError(`Contract data is invalid:\n- ${problems.join('\n- ')}`);
    }

    try {
      data.receiver.signature = mapSignature('receiver', input.receiver.signature);
      data.receiverGuarantor.signature = mapSignature('guarantor', input.receiverGuarantor.signature);

      const result = this.compiler.compile({
        mainFilePath: TEMPLATE_PATH,
        inputs: { data: JSON.stringify(data) },
      });
      // Warnings fail the render too: an unknown font or similar would
      // otherwise ship a silently wrong legal document. (takeDiagnostics()
      // reports neither; errors and warnings each have their own taker.)
      const messages = [result.takeError(), result.takeWarnings()].flatMap(
        (error) => error?.shortDiagnostics.map((d: { message: string }) => d.message) ?? [],
      );
      const document = result.result;
      if (!document || messages.length) {
        throw new Error(`Contract template failed to compile: ${messages.join('; ') || 'unknown error'}`);
      }

      // Signatures must share a page with clause text, or a signature page
      // could be lifted onto another contract. The template keeps them in
      // one unbreakable block; this proves it held for this data.
      const pageOf = (label: string): unknown[] =>
        this.compiler.query(document, { selector: `<${label}>`, field: 'value' });
      const clausePage = pageOf('clause-10-page');
      const signaturesPage = pageOf('signatures-end-page');
      if (clausePage.length !== 1 || signaturesPage.length !== 1 || clausePage[0] !== signaturesPage[0]) {
        throw new ContractRenderError(
          'Contract layout failed: the signatures would not share a page with the closing clause',
        );
      }

      const pdf = this.compiler.pdf(document, {
        creationTimestamp: Math.floor(input.agreementAt.getTime() / 1000),
      });
      return { pdf, pages: document.numOfPages };
    } finally {
      for (const path of shadowPaths) this.compiler.unmapShadow(path);
      // Bound the compiler's global memo cache in a long-running process.
      this.compiler.evictCache(10);
    }
  }
}
