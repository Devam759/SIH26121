// The Assam Basin column, shared by the lithology track and the risk panel's
// per-formation bars so the two can never disagree about an interval.

export interface FormationInterval {
  name: string;
  short: string;
  topM: number;
  bottomM: number;
  lithology: string;
  hazardRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const ASSAM_STRATA: FormationInterval[] = [
  {
    name: 'Alluvium',
    short: 'Alluv',
    topM: 0,
    bottomM: 450,
    lithology: 'Silt, unconsolidated gravel & coarse sand',
    hazardRisk: 'LOW',
  },
  {
    name: 'Dhekiajuli',
    short: 'Dhek',
    topM: 450,
    bottomM: 1200,
    lithology: 'Friable massive sandstones with clay intercalations',
    hazardRisk: 'LOW',
  },
  {
    name: 'Tipam Sandstone',
    short: 'Tipam',
    topM: 1200,
    bottomM: 2100,
    lithology: 'Massive fluvial sandstones, principal regional reservoir',
    hazardRisk: 'LOW',
  },
  {
    name: 'Surma / Bokabil',
    short: 'Surma',
    topM: 2100,
    bottomM: 2600,
    lithology: 'Siltstone, shale & argillaceous sandstone alternations',
    hazardRisk: 'MEDIUM',
  },
  {
    name: 'Barail Formation',
    short: 'Barail',
    topM: 2600,
    bottomM: 3200,
    lithology: 'Carbonaceous shale, coals, overpressured sands — prone to kicks & losses',
    hazardRisk: 'HIGH',
  },
  {
    name: 'Kopili Formation',
    short: 'Kopili',
    topM: 3200,
    bottomM: 3800,
    lithology: 'Splintery marine shales, limestone lenses',
    hazardRisk: 'MEDIUM',
  },
];

export const TOTAL_DEPTH = ASSAM_STRATA[ASSAM_STRATA.length - 1].bottomM;

export function formationAt(depth: number): FormationInterval {
  return (
    ASSAM_STRATA.find((s) => depth >= s.topM && depth < s.bottomM) ??
    ASSAM_STRATA[ASSAM_STRATA.length - 1]
  );
}
