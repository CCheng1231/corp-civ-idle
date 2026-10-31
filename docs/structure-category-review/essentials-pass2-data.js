/** Pass 2 — version sets: v1–v2 Arknights, v3–v4 13 Sentinels. Statue locked from Pass 1. */
const PASS2_SETS = [
  {
    version: 1,
    style: "Arknights (JP anime base BG)",
    banner: {
      file: "essentials-banner-pass2-v1.jpg",
      title: "Banner v1",
      note: "E floor cutaway · grounded · sim pastels · all essentials readable.",
    },
    structures: [
      { id: "office_desk", name: "Office Desk", file: "essentials-office-desk-pass2-v1.jpg", note: "Cool teal · keyboard · Arknights set v1." },
      { id: "bank_account", name: "Bank Account", file: "essentials-bank-account-pass2-v1.jpg", note: "Vault + cash piles around." },
      { id: "office_supply", name: "Office Supply", file: "essentials-office-supply-pass2-v1.jpg", note: "Muted closet shelves." },
      { id: "storage_room", name: "Storage Room", file: "essentials-storage-room-pass2-v1.jpg", note: "Roll-up close crop." },
      { id: "company_statue", name: "Company Statue (locked Pass 1)", file: "essentials-company-statue-pass1-locked-v1.jpg", note: "Same hero for every set.", locked: true },
    ],
  },
  {
    version: 2,
    style: "Arknights (JP anime base BG)",
    banner: {
      file: "essentials-banner-pass2-v2.jpg",
      title: "Banner v2",
      note: "Wing module layout · same family as v1.",
    },
    structures: [
      { id: "office_desk", name: "Office Desk", file: "essentials-office-desk-pass2-v2.jpg", note: "High angle wider pod." },
      { id: "bank_account", name: "Bank Account", file: "essentials-bank-account-pass2-v2.jpg", note: "Vault cube + scattered money." },
      { id: "office_supply", name: "Office Supply", file: "essentials-office-supply-pass2-v2.jpg", note: "Depot cart wide." },
      { id: "storage_room", name: "Storage Room", file: "essentials-storage-room-pass2-v2.jpg", note: "Crate grid depth." },
      { id: "company_statue", name: "Company Statue (locked Pass 1)", file: "essentials-company-statue-pass1-locked-v1.jpg", note: "Locked.", locked: true },
    ],
  },
  {
    version: 3,
    style: "13 Sentinels UI BG",
    banner: {
      file: "essentials-banner-pass2-v3.jpg",
      title: "Banner v3",
      note: "Cinematic anime · grounded office.",
    },
    structures: [
      { id: "office_desk", name: "Office Desk", file: "essentials-office-desk-pass2-v3.jpg", note: "Low angle · keyboard." },
      { id: "bank_account", name: "Bank Account", file: "essentials-bank-account-pass2-v3.jpg", note: "Money still life · v4 art less grim." },
      { id: "office_supply", name: "Office Supply", file: "essentials-office-supply-pass2-v3.jpg", note: "Worker silhouette optional." },
      { id: "storage_room", name: "Storage Room", file: "essentials-storage-room-pass2-v3.jpg", note: "Closer zoom warehouse." },
      { id: "company_statue", name: "Company Statue (locked Pass 1)", file: "essentials-company-statue-pass1-locked-v1.jpg", note: "Locked.", locked: true },
    ],
  },
  {
    version: 4,
    style: "13 Sentinels UI BG",
    banner: {
      file: "essentials-banner-pass2-v4.jpg",
      title: "Banner v4",
      note: "Matches v3 family.",
    },
    structures: [
      { id: "office_desk", name: "Office Desk", file: "essentials-office-desk-pass2-v4.jpg", note: "Dual monitors · optional typist." },
      { id: "bank_account", name: "Bank Account", file: "essentials-bank-account-pass2-v4.jpg", note: "Safe room heaps of cash." },
      { id: "office_supply", name: "Office Supply", file: "essentials-office-supply-pass2-v4.jpg", note: "Frontal closet neat." },
      { id: "storage_room", name: "Storage Room", file: "essentials-storage-room-pass2-v4.jpg", note: "Tight industrial bay." },
      { id: "company_statue", name: "Company Statue (locked Pass 1)", file: "essentials-company-statue-pass1-locked-v1.jpg", note: "Locked.", locked: true },
    ],
  },
];
