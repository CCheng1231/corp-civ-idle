const PAYOUTS_PASS2_SETS = [1, 2, 3, 4].map((version) => ({
  version,
  style: version <= 2 ? `Set v${version} — grounded anime` : `Set v${version} — cinematic anime`,
  banner: {
    file: `research-payouts-banner-pass2-v${version}.jpg`,
    title: `Project payouts banner v${version}`,
    note: "Payout / bid modeling wing.",
  },
  projects: [
    {
      id: "bid_modeling",
      name: "Bid Modeling",
      file: `research-bid-modeling-pass2-v${version}.jpg`,
      note: "Spreadsheet + tower bid desk.",
    },
  ],
}));
