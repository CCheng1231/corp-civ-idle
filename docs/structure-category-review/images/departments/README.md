# Departments structure art (review only)

Drop generated JPGs/PNG here. **Not wired to the game** until `departments-finals.html` is approved.

| Folder | Purpose |
|--------|---------|
| `archive/pass0-exploration/` | Optional composition probes (Pass 0) |
| `pass1/banners/` | Banner v1–v3 candidates |
| `pass1/structures/` | Four variants per structure |
| `pass2/banners/` | Version set banners v1–v4 |
| `pass2/structures/` | Version set thumbs v1–v4 |
| `finals/` | Approved masters → copy to `src/assets/structure-art/` when wiring |

**Wired in game (v4):** `src/game/structureDepartmentsArt.ts` · assets `departments-*.jpg` · banner pan key `corp-civ-idle-office-departments-art-pan`. **Office Expansion:** `departments-office-expansion.jpg` (pass2 v1 master, finals crop Nov 2026).

Naming: `departments-{structure-id}-pass1-v1.jpg`, `departments-banner-pass2-v3.jpg`, finals `departments-dept-b2b.jpg`, `departments-category-banner.png`.

Structure IDs: `office_expansion`, `dept_b2b`, `break_room`, `social_media`, `video_production_studio`, `press_room`.

**Office Expansion (review):** `pass2/structures/departments-office-expansion-pass2-v1.jpg` … `v4.jpg` · prompts via `departmentsPass2StructurePrompt(version, "office_expansion")` · install: `node scripts/install-office-expansion-pass2-images.mjs`.

**Pass 2b regen (Oct 2026):** Five **standalone** room layouts per set (structures first, banner last). Prompts in `departments-prompts.js` (`departmentsPass2StructurePrompt` / `departmentsPass2BannerPrompt`). Style ref: matching Essentials desk pass2 only — **not** the department banner. After GenerateImage, run `node scripts/install-departments-pass2-images.mjs`.
