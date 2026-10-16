// Catálogos normalizados compartidos por el registro de cartones.
// Se guardan en base de datos por su `value` (código estable), nunca por su etiqueta.

export interface CatalogOption {
  value: string;
  label: string;
}

export const MUNICIPIOS: CatalogOption[] = [
  { value: "COLON", label: "Colón" },
  { value: "SAN_FRANCISCO", label: "San Francisco" },
  { value: "SANTIAGO", label: "Santiago" },
  { value: "SIBUNDOY", label: "Sibundoy" },
  { value: "MOCOA", label: "Mocoa" },
  { value: "PUERTO_GUZMAN", label: "Puerto Guzmán" },
  { value: "VILLAGARZON", label: "Villagarzón" },
  { value: "ORITO", label: "Orito" },
  { value: "PUERTO_ASIS", label: "Puerto Asís" },
  { value: "PUERTO_CAICEDO", label: "Puerto Caicedo" },
  { value: "PUERTO_LEGUIZAMO", label: "Puerto Leguízamo" },
  { value: "SAN_MIGUEL", label: "San Miguel" },
  { value: "VALLE_DEL_GUAMUEZ", label: "Valle del Guamuez" },
];

export const TIPOS_IDENTIFICACION: CatalogOption[] = [
  { value: "CC", label: "Cédula de ciudadanía (CC)" },
  { value: "TI", label: "Tarjeta de identidad (TI)" },
];

export const GENEROS: CatalogOption[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "OTRO", label: "Otro" },
];

export const SECTORES: CatalogOption[] = [
  { value: "URBANO", label: "Urbano" },
  { value: "RURAL", label: "Rural" },
];

export const SI_NO: CatalogOption[] = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];

export const TIPOS_DISCAPACIDAD: CatalogOption[] = [
  { value: "FISICA", label: "Física" },
  { value: "VISUAL", label: "Visual" },
  { value: "AUDITIVA", label: "Auditiva" },
  { value: "INTELECTUAL", label: "Intelectual" },
  { value: "PSICOSOCIAL", label: "Psicosocial (mental)" },
  { value: "SORDOCEGUERA", label: "Sordoceguera" },
  { value: "MULTIPLE", label: "Múltiple" },
  { value: "SINDROME_DOWN", label: "Síndrome de Down" },
];

/** Categoría adicional para que el filtro no excluya personas sin discapacidad por defecto. */
export const WITHOUT_DISABILITY_VALUE = "SIN_DISCAPACIDAD";
export const DISABILITY_CATEGORIES: CatalogOption[] = [
  { value: WITHOUT_DISABILITY_VALUE, label: "Sin discapacidad" },
  ...TIPOS_DISCAPACIDAD,
];
export const CAREGIVER_CATEGORIES: CatalogOption[] = [
  { value: "SI", label: "Persona cuidadora" },
  { value: "NO", label: "No cuidadora" },
];

export const catalogs = {
  municipios: MUNICIPIOS,
  tiposIdentificacion: TIPOS_IDENTIFICACION,
  generos: GENEROS,
  sectores: SECTORES,
  siNo: SI_NO,
  tiposDiscapacidad: TIPOS_DISCAPACIDAD,
};

const valuesOf = (options: CatalogOption[]) => options.map((option) => option.value);

export const isValidMunicipio = (value: string) => valuesOf(MUNICIPIOS).includes(value);
export const isValidTipoIdentificacion = (value: string) => valuesOf(TIPOS_IDENTIFICACION).includes(value);
export const isValidGenero = (value: string) => valuesOf(GENEROS).includes(value);
export const isValidSector = (value: string) => valuesOf(SECTORES).includes(value);
export const isValidSiNo = (value: string) => valuesOf(SI_NO).includes(value);
export const isValidTipoDiscapacidad = (value: string) => valuesOf(TIPOS_DISCAPACIDAD).includes(value);
export const isValidDisabilityCategory = (value: string) => valuesOf(DISABILITY_CATEGORIES).includes(value);
export const isValidCaregiverCategory = (value: string) => valuesOf(CAREGIVER_CATEGORIES).includes(value);
