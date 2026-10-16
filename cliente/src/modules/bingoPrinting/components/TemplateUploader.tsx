import React, { useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppIcon from "../../../shared/components/AppIcon";
import { UploadPrintTemplateService } from "../services/printTemplate.service";
import { PrintTemplate } from "../types/printTemplate.types";

interface TemplateUploaderProps {
  onUploaded: (template: PrintTemplate) => void;
  hasExistingTemplate?: boolean;
}

const uploadPrintTemplateService = new UploadPrintTemplateService();

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error("No se pudo leer la imagen.")); URL.revokeObjectURL(url); };
    image.src = url;
  });

const TemplateUploader: React.FC<TemplateUploaderProps> = ({ onUploaded, hasExistingTemplate }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Usa una imagen PNG, JPG o WEBP.");
      return;
    }
    setIsUploading(true);
    try {
      const { width, height } = await readImageDimensions(file);
      const template = await uploadPrintTemplateService.run(file, width, height);
      toast.success("Plantilla cargada correctamente.");
      onUploaded(template);
    } catch (error) {
      console.error("Error subiendo la plantilla:", error);
      toast.error("No fue posible subir la plantilla.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <TemplateUploaderStyle className="surface-card">
      <span className="eyebrow">Plantilla de impresión</span>
      <h2>{hasExistingTemplate ? "Reemplaza tu plantilla" : "Sube el diseño de tu cartón"}</h2>
      <p>Trae tu propio diseño (fondo, colores, logo, espacios para la numeración) como imagen PNG, JPG o WEBP. Después ubicas encima los datos y ajustas la numeración.</p>

      <div
        className={`dropzone ${isDragOver ? "is-over" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden-input" onChange={handleInputChange} />
        <AppIcon icon="cloud-upload-alt" />
        <strong>{isUploading ? "Subiendo…" : "Arrastra tu plantilla aquí o haz clic para elegirla"}</strong>
        <small>PNG, JPG o WEBP</small>
      </div>
    </TemplateUploaderStyle>
  );
};

export default TemplateUploader;

const TemplateUploaderStyle = styled.section`
  padding: clamp(1.25rem, 2vw, 1.7rem);
  .eyebrow { color: var(--color-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .5rem 0 .35rem; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; }
  p { margin: 0 0 1.2rem; color: var(--text-secondary); font-size: .76rem; line-height: 1.6; max-width: 560px; }
  .dropzone { display: flex; min-height: 220px; align-items: center; justify-content: center; flex-direction: column; gap: .6rem; padding: 2rem; color: var(--text-muted); text-align: center; background: rgba(0,0,0,.15); border: 2px dashed var(--border-strong); border-radius: 16px; cursor: pointer; transition: border-color .18s ease, background .18s ease; }
  .dropzone:hover, .dropzone.is-over { color: var(--text-primary); background: rgba(255,255,255,.03); border-color: rgba(var(--color-primary-rgb),.55); }
  .dropzone svg { font-size: 1.8rem; }
  .dropzone strong { font-size: .82rem; }
  .dropzone small { font-size: .66rem; }
  .hidden-input { display: none; }
`;
