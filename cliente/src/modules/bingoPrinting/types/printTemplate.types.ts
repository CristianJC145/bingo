export interface TemplateField {
  id: string;
  label: string;
  source: "manual" | "cardNumber";
  xPct: number;
  yPct: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: "dark" | "light";
}

export interface TemplateNumberGrid {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  gapPct: number;
  fontSize: number;
}

export interface TemplateConfig {
  fields: TemplateField[];
  numberGrid: TemplateNumberGrid;
}

export interface PrintTemplate {
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  url: string;
  updatedAt: string;
  config: TemplateConfig;
}
