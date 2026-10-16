import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { generateTemplateBingoCardsPdf, PrintSheetOptions } from "../utils/generateTemplateBingoCardsPdf";
import { PrintTemplate, TemplateConfig } from "../types/printTemplate.types";
import type { RangeCard } from "../services/getBingoCardsByRange.service";

interface TemplatePdfPreviewProps {
  template: PrintTemplate;
  config: TemplateConfig;
  card: RangeCard;
  values: Record<string, string>;
  /** Patrocinadores y figuras que acompañan al cartón en la hoja. */
  sheetOptions?: PrintSheetOptions;
  className?: string;
  size?: "sm" | "md";
}

const VIEWER_PARAMS = "#toolbar=0&navpanes=0&scrollbar=0&view=FitH";

const TemplatePdfPreview: React.FC<TemplatePdfPreviewProps> = ({ template, config, card, values, sheetOptions, className, size = "md" }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const configKey = JSON.stringify(config);
  const valuesKey = JSON.stringify(values);
  // Si cambian los nombres de patrocinadores, su rótulo o las figuras, se redibuja.
  const sheetKey = JSON.stringify({
    sponsorNames: sheetOptions?.sponsorNames ?? [],
    sponsorsTitle: sheetOptions?.sponsorsTitle ?? "",
    sponsors: sheetOptions?.sponsors?.map((sponsor) => [sponsor.id, sponsor.url]) ?? [],
    figures: sheetOptions?.figures?.map((figure) => figure.id) ?? [],
  });

  useEffect(() => {
    let cancelled = false;
    setIsRendering(true);
    setHasError(false);

    const timeoutId = window.setTimeout(async () => {
      try {
        const doc = await generateTemplateBingoCardsPdf([card], { ...template, config }, values, sheetOptions);
        if (cancelled) return;
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setPreviewUrl(url);
      } catch (error) {
        console.error("Error generando la vista previa:", error);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }, 450);

    return () => { cancelled = true; window.clearTimeout(timeoutId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, valuesKey, sheetKey, card.id, template.url]);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const frameContent = hasError ? (
    <div className="preview-empty"><AppIcon icon="triangle-exclamation" /><span>No se pudo generar.</span></div>
  ) : previewUrl ? (
    <iframe title="Vista previa del cartón" src={`${previewUrl}${VIEWER_PARAMS}`} />
  ) : (
    <div className="preview-empty"><AppIcon icon="rotate" className="spin" /><span>Generando…</span></div>
  );

  return (
    <TemplatePdfPreviewStyle className={`${className ?? ""} ${size}`.trim()}>
      <div className="preview-header">
        <span className="preview-title"><AppIcon icon="receipt" />Vista previa real{isRendering && <i className="dot" />}</span>
        {previewUrl && !hasError && <button type="button" className="expand-link" onClick={() => setIsExpanded(true)}><AppIcon icon="search" />Ampliar</button>}
      </div>
      <div
        className="preview-frame"
        role="button"
        tabIndex={0}
        onClick={() => previewUrl && !hasError && setIsExpanded(true)}
        onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && previewUrl && !hasError) setIsExpanded(true); }}
        aria-label="Ampliar vista previa"
      >
        {frameContent}
      </div>

      <AppModal title="Vista previa real" size="md" isOpen={isExpanded} onClose={() => setIsExpanded(false)}>
        <div className="expanded-frame">{frameContent}</div>
      </AppModal>
    </TemplatePdfPreviewStyle>
  );
};

export default TemplatePdfPreview;

const TemplatePdfPreviewStyle = styled.div`
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 50% { opacity: .3; } }
  .preview-header { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .55rem; }
  .preview-title { display: flex; align-items: center; gap: .4rem; color: var(--text-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .preview-title svg { color: var(--color-secondary); font-size: .7rem; }
  .preview-title .dot { width: 6px; height: 6px; background: var(--color-accent); border-radius: 50%; animation: pulse 1s ease-in-out infinite; }
  .expand-link { display: flex; align-items: center; gap: .3rem; padding: 0; color: var(--text-muted); background: none; border: 0; font-size: .62rem; font-weight: 600; cursor: pointer; }
  .expand-link:hover { color: var(--text-primary); }
  .preview-frame { position: relative; display: block; width: 100%; aspect-ratio: 215.9 / 279.4; padding: 0; overflow: hidden; background: #eceef3; border: 1px solid var(--border-subtle); border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.04), 0 12px 30px rgba(0,0,0,.22); cursor: zoom-in; transition: box-shadow .18s ease; }
  .preview-frame:hover { box-shadow: inset 0 0 0 1px rgba(0,0,0,.04), 0 16px 38px rgba(0,0,0,.32); }
  .preview-frame iframe { width: 100%; height: 100%; border: 0; pointer-events: none; }
  &.sm .preview-frame { max-width: 150px; }
  .preview-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: .45rem; padding: .5rem; color: #8a8fa0; text-align: center; font-size: .6rem; }
  .preview-empty svg { font-size: 1.1rem; }
  .preview-empty .spin { animation: spin 1s linear infinite; }
  .expanded-frame { width: min(72vw, 600px); aspect-ratio: 215.9 / 279.4; overflow: hidden; border-radius: 10px; background: #eceef3; }
  .expanded-frame iframe { width: 100%; height: 100%; border: 0; }
`;
