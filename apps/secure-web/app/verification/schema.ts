import { z } from 'zod';
import {
  accountNameSchema,
  accountNumberSchema,
  bankAccountTypeSchema,
  bankNameSchema,
  bankSelectedSchema,
  routingNumberSchema,
} from '@investment-platform/contracts/common';
import {
  investorApplicationInputSchema,
  investorApplicationResubmitInputSchema,
  investorCreateInputSchema,
  nomineeSchema,
  type InvestorApplicationInput,
  type InvestorApplicationResubmitInput,
  type InvestorCreateInput,
} from '@investment-platform/contracts/investor';
import {
  disbursementPeriodSchema,
  investmentPeriodDisbursementError,
  investmentTypeSchema,
} from '@investment-platform/contracts/investment';
import { localMobileSchema, withCountryCode } from '@/lib/phone';

// Form-side schemas for each wizard step. Field rules come from the shared
// contract (the API validates the final payload with the same ones); the UI
// is stricter in places the KYC process requires but the contract leaves
// optional — home address, branch, account type and the nominee documents.

export const CITY_BANK_NAME = 'City Bank Limited';

export const personalSchema = z.object({
  fullName: investorCreateInputSchema.shape.fullName,
  address: z
    .string()
    .trim()
    .min(5, 'Enter your full home address')
    .max(500, 'Address cannot exceed 500 characters'),
  profession: z.string().trim().max(150, 'Profession cannot exceed 150 characters'),
  workplace: z.string().trim().max(150, 'Workplace cannot exceed 150 characters'),
  referralCode: z
    .string()
    .trim()
    .refine((value) => value === '' || (value.length >= 7 && value.length <= 20), {
      message: 'Referral codes are 7–20 characters',
    }),
});
export type PersonalValues = z.infer<typeof personalSchema>;

export const nomineeFormSchema = z.object({
  nomineeName: nomineeSchema.shape.nomineeName,
  nomineePhone: localMobileSchema,
  relation: nomineeSchema.shape.relation,
});
export type NomineeValues = z.infer<typeof nomineeFormSchema>;

export const bankFormSchema = z
  .object({
    selectedBank: bankSelectedSchema,
    bankName: z.string().trim(),
    branchName: z
      .string()
      .trim()
      .min(2, 'Enter the branch name')
      .max(150, 'Branch name cannot exceed 150 characters'),
    accountName: accountNameSchema,
    accountNumber: accountNumberSchema,
    routingNumber: z.string().trim(),
    // Starts unselected ('') so the investor has to choose. Kept a string
    // (no transform) because zodResolver can't type a changed output.
    accountType: z.string().refine((value) => bankAccountTypeSchema.safeParse(value).success, {
      message: 'Choose an account type',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.selectedBank !== 'others') return;

    const bankName = bankNameSchema.safeParse(data.bankName);
    if (!bankName.success) {
      ctx.addIssue({ code: 'custom', path: ['bankName'], message: bankName.error.issues[0].message });
    }
    if (!routingNumberSchema.safeParse(data.routingNumber).success) {
      const digits = data.routingNumber.replace(/\D/g, '').length;
      ctx.addIssue({
        code: 'custom',
        path: ['routingNumber'],
        message:
          data.routingNumber === ''
            ? 'Routing number is required for banks other than City Bank'
            : /^\d+$/.test(data.routingNumber)
              ? `Routing number must be 9 digits. You entered ${digits}.`
              : 'Routing number must contain only digits',
      });
    }
  });
export type BankValues = z.infer<typeof bankFormSchema>;

// The first investment, submitted with the application. Kept as strings for
// the form; the project minimum is checked in the step, which has the list.
export const parseAmount = (value: string) => Number(value.replace(/,/g, ''));

export const investmentFormSchema = z
  .object({
    projectId: z.string().min(1, 'Choose a project'),
    amount: z.string().trim().min(1, 'Enter an amount'),
    investmentType: investmentTypeSchema,
    disbursementPeriod: disbursementPeriodSchema,
    investmentPeriodMonths: z.string().trim().min(1, 'Enter the investment term'),
  })
  .superRefine((data, ctx) => {
    const amount = parseAmount(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount in taka' });
    }
    const termError = investmentPeriodDisbursementError({
      investmentPeriodMonths: Number(data.investmentPeriodMonths),
      disbursementPeriod: data.disbursementPeriod,
    });
    if (termError) ctx.addIssue({ code: 'custom', path: ['investmentPeriodMonths'], message: termError });
  });
export type InvestmentValues = z.infer<typeof investmentFormSchema>;

export const DOCUMENT_KEYS = [
  'nidFront',
  'nidBack',
  'photo',
  'nomineeNidFront',
  'nomineeNidBack',
  'nomineePhoto',
] as const;
export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

export type DocumentRef = {
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

export type Documents = Partial<Record<DocumentKey, DocumentRef>>;

export type WizardData = {
  personal: PersonalValues | null;
  nominee: NomineeValues | null;
  bank: BankValues | null;
  investment: InvestmentValues | null;
  documents: Documents;
};

export const EMPTY_WIZARD: WizardData = {
  personal: null,
  nominee: null,
  bank: null,
  investment: null,
  documents: {},
};

const blankToUndefined = (value: string) => (value === '' ? undefined : value);

// Assembles POST /api/investor's body and re-checks it against the
// contract, so a mismatch surfaces here rather than as a server 400.
// Form values → the API's bank account shape (also used by the dashboard's
// "Add a bank account" form).
export function toBankPayload(bank: BankValues): InvestorCreateInput['bankAccount'] {
  return {
    selectedBank: bank.selectedBank,
    bankName: bank.selectedBank === 'city_bank' ? CITY_BANK_NAME : bank.bankName,
    accountName: bank.accountName,
    accountNumber: bank.accountNumber,
    routingNumber: bank.selectedBank === 'others' ? bank.routingNumber : undefined,
    // Checked by bankFormSchema's refine; the API re-validates it.
    accountType: bank.accountType as z.infer<typeof bankAccountTypeSchema>,
    branchName: bank.branchName,
  };
}

// POST /api/investor (a new application) or, with `resubmit`, PUT
// /api/investor/application (a rejected one, corrected). Null if anything
// is missing or no longer passes the contract.
export function toInvestorPayload(data: WizardData): InvestorApplicationInput | null;
export function toInvestorPayload(
  data: WizardData,
  mode: 'resubmit',
): InvestorApplicationResubmitInput | null;
export function toInvestorPayload(
  data: WizardData,
  mode: 'create' | 'resubmit' = 'create',
): InvestorApplicationInput | InvestorApplicationResubmitInput | null {
  const { personal, nominee, bank, investment, documents } = data;
  if (!personal || !nominee || !bank || !investment) return null;
  if (DOCUMENT_KEYS.some((key) => !documents[key])) return null;

  const payload: InvestorApplicationInput = {
    fullName: personal.fullName,
    address: personal.address,
    profession: blankToUndefined(personal.profession),
    workplace: blankToUndefined(personal.workplace),
    referralCode: blankToUndefined(personal.referralCode),
    bankAccount: toBankPayload(bank),
    nominee: {
      nomineeName: nominee.nomineeName,
      nomineePhone: withCountryCode(nominee.nomineePhone),
      relation: nominee.relation,
      nomineeNidFront: documents.nomineeNidFront!.url,
      nomineeNidBack: documents.nomineeNidBack!.url,
      nomineePhoto: documents.nomineePhoto!.url,
    },
    kycDocuments: {
      nidFront: documents.nidFront!.url,
      nidBack: documents.nidBack!.url,
      photo: documents.photo!.url,
    },
    investment: {
      projectId: investment.projectId,
      amount: parseAmount(investment.amount),
      investmentType: investment.investmentType,
      disbursementPeriod: investment.disbursementPeriod,
      investmentPeriodMonths: Number(investment.investmentPeriodMonths),
    },
  };

  if (mode === 'resubmit') {
    const resubmit: InvestorApplicationResubmitInput = { ...payload };
    delete (resubmit as Partial<InvestorApplicationInput>).referralCode;
    return investorApplicationResubmitInputSchema.safeParse(resubmit).success ? resubmit : null;
  }
  return investorApplicationInputSchema.safeParse(payload).success ? payload : null;
}

// ---------------------------------------------------------------------------
// Prefill for a rejected application: what the investor sent last time, in
// the wizard's shape, so they only change what the reviewer flagged.
// ---------------------------------------------------------------------------

type SavedApplication = {
  fullname: string;
  address: string | null;
  profession: string | null;
  workplace: string | null;
  kycDocuments: { nidFront: string; nidBack: string; photo: string } | null;
  nominee: {
    nomineeName: string;
    nomineePhone: string | null;
    relation: string;
    nomineeNidFront: string | null;
    nomineeNidBack: string | null;
    nomineePhoto: string | null;
  } | null;
  bankAccount: {
    selectedBank: 'city_bank' | 'others';
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string | null;
    accountType: 'savings' | 'current' | null;
    branchName: string | null;
  }[];
};

type SavedInvestment = {
  projectId: string;
  amount: string;
  investmentType: 'fixed' | 'unfixed';
  disbursementPeriod: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  investmentPeriodMonths: number | null;
};

// A file already on the server. Its original name and size weren't kept, so
// the summary says "On file" instead.
function savedDocument(url: string | null | undefined): DocumentRef | undefined {
  if (!url) return undefined;
  return {
    url,
    name: 'On file',
    size: 0,
    mimeType: /\.pdf($|\?)/i.test(url) ? 'application/pdf' : 'image/*',
  };
}

// Stored as +8801XXXXXXXXX; the form takes the part after +880.
const localMobile = (phone: string | null) => (phone ? phone.replace(/^\+880/, '0') : '');

export function fromApplication(profile: SavedApplication, investment: SavedInvestment | null): WizardData {
  const bank = profile.bankAccount[0];
  const nominee = profile.nominee;
  const documents: Documents = {};
  const docs: [DocumentKey, string | null | undefined][] = [
    ['nidFront', profile.kycDocuments?.nidFront],
    ['nidBack', profile.kycDocuments?.nidBack],
    ['photo', profile.kycDocuments?.photo],
    ['nomineeNidFront', nominee?.nomineeNidFront],
    ['nomineeNidBack', nominee?.nomineeNidBack],
    ['nomineePhoto', nominee?.nomineePhoto],
  ];
  for (const [key, url] of docs) {
    const ref = savedDocument(url);
    if (ref) documents[key] = ref;
  }

  return {
    personal: {
      fullName: profile.fullname,
      address: profile.address ?? '',
      profession: profile.profession ?? '',
      workplace: profile.workplace ?? '',
      referralCode: '',
    },
    nominee: nominee
      ? { nomineeName: nominee.nomineeName, nomineePhone: localMobile(nominee.nomineePhone), relation: nominee.relation }
      : null,
    bank: bank
      ? {
          selectedBank: bank.selectedBank,
          bankName: bank.selectedBank === 'city_bank' ? '' : bank.bankName,
          branchName: bank.branchName ?? '',
          accountName: bank.accountName,
          accountNumber: bank.accountNumber,
          routingNumber: bank.routingNumber ?? '',
          accountType: bank.accountType ?? '',
        }
      : null,
    investment: investment
      ? {
          projectId: investment.projectId,
          amount: String(Number(investment.amount)),
          investmentType: investment.investmentType,
          disbursementPeriod: investment.disbursementPeriod,
          investmentPeriodMonths: String(investment.investmentPeriodMonths ?? ''),
        }
      : null,
    documents,
  };
}
