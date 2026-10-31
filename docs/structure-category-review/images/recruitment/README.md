# Recruitment structure art (review only)

Build tab **Recruitment** (`staffing`): `recruitment_desk`, `mit_room`.

| Folder | Purpose |
|--------|---------|
| `pass2/banners/` | v1–v4 banners |
| `pass2/structures/` | v1–v4 thumbs |
| `finals/` | Approved → `src/assets/structure-art/` |

Naming: `recruitment-desk-pass2-v3.jpg`, `recruitment-mit-room-pass2-v3.jpg`, `recruitment-banner-pass2-v3.jpg`.

`node scripts/install-recruitment-pass2-images.mjs` after GenerateImage.

**Wired in game (v1):** `src/game/structureRecruitmentArt.ts` · assets `recruitment-*.jpg` · banner pan key `corp-civ-idle-office-recruitment-art-pan`.
