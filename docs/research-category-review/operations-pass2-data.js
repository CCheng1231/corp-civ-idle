/** Pass 2 — Operations: banner + 3 project cards × v1–v4. */
const OPERATIONS_PROJECTS = [
  { id: "branch_management", name: "Branch Management", slug: "operations-branch-management" },
  { id: "portfolio_management", name: "Portfolio Management", slug: "operations-portfolio-management" },
  { id: "massive_expansion", name: "Massive Expansion", slug: "operations-massive-expansion" },
];

function operationsPass2ProjectFile(slug, version) {
  return `research-${slug}-pass2-v${version}.jpg`;
}

const OPERATIONS_PASS2_SETS = [1, 2, 3, 4].map((version) => ({
  version,
  style:
    version <= 2
      ? `Set v${version} — grounded anime`
      : `Set v${version} — cinematic anime`,
  banner: {
    file: `research-operations-banner-pass2-v${version}.jpg`,
    title: `Operations banner v${version}`,
    note: "Three-pod operations wing strip.",
  },
  projects: OPERATIONS_PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    file: operationsPass2ProjectFile(p.slug, version),
    note: "Operations strategy pod.",
  })),
}));
