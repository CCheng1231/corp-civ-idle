import type { CSSProperties } from "react";

import type { GameSettings, UnitId } from "../game/types";
import { unitPortraitCardFraming } from "../game/unitPortraitCardFraming";
import { selectedUnitPortraitSkinId } from "../game/unitPortraitAssets";

interface UnitCardPortraitProps {
  unitId: UnitId;
  src: string;
  settings?: GameSettings;
}

/** Recruit roster card portrait strip — framing tuned in `unitPortraitCardFraming.ts`. */
export function UnitCardPortrait({
  unitId,
  src,
  settings,
}: UnitCardPortraitProps) {
  const skinId = selectedUnitPortraitSkinId(unitId, settings);
  const framing = unitPortraitCardFraming(unitId, skinId);
  const style = {
    "--progression-compact-portrait-unit-img-height": `${framing.imgHeightPercent}%`,
    "--progression-compact-portrait-unit-img-scale": String(framing.imgScale),
  } as CSSProperties;

  return (
    <div className="recruitment-card-portrait" style={style} aria-hidden="true">
      <img src={src} alt="" loading="lazy" draggable={false} />
    </div>
  );
}
