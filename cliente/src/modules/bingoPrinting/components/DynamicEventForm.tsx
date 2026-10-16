import React from "react";
import styled from "styled-components";
import { TemplateField } from "../types/printTemplate.types";

interface DynamicEventFormProps {
  fields: TemplateField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

const DynamicEventForm: React.FC<DynamicEventFormProps> = ({ fields, values, onChange }) => {
  const manualFields = fields.filter((field) => field.source === "manual");

  if (manualFields.length === 0) {
    return (
      <DynamicEventFormStyle>
        <p className="empty-note">Esta plantilla no tiene campos de información configurados todavía. Ve a la pestaña "Plantilla" para agregarlos.</p>
      </DynamicEventFormStyle>
    );
  }

  const handleChange = (fieldId: string, value: string) => {
    onChange({ ...values, [fieldId]: value });
  };

  return (
    <DynamicEventFormStyle>
      <div className="fields-grid">
        {manualFields.map((field) => (
          <label key={field.id}>
            <span>{field.label}</span>
            <input type="text" className="form-input" value={values[field.id] ?? ""} onChange={(event) => handleChange(field.id, event.target.value)} />
          </label>
        ))}
      </div>
    </DynamicEventFormStyle>
  );
};

export default DynamicEventForm;

const DynamicEventFormStyle = styled.div`
  .empty-note { margin: 0; color: var(--text-muted); font-size: .72rem; line-height: 1.5; }
  .fields-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .8rem; }
  label { display: flex; flex-direction: column; gap: .4rem; }
  label > span { color: var(--text-muted); font-size: .62rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
`;
