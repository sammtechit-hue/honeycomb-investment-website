import type { Locale } from './i18n/config';
import type { InvestmentType } from './roi';
import { API_BASE_URL, isShowDemo } from './site';

// Shape of a public project listing.
//
// The Project model and GET /api/project don't carry these fields yet:
// investment type lives on Investment, and there is no company, term,
// use-of-funds or document list on Project at all. Payout frequency is
// deliberately absent: it is not a project term (client, 2026-10-12). Until
// the API is extended, getProjects() returns the SAMPLE data below. When it
// is, replace only the body of getProjects() — the page renders from this
// type and nothing else.
//
// Free text (name, use of funds, documents, sectors, quotes) is needed in
// both English and Bengali, so the API will have to store and return both;
// the samples below show the shape as Localized<string>.
//
// Values reuse the Prisma enum spellings (InvestmentType) so mapping the API
// response later is a straight copy.

export type ProjectStatus = 'OPEN' | 'FULL' | 'PAUSED' | 'COMPLETED';

export type PublicProject = {
  id: string;
  name: string;
  company: string;
  status: ProjectStatus;
  minimumInvestment: number;
  investmentType: InvestmentType;
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
    termMonths: 24,
    useOfFunds: {
      en: 'Fit-out and opening stock for new brick-and-mortar outlets in Dhaka.',
      bn: 'ঢাকায় নতুন দোকানের সাজসজ্জা ও প্রাথমিক পণ্য মজুত।',
    },
    documents: [DOC.summary, DOC.shareholderAgreement],
  },
  {
    id: 'sammtech-infrastructure',
    name: { en: 'Server infrastructure procurement', bn: 'সার্ভার অবকাঠামো ক্রয়' },
    company: 'SammTech',
    status: 'OPEN',
    minimumInvestment: 500_000,
    investmentType: 'unfixed',
    termMonths: 36,
    useOfFunds: {
      en: 'Server hardware and delivery-team capacity for offshore client contracts.',
      bn: 'বিদেশি ক্লায়েন্টের চুক্তির জন্য সার্ভার হার্ডওয়্যার ও ডেলিভারি টিমের সক্ষমতা।',
    },
    documents: [DOC.summary, DOC.shareholderAgreement],
  },
  {
    id: 'mars-tile-showroom',
    name: { en: 'Tile showroom and stock', bn: 'টাইলস শোরুম ও পণ্য মজুত' },
    company: 'Mars Tile',
    status: 'OPEN',
    minimumInvestment: 300_000,
    investmentType: 'fixed',
    termMonths: 18,
    useOfFunds: {
      en: 'Showroom lease, fit-out and opening tile stock.',
      bn: 'শোরুম লিজ, সাজসজ্জা ও প্রাথমিক টাইলস মজুত।',
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
  if (isShowDemo()) {
    return SAMPLE_PROJECTS.map((project) => ({
      ...project,
      name: project.name[locale],
      useOfFunds: project.useOfFunds[locale],
      documents: project.documents.map((document) => document[locale]),
    }));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/project?isVisible=true&limit=20`, {
      next: { revalidate: 60, tags: ['projects'] },
    });

    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data;

      if (Array.isArray(list) && list.length > 0) {
        return list.map((raw) => {
          const item = raw as Record<string, unknown>;
          const nameObj = item.name as Record<string, string> | null | undefined;
          const name =
            typeof item.name === 'object' && item.name
              ? (nameObj?.[locale] ?? nameObj?.en ?? Object.values(nameObj ?? {})[0])
              : String(item.name ?? '');

          const descObj = (item.description ?? item.useOfFunds) as
            | Record<string, string>
            | null
            | undefined;
          const useOfFunds =
            typeof item.description === 'object' && item.description
              ? (descObj?.[locale] ?? descObj?.en ?? Object.values(descObj ?? {})[0])
              : typeof item.useOfFunds === 'object' && item.useOfFunds
                ? (descObj?.[locale] ?? descObj?.en ?? Object.values(descObj ?? {})[0])
                : String(item.description ?? item.useOfFunds ?? '');

          const docs: string[] = Array.isArray(item.documents)
            ? (item.documents as unknown[]).map((doc) => {
                const docObj = doc as Record<string, string> | null | undefined;
                return typeof doc === 'object' && doc
                  ? (docObj?.[locale] ?? docObj?.en ?? Object.values(docObj ?? {})[0] ?? '')
                  : String(doc ?? '');
              })
            : [locale === 'bn' ? 'প্রকল্পের সারসংক্ষেপ' : 'Project summary'];

          return {
            id: String(item.id),
            name: name || (locale === 'bn' ? 'প্রকল্প' : 'Project'),
            company: String(item.company ?? 'HoneyComb'),
            status: (item.status ?? 'OPEN') as ProjectStatus,
            minimumInvestment: Number(item.minimumInvestment) || 10_000,
            investmentType: (item.investmentType === 'fixed' ? 'fixed' : 'unfixed') as InvestmentType,
            termMonths: Number(item.termMonths) || 24,
            useOfFunds,
            documents: docs,
          };
        });
      }
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic projects from API, using sample data:', error);
  }

  return SAMPLE_PROJECTS.map((project) => ({
    ...project,
    name: project.name[locale],
    useOfFunds: project.useOfFunds[locale],
    documents: project.documents.map((document) => document[locale]),
  }));
}

export async function getGroupCompanies(locale: Locale): Promise<GroupCompany[]> {
  if (isShowDemo()) {
    return GROUP_COMPANIES.map((company) => ({ ...company, sector: company.sector[locale] }));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/group-companies`, {
      next: { revalidate: 86400, tags: ['companies'] },
    });

    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data;

      if (Array.isArray(list) && list.length > 0) {
        return list.map((raw) => {
          const company = raw as Record<string, unknown>;
          const sectorObj = company.sector as Record<string, string> | null | undefined;
          return {
            name: String(company.name),
            sector:
              typeof company.sector === 'object' && company.sector
                ? (sectorObj?.[locale] ?? sectorObj?.en ?? Object.values(sectorObj ?? {})[0] ?? '')
                : String(company.sector ?? ''),
            operatingSince: Number(company.operatingSince) || 2020,
          };
        });
      }
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic companies from API, using sample data:', error);
  }

  return GROUP_COMPANIES.map((company) => ({ ...company, sector: company.sector[locale] }));
}

export async function getTestimonials(locale: Locale): Promise<Testimonial[]> {
  if (isShowDemo()) {
    return TESTIMONIALS.map((testimonial) => testimonial[locale]);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/testimonials`, {
      next: { revalidate: 86400, tags: ['testimonials'] },
    });

    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data;

      if (Array.isArray(list) && list.length > 0) {
        return list.map((raw) => {
          const item = raw as Record<string, unknown>;
          const quoteObj = item.quote as Record<string, string> | null | undefined;
          const nameObj = item.name as Record<string, string> | null | undefined;
          const detailObj = item.detail as Record<string, string> | null | undefined;
          return {
            quote:
              typeof item.quote === 'object' && item.quote
                ? (quoteObj?.[locale] ?? quoteObj?.en ?? Object.values(quoteObj ?? {})[0] ?? '')
                : String(item.quote ?? ''),
            name:
              typeof item.name === 'object' && item.name
                ? (nameObj?.[locale] ?? nameObj?.en ?? Object.values(nameObj ?? {})[0] ?? '')
                : String(item.name ?? ''),
            detail:
              typeof item.detail === 'object' && item.detail
                ? (detailObj?.[locale] ?? detailObj?.en ?? Object.values(detailObj ?? {})[0] ?? '')
                : String(item.detail ?? ''),
          };
        });
      }
    }
  } catch (error) {
    console.warn('Failed to fetch dynamic testimonials from API, using sample data:', error);
  }

  return TESTIMONIALS.map((testimonial) => testimonial[locale]);
}
