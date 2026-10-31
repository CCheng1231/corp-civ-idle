/** Pass 1 — four variants per banner + structure (drop JPGs in images/departments/pass1/). */
const DEPARTMENTS_PASS1_BANNERS = [
  {
    file: "departments-banner-pass1-v1.jpg",
    title: "Banner v1 — floor cutaway",
    note: "Five department pods on one isometric tile.",
  },
  {
    file: "departments-banner-pass1-v2.jpg",
    title: "Banner v2 — wing module",
    note: "Terrace overview, media wing emphasis.",
  },
  {
    file: "departments-banner-pass1-v3.jpg",
    title: "Banner v3 — soft pastel diorama",
    note: "Softer light, essentials palette match.",
  },
];

const DEPARTMENTS_PASS1_STRUCTURES = [
  {
    id: "dept_b2b",
    name: "Department of B2B",
    hint: "BD table / network focal — no readable charts.",
    variants: [
      { file: "departments-dept-b2b-pass1-v1.jpg", title: "v1 close table", note: "Meeting table hero." },
      { file: "departments-dept-b2b-pass1-v2.jpg", title: "v2 wide floor", note: "Pull-back pod." },
      { file: "departments-dept-b2b-pass1-v3.jpg", title: "v3 holo rings", note: "Abstract connection arcs." },
      { file: "departments-dept-b2b-pass1-v4.jpg", title: "v4 minimal", note: "Negative space." },
    ],
  },
  {
    id: "break_room",
    name: "Break room",
    hint: "Couch + coffee — mood read.",
    variants: [
      { file: "departments-break-room-pass1-v1.jpg", title: "v1 couch close", note: "Warm nook." },
      { file: "departments-break-room-pass1-v2.jpg", title: "v2 wide lounge", note: "Vending + plants." },
      { file: "departments-break-room-pass1-v3.jpg", title: "v3 low angle", note: "Coffee table hero." },
      { file: "departments-break-room-pass1-v4.jpg", title: "v4 minimal mint", note: "Clean satire." },
    ],
  },
  {
    id: "social_media",
    name: "Social Media",
    hint: "Ring light / blank tiles — no icons text.",
    variants: [
      { file: "departments-social-media-pass1-v1.jpg", title: "v1 desk close", note: "Ring light hero." },
      { file: "departments-social-media-pass1-v2.jpg", title: "v2 content wall", note: "Color panels." },
      { file: "departments-social-media-pass1-v3.jpg", title: "v3 silhouette", note: "Creator back view." },
      { file: "departments-social-media-pass1-v4.jpg", title: "v4 minimal", note: "Single prop focus." },
    ],
  },
  {
    id: "video_production_studio",
    name: "Video production studio",
    hint: "Lights + camera — full art even if locked in game later.",
    variants: [
      { file: "departments-video-production-studio-pass1-v1.jpg", title: "v1 set close", note: "Softboxes." },
      { file: "departments-video-production-studio-pass1-v2.jpg", title: "v2 studio wide", note: "Backdrop + cables." },
      { file: "departments-video-production-studio-pass1-v3.jpg", title: "v3 camera low", note: "Tripod hero." },
      { file: "departments-video-production-studio-pass1-v4.jpg", title: "v4 minimal", note: "Light stand only." },
    ],
  },
  {
    id: "press_room",
    name: "Press Room",
    hint: "Podium + blank screens.",
    variants: [
      { file: "departments-press-room-pass1-v1.jpg", title: "v1 podium close", note: "Mic cluster." },
      { file: "departments-press-room-pass1-v2.jpg", title: "v2 briefing wide", note: "Monitor wall." },
      { file: "departments-press-room-pass1-v3.jpg", title: "v3 low podium", note: "Dramatic angle." },
      { file: "departments-press-room-pass1-v4.jpg", title: "v4 minimal", note: "Silhouette read." },
    ],
  },
];
