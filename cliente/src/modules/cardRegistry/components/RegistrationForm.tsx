import React, { useMemo, useState } from "react";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import { Catalogs } from "../../auth/services/auth.service";
import { RegistrationForm as FormValues, RegistrationRow } from "../services/cardRegistry.service";

interface RegistrationFormProps {
  cardNumber: number;
  catalogs: Catalogs;
  initial?: RegistrationRow;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: FormValues) => void;
}

const emptyValues: FormValues = {
  municipio: "", nombreCompleto: "", tipoIdentificacion: "", numeroIdentificacion: "", genero: "",
  fechaNacimiento: "", desplazado: "", contacto: "", sector: "", nombreResidencia: "",
  discapacidad: "", tipoDiscapacidad: null, cuidador: "",
  adultoMayor: "",
};

const isOlderAdult = (isoDate: string, today = new Date()): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return false;
  let age = today.getFullYear() - Number(match[1]);
  const month = today.getMonth() + 1;
  if (month < Number(match[2]) || (month === Number(match[2]) && today.getDate() < Number(match[3]))) age -= 1;
  return age >= 60;
};

const RegistrationFormComponent: React.FC<RegistrationFormProps> = ({ cardNumber, catalogs, initial, isSaving, onCancel, onSave }) => {
  const [values, setValues] = useState<FormValues>(() => ({
    ...emptyValues,
    ...(initial ? {
      municipio: initial.assignedMunicipio ?? initial.municipio ?? "", nombreCompleto: initial.nombreCompleto ?? "",
      tipoIdentificacion: initial.tipoIdentificacion ?? "", numeroIdentificacion: initial.numeroIdentificacion ?? "",
      genero: initial.genero ?? "", fechaNacimiento: initial.fechaNacimiento ?? "",
      desplazado: initial.desplazado ?? "", contacto: initial.contacto ?? "",
      sector: initial.sector ?? "", nombreResidencia: initial.nombreResidencia ?? "",
      discapacidad: initial.discapacidad ?? "", tipoDiscapacidad: initial.tipoDiscapacidad ?? null,
      cuidador: initial.cuidador ?? "",
      adultoMayor: initial.adultoMayor ?? (isOlderAdult(initial.fechaNacimiento ?? "") ? "SI" : "NO"),
    } : {}),
  }));
  const [touched, setTouched] = useState(false);

  const setValue = (key: keyof FormValues, value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "discapacidad" && value !== "SI") next.tipoDiscapacidad = null;
      if (key === "fechaNacimiento") next.adultoMayor = isOlderAdult(value) ? "SI" : "NO";
      return next;
    });
  };

  const requiresDisabilityType = values.discapacidad === "SI";
  const isOlderAdultEligible = isOlderAdult(values.fechaNacimiento);
  const assignedMunicipio = initial?.assignedMunicipio ?? null;
  const municipalityLocked = Boolean(initial);

  const errors = useMemo(() => {
    const result: Partial<Record<keyof FormValues, string>> = {};
    if (!values.municipio) result.municipio = "Requerido";
    if (values.nombreCompleto.trim().length < 3) result.nombreCompleto = "Requerido";
    if (!values.tipoIdentificacion) result.tipoIdentificacion = "Requerido";
    if (!/^\d{6,15}$/.test(values.numeroIdentificacion.trim())) result.numeroIdentificacion = "6 a 15 dígitos";
    if (!values.genero) result.genero = "Requerido";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fechaNacimiento)) result.fechaNacimiento = "Requerido";
    if (!values.desplazado) result.desplazado = "Requerido";
    if (!/^\d{7,15}$/.test(values.contacto.trim())) result.contacto = "7 a 15 dígitos";
    if (!values.sector) result.sector = "Requerido";
    if (values.nombreResidencia.trim().length < 2) result.nombreResidencia = "Requerido";
    if (!values.discapacidad) result.discapacidad = "Requerido";
    if (requiresDisabilityType && !values.tipoDiscapacidad) result.tipoDiscapacidad = "Requerido";
    if (!values.cuidador) result.cuidador = "Requerido";
    if (!values.adultoMayor) result.adultoMayor = "Requerido";
    return result;
  }, [values, requiresDisabilityType]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    onSave({
      ...values,
      nombreCompleto: values.nombreCompleto.trim(),
      numeroIdentificacion: values.numeroIdentificacion.trim(),
      contacto: values.contacto.trim(),
      nombreResidencia: values.nombreResidencia.trim(),
    });
  };

  const fieldClass = (key: keyof FormValues) => `field ${touched && errors[key] ? "has-error" : ""}`;
  const errorFor = (key: keyof FormValues) => touched && errors[key] ? <small className="field-error">{errors[key]}</small> : null;

  const renderSelect = (key: keyof FormValues, label: string, options: { value: string; label: string }[], disabled = false, hint?: string) => (
    <label className={fieldClass(key)}>
      <span>{label}</span>
      <select className="form-input" value={(values[key] as string) ?? ""} onChange={(event) => setValue(key, event.target.value)} disabled={disabled}>
        <option value="">Seleccionar…</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {hint && <small className={`field-hint ${key === "adultoMayor" && isOlderAdultEligible ? "detected" : ""}`}>{hint}</small>}
      {errorFor(key)}
    </label>
  );

  const renderInput = (key: keyof FormValues, label: string, type = "text", placeholder = "") => (
    <label className={fieldClass(key)}>
      <span>{label}</span>
      <input className="form-input" type={type} value={(values[key] as string) ?? ""} placeholder={placeholder} onChange={(event) => setValue(key, event.target.value)} />
      {errorFor(key)}
    </label>
  );

  return (
    <RegistrationFormStyle>
      <div className="form-head">
        <span className="card-badge">Cartón N° {cardNumber}</span>
        <span className="required-note"><AppIcon icon="triangle-exclamation" />Todos los campos son obligatorios</span>
      </div>

      <div className="form-body">
        <fieldset>
          <legend>Datos de la persona</legend>
          <div className="grid">
            {renderInput("nombreCompleto", "Nombre completo", "text", "Nombres y apellidos")}
            {renderSelect("tipoIdentificacion", "Tipo de identificación", catalogs.tiposIdentificacion)}
            {renderInput("numeroIdentificacion", "Número de identificación", "text", "Solo números")}
            {renderSelect("genero", "Género", catalogs.generos)}
            {renderInput("fechaNacimiento", "Fecha de nacimiento", "date")}
            {renderInput("contacto", "Contacto (teléfono)", "text", "Ej. 3001234567")}
          </div>
        </fieldset>

        <fieldset>
          <legend>Ubicación</legend>
          <div className="grid">
            {renderSelect("municipio", "Municipio asignado", catalogs.municipios, municipalityLocked, assignedMunicipio ? "Definido por el administrador para este bloque de cartones." : "El administrador debe definir el municipio del bloque antes de registrar.")}
            {renderSelect("sector", "Sector", catalogs.sectores)}
            {renderInput("nombreResidencia", "Nombre de residencia", "text", "Barrio / vereda")}
          </div>
        </fieldset>

        <fieldset>
          <legend>Condición</legend>
          <div className="grid">
            {renderSelect("desplazado", "Desplazado", catalogs.siNo)}
            {renderSelect("discapacidad", "Discapacidad", catalogs.siNo)}
            {requiresDisabilityType && renderSelect("tipoDiscapacidad", "Tipo de discapacidad", catalogs.tiposDiscapacidad)}
            {renderSelect("cuidador", "Cuidador", catalogs.siNo)}
            {renderSelect("adultoMayor", "Adulto mayor", catalogs.siNo, !isOlderAdultEligible, isOlderAdultEligible ? "Detectado automáticamente: tiene 60 años o más." : "Se habilita al ingresar una fecha correspondiente a 60 años o más.")}
          </div>
        </fieldset>
      </div>

      <div className="form-actions">
        {touched && !isValid && <span className="invalid-note"><AppIcon icon="triangle-exclamation" />Completa los campos marcados para guardar.</span>}
        <div className="action-buttons">
          <AppButton variant="transparent" label="Cancelar" onClick={onCancel} />
          <AppButton icon="check" label={isSaving ? "Guardando…" : "Guardar registro"} onClick={handleSubmit} disabled={isSaving} />
        </div>
      </div>
    </RegistrationFormStyle>
  );
};

export default RegistrationFormComponent;

const RegistrationFormStyle = styled.div`
  .form-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .6rem; margin-bottom: 1.1rem; }
  .card-badge { padding: .4rem .7rem; color: var(--color-accent); background: rgba(255,184,77,.1); border: 1px solid rgba(255,184,77,.22); border-radius: 9px; font-size: .72rem; font-weight: 700; }
  .required-note { display: flex; align-items: center; gap: .35rem; color: var(--text-muted); font-size: .62rem; }
  .form-body { display: flex; flex-direction: column; gap: 1.1rem; }
  fieldset { padding: .9rem 1rem 1rem; margin: 0; background: rgba(0,0,0,.14); border: 1px solid var(--border-subtle); border-radius: 12px; }
  legend { padding: 0 .4rem; color: var(--color-secondary); font-size: .58rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .75rem; }
  .field { display: flex; flex-direction: column; gap: .32rem; min-width: 0; }
  .field > span { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .field .form-input { width: 100%; padding: .58rem .65rem; font-size: .72rem; }
  .field.has-error .form-input { border-color: rgba(var(--color-danger-rgb),.6); }
  .field-error { color: var(--color-danger); font-size: .56rem; }
  .field-hint { color:var(--text-muted); font-size:.52rem; line-height:1.35; }
  .field-hint.detected { color:var(--color-secondary); }
  .field .form-input:disabled { color:var(--text-muted); cursor:not-allowed; opacity:.65; }
  .form-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .8rem; margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
  .invalid-note { display: flex; align-items: center; gap: .4rem; color: var(--color-danger); font-size: .66rem; }
  .action-buttons { display: flex; gap: .5rem; margin-left: auto; }
`;
