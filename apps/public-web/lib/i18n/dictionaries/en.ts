// English copy for public-web. This file defines the Dictionary type, so
// bn.ts fails to compile if it is missing any key added here.
//
// {name} placeholders are filled with fill() from lib/i18n/format.ts, using
// already-formatted values (formatted numbers differ per language).

export const en = {
  meta: {
    title: 'HoneyComb Inc. — Become an Investor',
    description:
      "Put money into projects run by HoneyComb Inc.'s operating companies. Profit is calculated monthly on your original amount and paid by direct bank transfer.",
    legalTitle: 'Legal and risk information — HoneyComb Inc.',
  },

  units: {
    year: '{n} year',
    years: '{n} years',
    months: '{n} months',
  },

  nav: {
    main: 'Main',
    projects: 'Projects',
    howItWorks: 'How it works',
    methodology: 'How returns work',
    faq: 'FAQ',
    signIn: 'Sign in',
    calculate: 'Calculate return',
    getStarted: 'Get started',
    switchLanguage: 'Language',
  },

  hero: {
    eyebrow: 'HoneyComb Inc. · Investor programme',
    title: 'Become an Investor in our own projects',
    intro:
      'Put money into a specific project run by one of our operating companies. Profit is worked out each month on your original amount and paid straight to your bank account.',
    points: [
      'Profit on your original amount every month, never compounded',
      'Paid by direct bank transfer, with no payment-gateway fees',
      'Every monthly rate is kept on record so you can check the maths',
    ],
    browse: 'Browse projects',
    howItWorks: 'How it works',
  },

  steps: {
    title: 'How it works',
    items: [
      {
        title: 'Register and verify',
        body: 'Create an account, then upload your NID, a photo and your trade licence, and add your bank details.',
      },
      {
        title: 'Choose a project and pay',
        body: 'Pick a project and pay by bKash or bank transfer, in instalments if you need to. We confirm every payment.',
      },
      {
        title: 'Profit is worked out monthly',
        body: "Each month, that month's rate is applied to your original amount. Every rate is kept on record.",
      },
      {
        title: 'Paid to your bank',
        body: 'Monthly, quarterly or yearly, by direct bank transfer. We tell you when your payment has been sent.',
      },
    ],
  },

  projects: {
    title: 'Open projects',
    intro: 'Each listing is one project. Your money goes into that project only.',
  },

  methodology: {
    title: 'How returns are calculated',
    formula: "Monthly profit = original amount × that month's rate",
    noCompounding: {
      lead: 'No compounding.',
      body: 'Profit is always worked out on the amount you originally put in. It is never added back to that amount.',
    },
    types: {
      lead: 'Two investment types.',
      body: "Fixed projects use a set monthly rate of about {fixedRate}, which HoneyComb can adjust. Variable projects have a rate set each month between {minRate} and {maxRate}, which can change from month to month. Every month's rate is stored, so past months always stay exactly as calculated.",
    },
    sums: {
      lead: 'Quarterly and yearly payouts are sums.',
      body: 'Each month is calculated separately and the months are added together at payout time. No averaged rate is used.',
    },
    bank: {
      lead: 'Direct bank disbursement.',
      body: 'Payouts are sent as bank transfers (City Bank to City Bank, or BEFTN), not through a payment gateway, so no gateway fee is deducted.',
    },
    exampleCaption: 'Example: one quarterly payout on {amount} (variable type)',
    month: 'Month',
    rate: 'Rate',
    profit: 'Profit',
    total: 'Quarterly payout (sum)',
    exampleNote: 'Illustrative rates. Actual rates are set each month.',
  },

  companies: {
    title: 'Who runs the projects',
    intro: 'Every project belongs to an operating company within HoneyComb Inc.',
    since: 'Since {year}',
  },

  faq: {
    title: 'Questions',
    items: [
      {
        question: 'What does it mean to be an Investor?',
        answer:
          "You put money into one specific project run by a HoneyComb Inc. operating company, and receive a share of profit on that amount. HoneyComb doesn't pool or manage funds on your behalf.",
      },
      {
        question: 'Is the return guaranteed?',
        answer:
          'No. The calculator shows projections. Fixed-type projects use a set monthly rate (around {fixedRate}) that HoneyComb can adjust. Variable-type rates are set each month between {minRate} and {maxRate} and can change. Your shareholder agreement sets out the exact terms.',
      },
      {
        question: 'Can I add more money later?',
        answer:
          'Yes. You can top up the same project at any time. Each top-up is recorded separately with its own date, so profit on it starts from the right month.',
      },
      {
        question: 'Can I withdraw my money?',
        answer:
          "Yes. You can request up to {withdrawalLimit} per withdrawal with one month's notice. Each request is approved by our team and paid by bank transfer.",
      },
      {
        question: 'How are payouts sent?',
        answer:
          "By direct bank transfer: City Bank to City Bank, or BEFTN for every other bank. We don't use a payment gateway, so no gateway fees are taken from your profit.",
      },
    ],
  },

  disclaimer: {
    heading: 'About these figures',
    body: 'Returns shown on this site, including the calculator and project listings, are projections and not guaranteed. Actual profit depends on the rate in effect each month and the terms of your shareholder agreement. Variable rates are set monthly and can change.',
    methodology: 'Calculation methodology',
    risk: 'Risk disclosure',
    terms: 'Terms of participation',
  },

  footer: {
    about:
      'HoneyComb Inc. brings Investors into projects run by its own operating companies. It is not a fund manager.',
    platform: 'Platform',
    legal: 'Legal',
    projects: 'Projects',
    howItWorks: 'How it works',
    calculator: 'ROI calculator',
    faq: 'FAQ',
    methodology: 'Calculation methodology',
    risk: 'Risk disclosure',
    terms: 'Terms of participation',
    privacy: 'Privacy',
    copyright: '© {year} HoneyComb Inc. Figures shown on this site are projections, not guaranteed returns.',
  },

  periods: {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half-yearly',
    yearly: 'Yearly',
    or: ' or ',
  },

  projectCard: {
    status: {
      OPEN: 'Open',
      FULL: 'Fully funded',
      PAUSED: 'Paused',
      COMPLETED: 'Completed',
    },
    fixed: 'Fixed · {rate} / month',
    variable: 'Variable · {minRate}–{maxRate} / month',
    minimum: 'Minimum amount',
    type: 'Investment type',
    frequency: 'Payout frequency',
    term: 'Term',
    useOfFunds: 'Use of funds',
    documents: 'Documents',
    documentsNote: 'Shared with registered Investors.',
    calculate: 'Calculate return',
    getStarted: 'Get started',
  },

  calculator: {
    title: 'ROI calculator',
    intro: 'See a projection of your returns. No account needed.',
    amount: 'Amount to invest',
    amountRequired: 'Enter the amount you would like to put in.',
    amountTooLarge: 'The calculator accepts up to {max}.',
    type: 'Investment type',
    fixed: 'Fixed',
    variable: 'Variable',
    perMonth: '{rate} / month',
    term: 'Term',
    frequency: 'Payout frequency',
    frequencyOptions: {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    },
    invalidAmount: 'Enter a valid amount to see your projection.',
    lockedTitle: 'See your projected returns',
    lockedBody: 'Enter your name and mobile number to see the full breakdown. Email is optional.',
    perPayout: {
      monthly: 'Projected profit per monthly payout',
      quarterly: 'Projected profit per quarterly payout',
      yearly: 'Projected profit per yearly payout',
    },
    notGuaranteed: 'Projection, not a guaranteed amount.',
    rateApplied: 'Rate applied',
    ratePerMonth: '{rate} per month',
    profitPerMonth: 'Projected profit per month',
    profitOverTerm: 'Projected profit over {term}',
    originalAmount: 'Your original amount',
    fullCalculation: 'Full calculation',
    eachMonth: 'Each month:',
    eachPayout: {
      monthly: 'Each monthly payout:',
      quarterly: 'Each quarterly payout:',
      yearly: 'Each yearly payout:',
    },
    payoutSum: 'the {count} monthly amounts are added together = {total}',
    overTerm: 'Over {term}:',
    termSum: '{count} monthly amounts = {total}',
    noCompounding:
      'Profit is always worked out on your original {amount}. It is never added back in, so there is no compounding.',
    variableNote:
      'Variable rates are set each month between {minRate} and {maxRate} and can change from month to month, so your actual payouts will vary within this range.',
    disclaimer:
      'These figures are projections, not guaranteed returns. Actual profit depends on the rate in effect each month and the terms of your shareholder agreement.',
    methodologyLink: 'How returns are calculated',
    legalLink: 'Legal and risk information',
    cta: 'Become an Investor',
  },

  lead: {
    name: 'Full name',
    phone: 'Mobile number',
    email: 'Email',
    optional: '(optional)',
    errors: {
      name: 'Enter your full name (2 to 50 characters).',
      phoneNumber: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.',
      email: 'Enter a valid email address, or leave this empty.',
    },
    submitting: 'Preparing your projection…',
    submit: 'Show my projection',
    privacy: 'We use these details only to follow up about HoneyComb projects. No account is created.',
  },

  // Messages returned by the submitRoiLead server action.
  leadAction: {
    checkFields: 'Please check the highlighted fields.',
    saveFailed: "We couldn't save your details. Please try again.",
    unreachable: "We couldn't reach our server. Please try again in a moment.",
    success: 'Thanks — your projection is ready.',
  },

  legal: {
    back: '← Back to home',
    title: 'Legal and risk information',
    noticeBefore:
      'The full documents are being finalised with our legal adviser. The key points are summarised below. For how profit is worked out, see the ',
    noticeLink: 'calculation methodology',
    noticeAfter: '.',
    sections: [
      {
        id: 'risk',
        title: 'Risk disclosure',
        points: [
          'Figures from the ROI calculator and project listings are projections, not guaranteed returns.',
          'Variable-type projects have a rate set each month between {minRate} and {maxRate}, which can change from month to month. Fixed-type rates can be adjusted by HoneyComb.',
          'Profit depends on the rate in effect each month and the terms of your shareholder agreement.',
        ],
      },
      {
        id: 'terms',
        title: 'Terms of participation',
        points: [
          'Each investment is tied to one specific project run by a HoneyComb Inc. operating company.',
          "Withdrawals are limited to {withdrawalLimit} per request and need one month's notice. Each request is approved by HoneyComb.",
          'Your shareholder agreement is the binding document and takes precedence over anything on this website.',
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy',
        points: [
          'Details entered in the ROI calculator (name, mobile number and optional email) are used only to follow up with you about HoneyComb projects.',
          'Verification documents and bank details are stored encrypted on our secure server and are never shared through public links.',
        ],
      },
    ],
  },
};

export type Dictionary = typeof en;
