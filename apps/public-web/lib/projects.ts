import type { Locale } from './i18n/config';
import type { Dictionary } from './i18n/dictionaries/en';
import type { InvestmentType } from './roi';

// Shape of a public project listing.
//
// The Project model and GET /api/project don't carry these fields yet:
// investment type and disbursement period live on Investment, and there is
// no company, term, use-of-funds or document list on Project at all. Until
// the API is extended, getProjects() returns the SAMPLE data below. When it
// is, replace only the body of getProjects() — the page renders from this
// type and nothing else.
//
// Free text (name, use of funds, documents, sectors, quotes) is needed in
// both English and Bengali, so the API will have to store and return both;
// the samples below show the shape as Localized<string>.
//
// Values reuse the Prisma enum spellings (InvestmentType, DisbursementPeriod)
// so mapping the API response later is a straight copy.

export type DisbursementPeriod = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export type ProjectStatus = 'OPEN' | 'FULL' | 'PAUSED' | 'COMPLETED';

export type PublicProject = {
  id: string;
  name: string;
  company: string;
  status: ProjectStatus;
  minimumInvestment: number;
  investmentType: InvestmentType;
  payoutFrequencies: DisbursementPeriod[];
  termMonths: number;
  useOfFunds: string;
  // Labels only. The files themselves stay on the secure server (brief §9:
  // encrypted storage, never public links) and are shared after sign-up.
  documents: string[];
};

export type GroupCompany = {
  name: string;
  sector: string;
  operatingSince: number;
};

export type Testimonial = {
  quote: string;
  name: string;
  detail: string;
};

type Localized<T> = Record<Locale, T>;

// Document labels shared by the sample projects.
const DOC = {
  summary: { en: 'Project summary', bn: 'প্রকল্পের সারসংক্ষেপ' },
  tradeLicence: { en: 'Trade licence', bn: 'ট্রেড লাইসেন্স' },
  shareholderAgreement: { en: 'Shareholder agreement', bn: 'শেয়ারহোল্ডার চুক্তি' },
  leaseDeed: { en: 'Lease deed', bn: 'লিজ দলিল' },
} satisfies Record<string, Localized<string>>;

// SAMPLE — replace with real listings from the API.
const SAMPLE_PROJECTS = [
  {
    id: 'tahams-retail-expansion',
    name: { en: 'Retail outlet expansion', bn: 'খুচরা বিক্রয়কেন্দ্র সম্প্রসারণ' },
    company: 'Tahams',
    status: 'OPEN',
    minimumInvestment: 200_000,
    investmentType: 'unfixed',
    payoutFrequencies: ['monthly', 'quarterly'],
    termMonths: 24,
    useOfFunds: {
      en: 'Fit-out and opening stock for new brick-and-mortar outlets in Dhaka.',
      bn: 'ঢাকায় নতুন দোকানের সাজসজ্জা ও প্রাথমিক পণ্য মজুত।',
    },
    documents: [DOC.summary, DOC.tradeLicence, DOC.shareholderAgreement],
  },
  {
    id: 'sammtech-infrastructure',
    name: { en: 'Server infrastructure procurement', bn: 'সার্ভার অবকাঠামো ক্রয়' },
    company: 'SammTech',
    status: 'OPEN',
    minimumInvestment: 500_000,
    investmentType: 'unfixed',
    payoutFrequencies: ['quarterly', 'yearly'],
    termMonths: 36,
    useOfFunds: {
      en: 'Server hardware and delivery-team capacity for offshore client contracts.',
      bn: 'বিদেশি ক্লায়েন্টের চুক্তির জন্য সার্ভার হার্ডওয়্যার ও ডেলিভারি টিমের সক্ষমতা।',
    },
    documents: [DOC.summary, DOC.tradeLicence, DOC.shareholderAgreement],
  },
  {
    id: 'love-life-memories-venue',
    name: { en: 'Banquet venue lease and fit-out', bn: 'ব্যাংকুয়েট ভেন্যু লিজ ও সাজসজ্জা' },
    company: 'Love Life Memories',
    status: 'OPEN',
    minimumInvestment: 300_000,
    investmentType: 'fixed',
    payoutFrequencies: ['monthly'],
    termMonths: 18,
    useOfFunds: {
      en: 'Long-term lease and interior build-out of a wedding and event venue.',
      bn: 'বিয়ে ও অনুষ্ঠানের ভেন্যুর দীর্ঘমেয়াদি লিজ ও অভ্যন্তরীণ নির্মাণ।',
    },
    documents: [DOC.summary, DOC.leaseDeed, DOC.shareholderAgreement],
  },
] satisfies (Omit<PublicProject, 'name' | 'useOfFunds' | 'documents'> & {
  name: Localized<string>;
  useOfFunds: Localized<string>;
  documents: Localized<string>[];
})[];

// SAMPLE — confirm names, sectors and years with the client.
const GROUP_COMPANIES: (Omit<GroupCompany, 'sector'> & { sector: Localized<string> })[] = [
  { name: 'Tahams', sector: { en: 'Fashion and retail', bn: 'ফ্যাশন ও খুচরা বিক্রয়' }, operatingSince: 2018 },
  { name: 'Love Life Memories', sector: { en: 'Event management', bn: 'ইভেন্ট ম্যানেজমেন্ট' }, operatingSince: 2019 },
  {
    name: 'SammTech',
    sector: { en: 'Software and digital marketing', bn: 'সফটওয়্যার ও ডিজিটাল মার্কেটিং' },
    operatingSince: 2020,
  },
];

// SAMPLE — must be replaced with real, consented shareholder quotes before
// launch. Publishing invented testimonials would be misleading.
const TESTIMONIALS: Localized<Testimonial>[] = [
  {
    en: {
      quote:
        'I can see the rate applied to every month and check the maths myself. The transfer lands in my bank account on schedule.',
      name: 'Tanvir Ahmed',
      detail: 'Investor, Dhaka',
    },
    bn: {
      quote:
        'প্রতি মাসে কোন হার প্রয়োগ হয়েছে তা দেখতে পাই এবং নিজেই হিসাব মিলিয়ে নিতে পারি। ট্রান্সফার সময়মতো আমার ব্যাংক অ্যাকাউন্টে আসে।',
      name: 'তানভীর আহমেদ',
      detail: 'বিনিয়োগকারী, ঢাকা',
    },
  },
  {
    en: {
      quote:
        'I put money into a retail rollout I can actually walk into. Payouts arrive in my City Bank account without me chasing anyone.',
      name: 'Farhana Yasmin',
      detail: 'Investor, Dhaka',
    },
    bn: {
      quote:
        'আমি এমন একটি খুচরা ব্যবসায় বিনিয়োগ করেছি, যার দোকানে নিজে গিয়ে দেখে আসতে পারি। কাউকে তাগাদা না দিয়েই মুনাফা আমার City Bank অ্যাকাউন্টে চলে আসে।',
      name: 'ফারহানা ইয়াসমিন',
      detail: 'বিনিয়োগকারী, ঢাকা',
    },
  },
];

export async function getProjects(locale: Locale): Promise<PublicProject[]> {
  return SAMPLE_PROJECTS.map((project) => ({
    ...project,
    name: project.name[locale],
    useOfFunds: project.useOfFunds[locale],
    documents: project.documents.map((document) => document[locale]),
  }));
}

export function getGroupCompanies(locale: Locale): GroupCompany[] {
  return GROUP_COMPANIES.map((company) => ({ ...company, sector: company.sector[locale] }));
}

export function getTestimonials(locale: Locale): Testimonial[] {
  return TESTIMONIALS.map((testimonial) => testimonial[locale]);
}

export function formatPeriods(
  periods: DisbursementPeriod[],
  labels: Dictionary['periods'],
): string {
  return periods.map((period) => labels[period]).join(labels.or);
}
