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
  investorCreateInputSchema,
  nomineeSchema,
  type InvestorCreateInput,
} from '@investment-platform/contracts/investor';
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
    // Starts unselected ('') so the shareholder has to choose. Kept a string
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
  documents: Documents;
};

export const EMPTY_WIZARD: WizardData = {
  personal: null,
  nominee: null,
  bank: null,
  documents: {},
};

const blankToUndefined = (value: string) => (value === '' ? undefined : value);

// Assembles POST /api/investor's body and re-checks it against the
// contract, so a mismatch surfaces here rather than as a server 400.
export function toInvestorPayload(data: WizardData): InvestorCreateInput | null {
  const { personal, nominee, bank, documents } = data;
  if (!personal || !nominee || !bank) return null;
  if (DOCUMENT_KEYS.some((key) => !documents[key])) return null;

  const payload: InvestorCreateInput = {
    fullName: personal.fullName,
    address: personal.address,
    profession: blankToUndefined(personal.profession),
    workplace: blankToUndefined(personal.workplace),
    referralCode: blankToUndefined(personal.referralCode),
    bankAccount: {
      selectedBank: bank.selectedBank,
      bankName: bank.selectedBank === 'city_bank' ? CITY_BANK_NAME : bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      routingNumber: bank.selectedBank === 'others' ? bank.routingNumber : undefined,
      // Checked by bankFormSchema's refine; safeParse below re-checks it.
      accountType: bank.accountType as z.infer<typeof bankAccountTypeSchema>,
      branchName: bank.branchName,
    },
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
  };

  return investorCreateInputSchema.safeParse(payload).success ? payload : null;
}
