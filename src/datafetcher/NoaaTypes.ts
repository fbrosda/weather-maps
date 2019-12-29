export type Variable = "UGRD" | "VGRD";
export type Level = "lev_10_m_above_ground";
export enum Time {
  t0 = "00",
  t1 = "06",
  t2 = "12",
  t3 = "18"
}
export enum Resolution {
  LOW = "1p00",
  MEDIUM = "0p50",
  HIGH = "0p25"
}
export type NoaaParam = {
  date: string;
  time: Time;
  resolution: Resolution;
  level: Level;
  variables: Variable[];
};
export type Grib2Json = {
  source: string;
  minimum: number;
  maximum: number;
  Ni: number;
  Nj: number;
  values: number[];
};
