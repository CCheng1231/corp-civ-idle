import type { SecretaryId } from "./types";
import secretary01Roster from "../assets/Secretary_info/Secretary_01_Roaster.jpg";
import secretary02Roster from "../assets/Secretary_info/Secretary_02_Roaster.jpg";
import secretary03Roster from "../assets/Secretary_info/Secretary_03_Roaster.jpg";
import secretary04Roster from "../assets/Secretary_info/Secretary_04_Roaster.jpg";
import secretary05Roster from "../assets/Secretary_info/Secretary_05_Roaster.jpg";
import secretary01Home from "../assets/Secretary_info/Secretary_01_Home.jpg";
import secretary02Home from "../assets/Secretary_info/Secretary_02_Home.jpg";
import secretary03Home from "../assets/Secretary_info/Secretary_03_Home.jpg";
import secretary04Home from "../assets/Secretary_info/Secretary_04_Home.jpg";
import secretary05Home from "../assets/Secretary_info/Secretary_05_Home.jpg";
import secretary01Secretary from "../assets/Secretary_info/Secretary_01_Secretary.jpg";
import secretary02Secretary from "../assets/Secretary_info/Secretary_02_Secretary.jpg";
import secretary03Secretary from "../assets/Secretary_info/Secretary_03_Secretary.jpg";
import secretary04Secretary from "../assets/Secretary_info/Secretary_04_Secretary.jpg";
import secretary05Secretary from "../assets/Secretary_info/Secretary_05_Secretary.jpg";

/** Full portrait — detail popup and legacy callers. */
export const SECRETARY_MAIN_PORTRAIT_SRC: Record<SecretaryId, string> = {
  secretary_01: secretary01Secretary,
  secretary_02: secretary02Secretary,
  secretary_03: secretary03Secretary,
  secretary_04: secretary04Secretary,
  secretary_05: secretary05Secretary,
};

/** Roster tab thumbnails and hero. */
export const SECRETARY_ROSTER_PORTRAIT_SRC: Record<SecretaryId, string> = {
  secretary_01: secretary01Roster,
  secretary_02: secretary02Roster,
  secretary_03: secretary03Roster,
  secretary_04: secretary04Roster,
  secretary_05: secretary05Roster,
};

/** Home landing — Chief of Staff scene. */
export const SECRETARY_HOME_PORTRAIT_SRC: Record<SecretaryId, string> = {
  secretary_01: secretary01Home,
  secretary_02: secretary02Home,
  secretary_03: secretary03Home,
  secretary_04: secretary04Home,
  secretary_05: secretary05Home,
};

/** Secretary hub landing + roster/job tab backgrounds. */
export const SECRETARY_TAB_PORTRAIT_SRC: Record<SecretaryId, string> = {
  secretary_01: secretary01Secretary,
  secretary_02: secretary02Secretary,
  secretary_03: secretary03Secretary,
  secretary_04: secretary04Secretary,
  secretary_05: secretary05Secretary,
};

export function secretaryPortraitSrc(id: SecretaryId): string {
  return SECRETARY_MAIN_PORTRAIT_SRC[id];
}

export function secretaryRosterPortraitSrc(id: SecretaryId): string {
  return SECRETARY_ROSTER_PORTRAIT_SRC[id];
}

export function secretaryHomePortraitSrc(id: SecretaryId): string {
  return SECRETARY_HOME_PORTRAIT_SRC[id];
}

export function secretaryTabPortraitSrc(id: SecretaryId): string {
  return SECRETARY_TAB_PORTRAIT_SRC[id];
}
