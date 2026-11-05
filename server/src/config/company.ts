/**
 * The legal entity behind the ZuriLofts brand, as it must appear on a document
 * a guest may keep, file or show to a tax authority.
 *
 * This lives in config rather than inside the receipt service because the same
 * facts appear on the terms page, the footer and any future tax document: one
 * edit here changes every place that names the company.
 *
 * Nothing secret belongs here. A receipt is handed to a guest, so every field
 * is either public already or deliberately blank.
 */

/**
 * 'none' makes no VAT statement at all. 'inclusive' is the single switch that
 * turns the VAT line and the VAT number on.
 */
export type VatMode = 'none' | 'inclusive';

export interface CompanyProfile {
  /** The registered company a guest is actually contracting with. */
  legalName: string;
  /** The brand name traded over the top of it. */
  tradingName: string;
  supportEmail: string;
  /** Where people send data protection requests; named in the privacy policy and in regulator notices. */
  privacyEmail: string;
  website: string;
  /** Company registration number (CR12). Empty until confirmed, see below. */
  registrationNumber: string;
  /** Registered office address. Empty until confirmed, see below. */
  registeredAddress: string;
  vatMode: VatMode;
  /** KRA PIN used for VAT, when registered. Empty while vatMode is 'none'. */
  vatNumber: string;
  /** Kenyan standard VAT rate as a percentage. */
  vatRate: number;
}

export const company: CompanyProfile = {
  legalName: 'BeneAlpha Consulting Limited',
  tradingName: 'ZuriLofts',
  supportEmail: 'enquires@zurilofts.com',
  privacyEmail: 'privacy@zurilofts.com',
  website: 'thezurilofts.com',
  // Intentionally empty. A company registration number or registered office
  // that was guessed and then printed on a financial document is a worse
  // misstatement than a document that leaves the line out, because it asserts
  // a false fact about a real legal person. Each line prints only once the
  // real value is known, so filling these in is the whole job.
  registrationNumber: '',
  registeredAddress: '',
  // Whether a Kenyan business must register for VAT is the accountant's
  // decision, not a code decision, and it depends on turnover and on how
  // accommodation is treated. Until that is answered the receipt states
  // nothing about VAT, which is correct for a supplier that is not registered -
  // a missing VAT line is honest, an invented one is not. Setting this to
  // 'inclusive' (with vatNumber filled in) is the only change needed to start
  // showing VAT; the calculation is already in receipt.service.ts.
  vatMode: 'none',
  vatNumber: '',
  // Kenya's standard VAT rate, 16%. The Act allows a zero rate on some
  // supplies, but nothing here claims one.
  vatRate: 16,
};
