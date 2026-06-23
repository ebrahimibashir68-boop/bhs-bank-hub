// Banking domain — mock data + country config. Simulation only.

export type CountryCode = "US" | "GB" | "EU" | "NG" | "IN" | "AE";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  currencySymbol: string;
  centralBank: string;
  flag: string; // emoji
  rails: string[]; // domestic payment rails
  intlRails: string[]; // international rails
  // Central-bank compliance hints (simulated)
  singleTxnLimit: number; // in local currency
  dailyLimit: number;
  kycRequired: string[];
  reportingThreshold: number; // amount above which CTR-style report is filed
  amlNotes: string;
  // Bill categories supported in this country
  billers: Biller[];
}

export interface Biller {
  id: string;
  name: string;
  category: "electricity" | "water" | "gas" | "internet" | "mobile" | "tv" | "tax";
  logo: string; // emoji
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    centralBank: "Federal Reserve System",
    flag: "🇺🇸",
    rails: ["ACH", "FedNow", "Wire", "Zelle"],
    intlRails: ["SWIFT", "Wise"],
    singleTxnLimit: 50_000,
    dailyLimit: 100_000,
    kycRequired: ["SSN", "Government ID", "Proof of address"],
    reportingThreshold: 10_000,
    amlNotes: "BSA/FinCEN CTR filed for cash transactions over $10,000.",
    billers: [
      { id: "us-conedison", name: "Con Edison", category: "electricity", logo: "⚡" },
      { id: "us-nyc-water", name: "NYC Water Board", category: "water", logo: "💧" },
      { id: "us-verizon", name: "Verizon Wireless", category: "mobile", logo: "📱" },
      { id: "us-comcast", name: "Comcast Xfinity", category: "internet", logo: "🌐" },
      { id: "us-irs", name: "IRS Tax Payment", category: "tax", logo: "🏛️" },
    ],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    centralBank: "Bank of England",
    flag: "🇬🇧",
    rails: ["Faster Payments", "BACS", "CHAPS"],
    intlRails: ["SWIFT", "SEPA"],
    singleTxnLimit: 25_000,
    dailyLimit: 100_000,
    kycRequired: ["Passport / Driving licence", "Proof of address"],
    reportingThreshold: 10_000,
    amlNotes: "FCA AML rules; suspicious activity reported to NCA.",
    billers: [
      { id: "gb-octopus", name: "Octopus Energy", category: "electricity", logo: "⚡" },
      { id: "gb-thames", name: "Thames Water", category: "water", logo: "💧" },
      { id: "gb-ee", name: "EE Mobile", category: "mobile", logo: "📱" },
      { id: "gb-bt", name: "BT Broadband", category: "internet", logo: "🌐" },
      { id: "gb-tvlicence", name: "TV Licence", category: "tv", logo: "📺" },
      { id: "gb-hmrc", name: "HMRC Tax", category: "tax", logo: "🏛️" },
    ],
  },
  EU: {
    code: "EU",
    name: "Eurozone",
    currency: "EUR",
    currencySymbol: "€",
    centralBank: "European Central Bank",
    flag: "🇪🇺",
    rails: ["SEPA Credit Transfer", "SEPA Instant", "TARGET2"],
    intlRails: ["SWIFT"],
    singleTxnLimit: 100_000,
    dailyLimit: 100_000,
    kycRequired: ["EU ID / Passport", "Proof of address"],
    reportingThreshold: 10_000,
    amlNotes: "PSD2 + 6AMLD; SEPA Instant capped at €100,000 per transfer.",
    billers: [
      { id: "eu-eon", name: "E.ON Energy", category: "electricity", logo: "⚡" },
      { id: "eu-orange", name: "Orange Mobile", category: "mobile", logo: "📱" },
      { id: "eu-vodafone", name: "Vodafone DE", category: "internet", logo: "🌐" },
      { id: "eu-gas", name: "EnBW Gas", category: "gas", logo: "🔥" },
    ],
  },
  NG: {
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    currencySymbol: "₦",
    centralBank: "Central Bank of Nigeria",
    flag: "🇳🇬",
    rails: ["NIBSS Instant Payment", "NEFT", "RTGS"],
    intlRails: ["SWIFT"],
    singleTxnLimit: 5_000_000,
    dailyLimit: 10_000_000,
    kycRequired: ["BVN", "NIN", "Proof of address"],
    reportingThreshold: 5_000_000,
    amlNotes: "CBN BVN-linked KYC; cash-out limits apply per tier.",
    billers: [
      { id: "ng-ekedc", name: "Eko Electricity (EKEDC)", category: "electricity", logo: "⚡" },
      { id: "ng-mtn", name: "MTN Airtime", category: "mobile", logo: "📱" },
      { id: "ng-glo", name: "Glo Data", category: "internet", logo: "🌐" },
      { id: "ng-dstv", name: "DStv", category: "tv", logo: "📺" },
      { id: "ng-firs", name: "FIRS Tax", category: "tax", logo: "🏛️" },
    ],
  },
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    centralBank: "Reserve Bank of India",
    flag: "🇮🇳",
    rails: ["UPI", "IMPS", "NEFT", "RTGS"],
    intlRails: ["SWIFT", "LRS"],
    singleTxnLimit: 200_000, // UPI per-txn
    dailyLimit: 1_000_000,
    kycRequired: ["Aadhaar", "PAN", "Proof of address"],
    reportingThreshold: 1_000_000,
    amlNotes: "RBI PMLA: LRS outward remittance capped at US$250,000 / FY.",
    billers: [
      { id: "in-jio", name: "Jio Recharge", category: "mobile", logo: "📱" },
      { id: "in-airtel", name: "Airtel Postpaid", category: "mobile", logo: "📱" },
      { id: "in-tata-power", name: "Tata Power", category: "electricity", logo: "⚡" },
      { id: "in-bsnl", name: "BSNL Broadband", category: "internet", logo: "🌐" },
      { id: "in-igl", name: "Indraprastha Gas", category: "gas", logo: "🔥" },
    ],
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "د.إ",
    centralBank: "Central Bank of the UAE",
    flag: "🇦🇪",
    rails: ["UAEFTS", "Aani Instant"],
    intlRails: ["SWIFT"],
    singleTxnLimit: 1_000_000,
    dailyLimit: 1_000_000,
    kycRequired: ["Emirates ID", "Passport", "Visa"],
    reportingThreshold: 55_000,
    amlNotes: "CBUAE AML rules; STR filed with goAML for suspicious activity.",
    billers: [
      { id: "ae-dewa", name: "DEWA (Dubai Electricity & Water)", category: "electricity", logo: "⚡" },
      { id: "ae-etisalat", name: "Etisalat Mobile", category: "mobile", logo: "📱" },
      { id: "ae-du", name: "du Home Internet", category: "internet", logo: "🌐" },
      { id: "ae-salik", name: "Salik Toll", category: "tax", logo: "🛣️" },
    ],
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

// FX rates relative to USD (mock, static)
export const FX_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  NGN: 1580,
  INR: 83.2,
  AED: 3.67,
  PI: 25, // 1 PI ≈ $25 (mock)
};

export function convert(amount: number, from: string, to: string): number {
  const usd = amount / (FX_USD[from] ?? 1);
  return usd * (FX_USD[to] ?? 1);
}

export function formatMoney(amount: number, currency: string): string {
  const symbol =
    currency === "USD" ? "$" :
    currency === "GBP" ? "£" :
    currency === "EUR" ? "€" :
    currency === "NGN" ? "₦" :
    currency === "INR" ? "₹" :
    currency === "AED" ? "د.إ " :
    currency === "PI"  ? "π " : "";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ───────── Account & ledger mock ─────────

export interface Account {
  id: string;
  country: CountryCode;
  type: "checking" | "savings" | "pi-wallet";
  name: string;
  number: string; // masked
  balance: number;
  currency: string;
}

export interface Txn {
  id: string;
  accountId: string;
  date: string; // ISO
  description: string;
  category: string;
  amount: number; // signed
  currency: string;
  status: "completed" | "pending" | "failed";
  channel?: string;
}

export const ACCOUNTS: Account[] = [
  { id: "a-us-chk", country: "US", type: "checking", name: "Everyday Checking",  number: "•• 4821", balance: 8_421.55, currency: "USD" },
  { id: "a-us-sav", country: "US", type: "savings",  name: "High-Yield Savings", number: "•• 9032", balance: 24_900.00, currency: "USD" },
  { id: "a-gb-chk", country: "GB", type: "checking", name: "UK Current Account", number: "•• 7741", balance: 3_120.00, currency: "GBP" },
  { id: "a-eu-chk", country: "EU", type: "checking", name: "EU SEPA Account",    number: "•• 5210", balance: 6_500.00, currency: "EUR" },
  { id: "a-ng-chk", country: "NG", type: "checking", name: "Naira Account",      number: "•• 0119", balance: 2_400_000, currency: "NGN" },
  { id: "a-in-chk", country: "IN", type: "checking", name: "UPI-Linked Savings", number: "•• 3380", balance: 142_300, currency: "INR" },
  { id: "a-ae-chk", country: "AE", type: "checking", name: "Dirham Current",     number: "•• 8800", balance: 18_400, currency: "AED" },
  { id: "a-pi-wal", country: "US", type: "pi-wallet", name: "Pi Wallet",         number: "GA7..PIE", balance: 1_842.50, currency: "PI" },
];

export const TXNS: Txn[] = [
  { id: "t1", accountId: "a-us-chk", date: "2026-06-22", description: "Whole Foods Market", category: "Groceries", amount: -84.21, currency: "USD", status: "completed", channel: "Card" },
  { id: "t2", accountId: "a-us-chk", date: "2026-06-22", description: "Payroll — Acme Inc", category: "Income",  amount:  4_200.00, currency: "USD", status: "completed", channel: "ACH" },
  { id: "t3", accountId: "a-us-chk", date: "2026-06-21", description: "Con Edison Bill",   category: "Utilities", amount:  -132.40, currency: "USD", status: "completed", channel: "Bill Pay" },
  { id: "t4", accountId: "a-us-sav", date: "2026-06-20", description: "Interest",          category: "Income",   amount:    18.92, currency: "USD", status: "completed" },
  { id: "t5", accountId: "a-gb-chk", date: "2026-06-22", description: "EE Mobile",         category: "Mobile",   amount:   -25.00, currency: "GBP", status: "completed", channel: "Faster Payments" },
  { id: "t6", accountId: "a-eu-chk", date: "2026-06-21", description: "SEPA Instant from Klaus", category: "Transfer", amount: 250.00, currency: "EUR", status: "completed" },
  { id: "t7", accountId: "a-ng-chk", date: "2026-06-22", description: "MTN Airtime",       category: "Mobile",   amount: -5_000, currency: "NGN", status: "completed", channel: "NIBSS" },
  { id: "t8", accountId: "a-in-chk", date: "2026-06-22", description: "Swiggy UPI",        category: "Food",     amount: -420, currency: "INR", status: "completed", channel: "UPI" },
  { id: "t9", accountId: "a-ae-chk", date: "2026-06-21", description: "DEWA Bill",         category: "Utilities", amount: -312, currency: "AED", status: "completed" },
  { id: "t10", accountId: "a-pi-wal", date: "2026-06-22", description: "Pi Mining Reward", category: "Income",   amount: 1.42,  currency: "PI",  status: "completed" },
  { id: "t11", accountId: "a-pi-wal", date: "2026-06-20", description: "Sent to @minerfriend", category: "Transfer", amount: -20.00, currency: "PI", status: "completed" },
];
