/** Pass 2 — Discover structures: banner + 5 project cards × v1–v4. */
const DISCOVER_STRUCTURES_PROJECTS = [
  { id: "discover_video_studio", name: "Discover: Video production studio", slug: "discover-video-studio" },
  { id: "discover_press_room", name: "Discover: Press Room", slug: "discover-press-room" },
  { id: "discover_company_statue", name: "Discover: Company Statue", slug: "discover-company-statue" },
  { id: "discover_electricity_generator", name: "Discover: Electricity Generator", slug: "discover-electricity-generator" },
  { id: "discover_mit_room", name: "Discover: MIT room", slug: "discover-mit-room" },
];

function discoverPass2ProjectFile(slug, version) {
  return `research-${slug}-pass2-v${version}.jpg`;
}

const DISCOVER_STRUCTURES_PASS2_SETS = [1, 2, 3, 4].map((version) => ({
  version,
  style:
    version <= 2
      ? `Set v${version} — grounded anime`
      : `Set v${version} — cinematic anime`,
  banner: {
    file: `research-discover-banner-pass2-v${version}.jpg`,
    title: `Discover structures banner v${version}`,
    note: "Five-pod scouting wing strip.",
  },
  projects: DISCOVER_STRUCTURES_PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    file: discoverPass2ProjectFile(p.slug, version),
    note: "Site-plan scouting pod.",
  })),
}));
