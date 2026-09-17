/**
 * Public ORUK v3 feeds that Navigator probes for interoperability reporting.
 *
 * Probing reads a feed's own published metadata and a small sample of records to report what
 * the feed supports. It never stores or republishes another publisher's service records, so it
 * stays inside the licensing boundary recorded in `docs/research/licensing.md`.
 *
 * Base URLs come from the official Open Referral UK feed directory:
 * https://openreferraluk.org/community/directory
 */
export type KnownFeed = {
  key: string;
  publisher: string;
  baseUrl: string;
  note: string;
};

export const knownFeeds: readonly KnownFeed[] = [
  {
    key: "oruk-navigator",
    publisher: "ORUK Navigator (this pilot)",
    baseUrl: "https://oruk-navigator.vercel.app/api/oruk/v3",
    note: "Reviewed Tameside Council pages republished as ORUK v3 data.",
  },
  {
    key: "shropshire",
    publisher: "Shropshire Council",
    baseUrl: "https://shropshire.openplace.directory/o/OpenReferralService/v3",
    note: "Directory-listed live council feed.",
  },
  {
    key: "bristol",
    publisher: "Bristol Council",
    baseUrl: "https://bristol.openplace.directory/o/OpenReferralService/v3",
    note: "Directory-listed live council feed.",
  },
  {
    key: "dorset",
    publisher: "Community Action Network, Dorset",
    baseUrl: "https://dorset.localplacedirectory.org.uk/aggregator",
    note: "Directory-listed voluntary and community sector aggregator.",
  },
] as const;
