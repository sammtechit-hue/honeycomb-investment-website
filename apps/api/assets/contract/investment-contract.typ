// বিনিয়োগ চুক্তি — investment contract.
//
// Rendered by src/contract-pdf/contract-pdf.service.ts. Every variable value
// arrives as a plain string in sys.inputs.data (JSON) and is inserted as
// text, never parsed as markup, so investor data can't inject Typst code.
//
// The clauses below are the client's legal wording, transcribed verbatim
// from their contract (including its spellings). Don't edit them without
// the client's sign-off.

#let data = json(bytes(sys.inputs.data))
#let company = data.company

#let dark = rgb("#2b2b2b")
#let on-dark = white

#set document(title: "বিনিয়োগ চুক্তি", author: "TAHAMS")
#set text(font: "Hind Siliguri", fallback: false, lang: "bn", hyphenate: false, size: 11.5pt)
#set par(leading: 0.75em, spacing: 1.15em)

#let header-bar = rect(width: 100%, height: 2.6cm, fill: dark, inset: (x: 1.6cm, y: 0.45cm))[
  #set text(fill: on-dark)
  #grid(
    columns: (1fr, auto),
    align: (left + horizon, left + horizon),
    if company.logo != "" {
      image(company.logo, height: 1.7cm)
    } else {
      stack(
        spacing: 0.25cm,
        text(size: 28pt, weight: "bold", tracking: 2pt, company.name),
        text(size: 9pt, style: "italic", company.tagline),
      )
    },
    stack(
      spacing: 0.22cm,
      text(size: 10pt)[Address: #company.address],
      text(size: 10pt)[Phone: #company.phone #h(0.8em) Email: #company.email],
    ),
  )
]

#let footer-bar = rect(width: 100%, height: 1.5cm, fill: dark, inset: (x: 1.6cm))[
  #set text(fill: on-dark, size: 10pt)
  #align(horizon, grid(
    columns: (1fr, 1fr, 1fr),
    align: (left, center, right),
    company.website, company.facebook, company.instagram,
  ))
]

#set page(
  paper: "a4",
  margin: (top: 3.5cm, bottom: 2.5cm, x: 2.2cm),
  background: {
    place(top, header-bar)
    place(center + horizon, text(size: 110pt, weight: "bold", fill: luma(244), tracking: 6pt, company.name))
    place(bottom, footer-bar)
  },
)

// Parties are passed with every field present ("" when unknown), so a
// blank line prints exactly like the client's paper contract.
#let party(title, person, signature: "", relation: false) = block(breakable: false, width: 100%)[
  #box(width: 100%, height: 1.1cm, if signature != "" {
    align(bottom + left, image(signature, height: 1.05cm))
  })
  #v(-0.35em)
  #text(weight: "bold", title) \
  নাম: #person.name \
  জাতীয় পরিচয়পত্র নাম্বার: #person.nid \
  ফোন নাম্বার: #person.phone
  #if relation [ \ সম্পর্ক: #person.relation ]
]

#align(center, text(size: 14pt, weight: "bold", underline(offset: 3pt)[বিনিয়োগ চুক্তি]))
#v(0.6em)

#grid(
  columns: (5cm, 1fr),
  row-gutter: 0.75em,
  [চুক্তির উদ্দেশ্য:], [তাহামস-এর (লাইসেন্স নং #company.licenceNo) \ ব্যবসা সম্প্রসারনের জন্য],
  [বিনিয়োগ চুক্তির তারিখ:], data.agreement.date,
  [বিনিয়োগ চুক্তির সময়:], data.agreement.time,
  [বিনিয়োগ চুক্তির স্থান:], text(weight: "bold", data.agreement.place),
)

#v(0.8em)
#block(spacing: 0.5em, text(weight: "bold")[
  Investment Amount: #data.investment.amount tk \
  Investment Amount In words: #data.investment.amountInWords \
  Return of Investment (ROI): #data.investment.roi \
  Investment Period: #data.investment.period
])

#v(0.6em)
#align(center, text(size: 12.5pt, weight: "bold")[\*\*\* #data.investment.payoutFrequency বিনিয়োগকারীকে ROI পরিশোধ করা হবে। \*\*\*])
#v(0.4em)

১। চুক্তি ভাঙতে চাইলে, উভয়পক্ষকে 150 দিন আগে জানাতে হবে এবং সে চুক্তির মেয়াদ ১ বছর পর্যন্ত বাড়াতে পারবে। \*\*\* 2,00,000 টাকা পর্যন্ত উত্তোলনের জন্য ৪০ দিন আগে নোটিশ দিতে হবে; এর বেশি হলে প্রতি অতিরিক্ত 1,00,000 টাকা (বা তার অংশ) এর জন্য আরও ২০ দিন।

২। যে Investment করছেন কোম্পানির সাথে, এটা কোনো Loan হিসেবে দিচ্ছেন না, সরাসরি একটা Product/ Project এ Invest করছেন, যেখানে একইভাবে কোম্পানিও তার অংশ Invest করেছে এবং দুই পক্ষ মিলে Profit ভাগ করে নিচ্ছে।

ব্যবসার স্বাভাবিক কার্যক্রমের ফলে সৃষ্ট কোনো ক্ষতির জন্য বিনিয়োগকারী দায়ী থাকবেন না এবং উদ্যোক্তা বিনিয়োগকারীর মূলধন বা Investment ফেরত দিতে বাধ্য থাকবেন। তবে বড় ধরনের অগ্নিকাণ্ড, প্রাকৃতিক দুর্যোগ বা অন্য কোনো অনিয়ন্ত্রিত কারণে ব্যবসার সকল বা অধিকাংশ সম্পদ বিনষ্ট হয়ে ব্যবসা পরিচালনা স্থায়ীভাবে অসম্ভব হয়ে পড়লে, উভয় পক্ষ প্রকৃত ক্ষতি ন্যায্যভাবে ভাগাভাগি করবেন

আমরা কখনোই বলি না আমাদের বিজনেসে 100% Risk নেই, তবে আমরা সর্বোচ্চ সতর্ক থাকি, আমাদের Warehouse, Office & Outlet সারাক্ষণ CCTV Coverage এ থাকে। এছাড়া Warehouse গুলো আলাদা আলাদা Building এ setup করা, যাতে একটায় কোনো Problem হলে আর একটা দিয়ে Backup দিতে পারি। পাশাপাশি পুরো সিস্টেমে Fire Extinguisher এবং Insurance সুবিধা রয়েছে।

৩। চুক্তির শেষ মাসে মূল টাকা এবং ROI একসাথে দেওয়া হবে।

৪। এই চুক্তিপত্রের সাথে বিনিয়োগকারীর এবং বিনিয়োগ গ্রহণকারীর জাতীয় পরিচয়পত্র থাকবে।

// Page 2 opens with clause ৫, as on the client's paper contract, so the
// signatures always share a page with clause text and a signature page
// can't be lifted onto a different contract.
#pagebreak(weak: true)

৫। বিনিয়োগ চুক্তি বিনিয়োগকারীর এবং বিনিয়োগ গ্রহণকারীর উভয় পক্ষের কাছে Original কপি থাকবে।

৬। চুক্তি অনুযায়ী, যেসকল বিনিয়োগকারীর নিকট কোম্পানির ব্যাংক Cheque সংরক্ষিত রয়েছে, তারা চুক্তি বাতিলের সময় কোম্পানিকে উক্ত Cheque ফেরত প্রদান সাপেক্ষে তাদের মূল Investment এর টাকা বুঝে নিতে পারবেন।

৭। নমিনি টাকা উত্তোলনের ক্ষেত্রে বিনিয়োগের মেয়াদ শেষে মূল টাকা উত্তোলনের জন্য প্রয়োজনীয় কাগজপত্র জমা দিতে পারবেন।

৮। বিনিয়োগ চুক্তি বিনিয়োগকারীর এবং বিনিয়োগ গ্রহণকারীর উভয় পক্ষের কাছে Money Transaction প্রমাণ (Bank Transaction, Deposit Slip, Cash Slip) ইত্যাদির ছবি, রাখতে হবে চুক্তি সম্পন্ন হওয়ার আগ পর্যন্ত।

৯। এই চুক্তিপত্রে ও কোনো শর্ত অমান্য করিলে যে কোনো পক্ষ আইনানুগ ব্যবস্থা নিতে পারবেন।

// The last clause and the signatures form one unbreakable block: however
// long the names get, the signatures never land on a page by themselves.
// The two page markers let the renderer verify that on every contract.
#block(breakable: false)[
#context [#metadata(here().page()) <clause-10-page>]
১০। বিনিয়োগ গ্রহণকারীর অবর্তমানে গ্যারান্টর সমস্ত দায়ভার বহন করবে।

#v(0.6em)
#grid(
  columns: (1fr, 1fr),
  column-gutter: 1cm,
  row-gutter: 0.6cm,
  party([বিনিয়োগকারীর স্বাক্ষর:], data.investor), [],
  party([গ্যারান্টর স্বাক্ষর:], data.investorGuarantor, relation: true),
  party([বিনিয়োগ গ্রহণকারীর স্বাক্ষর:], data.receiver, signature: data.receiver.signature),
  party([নমিনির স্বাক্ষর:], data.nominee, relation: true),
  party([গ্যারান্টর স্বাক্ষর:], data.receiverGuarantor, signature: data.receiverGuarantor.signature, relation: true),
)
#context [#metadata(here().page()) <signatures-end-page>]
]
