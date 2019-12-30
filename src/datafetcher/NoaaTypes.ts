export enum Variable {
  WindX = "UGRD",
  WindY = "VGRD",
  Precipitation = "APCP",
  CloudCover = "TCDC",
  SnowPercentage = "CPOFP"
}
export enum Level {
  AboveGround10m = "lev_10_m_above_ground",
  EntireAtmosphere = "ev_entire_atmosphere_%5C%28considered_as_a_single_layer%5C%29",
  CloudLayer = "lev_convective_cloud_layer",
  Surface = "lev_surface",
  AllLevel = "all_lev"
}
export type VariableConfig = {
  variable: Variable;
  level: Level;
};
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
  forecast: number;
  resolution: Resolution;
  variableConfigs: VariableConfig[];
};
export type Grib2Json = {
  source: string;
  minimum: number;
  maximum: number;
  Ni: number;
  Nj: number;
  values: number[];
};
