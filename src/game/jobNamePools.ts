import type { JobLocationType } from "./jobSites";

const POOLS: Record<JobLocationType, readonly string[]> = {
  police_station: [
    "Continuity-of-custody paperwork refresh",
    "Fleet \"ready for optics\" wipe-down",
    "Non-emergency queue impression management",
    "Neighborhood reassuring presence (billable)",
    "Impound inventory: where did the cars go",
    "Graveyard shift donut logistics",
    "Body-worn footage \"administrative cleanup\"",
  ],
  hospital: [
    "PPE cage: make the numbers look alive",
    "Linen circuit: stains are a mindset",
    "Patient relocation (not officially \"running\")",
    "Pharmacy line morale enforcement",
    "ER lobby: explain the wait, don't fix it",
    "Autoclave cycle: smells like compliance",
    "Discharge forms: free the bed, keep the liability",
  ],
  tower: [
    "Mailroom surge: deliverables undefined",
    "Lobby traffic: smile, do not make eye contact",
    "Freight elevator hostage negotiation",
    "After-hours HVAC \"wellness audit\"",
    "Hot-desk shuffle for the reorg that never ends",
    "Badge reader prayer and percussive maintenance",
    "Executive floor: agile transformation moving boxes",
  ],
  major_hub: [
    "Loading dock: trucks have feelings too",
    "Parking structure beautification (litter is decorative)",
    "Cold chain panic: someone unplugged something",
    "Visitor lanyard industrial complex",
    "Backroom pallet Jenga, OSHA optional",
    "Conference room reset to \"factory default soul\"",
    "Pop-up brand experience strike & vanish",
  ],
  city_hall: [
    "Public records: request in triplicate, answer in vibes",
    "Permit desk: \"we'll call you\" support crew",
    "Council chamber: rearrange chairs, same arguments",
    "Ribbon-cutting crowd compression",
    "Archive boxes: history goes in the mezzanine",
    "License backlog: stamp faster, think less",
    "Roof escort: meet the vendor who's \"totally licensed\"",
  ],
};

export function jobTitlePool(locationType: JobLocationType): readonly string[] {
  return POOLS[locationType];
}

export function pickJobTitle(
  locationType: JobLocationType,
  rollUnit: number,
): string {
  const pool = jobTitlePool(locationType);
  const idx = Math.min(pool.length - 1, Math.floor(rollUnit * pool.length));
  return pool[idx] ?? pool[0]!;
}

export function jobDescriptionForTitle(title: string, tier: 1 | 2): string {
  return tier === 2
    ? `Contract gig: ${title}. Temporary operational support (tier 2).`
    : `Contract gig: ${title}. Temporary operational support.`;
}