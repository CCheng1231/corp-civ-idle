/** Pass 2 — Resource efficiency: banner + 7 project cards × v1–v4. */
const RESOURCES_EFFICIENCY_PROJECTS = [
  { id: "eff_manuals_cash", name: "Efficiency Manuals for $", slug: "eff-manuals-cash" },
  { id: "eff_manuals_sup", name: "Efficiency Manuals for SUP", slug: "eff-manuals-sup" },
  { id: "eff_manuals_con", name: "Efficiency Manuals for CON", slug: "eff-manuals-con" },
  { id: "eff_manuals_mood", name: "Efficiency Manuals for Mood", slug: "eff-manuals-mood" },
  { id: "eff_manuals_rep", name: "Efficiency Manuals REP", slug: "eff-manuals-rep" },
  { id: "eff_manuals_grep", name: "Efficiency Manuals GREP", slug: "eff-manuals-grep" },
  { id: "planning_ahead", name: "Planning ahead", slug: "planning-ahead" },
];

function resourcesPass2ProjectFile(slug, version) {
  return `research-${slug}-pass2-v${version}.jpg`;
}

const RESOURCES_EFFICIENCY_PASS2_SETS = [1, 2, 3, 4].map((version) => ({
  version,
  style:
    version <= 2
      ? `Set v${version} — grounded anime`
      : `Set v${version} — cinematic anime`,
  banner: {
    file: `research-resources-banner-pass2-v${version}.jpg`,
    title: `Category banner v${version}`,
    note: "Resource efficiency strip.",
  },
  projects: RESOURCES_EFFICIENCY_PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    file: resourcesPass2ProjectFile(p.slug, version),
    note:
      p.id === "planning_ahead"
        ? "Forecast room · distinct layout."
        : "Manual nook · resource accent.",
  })),
}));
