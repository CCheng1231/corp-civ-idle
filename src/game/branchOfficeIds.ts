import type { CommercialLotId } from "./types";

export function branchOfficeIdForOpenPad(
  hexKey: string,
  padIndex: number,
): `branch:${string}` {
  return `branch:${hexKey}:${padIndex}`;
}

/** Legacy commercial lot pad id. */
export function branchOfficeIdForCommercialPad(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): `branch:${string}` {
  return `branch:${commercialLotId}:${slotIndex}`;
}
