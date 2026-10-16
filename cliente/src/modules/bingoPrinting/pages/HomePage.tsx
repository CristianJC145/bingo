import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import TemplateUploader from "../components/TemplateUploader";
import TemplateEditor from "../components/TemplateEditor";
import DynamicEventForm from "../components/DynamicEventForm";
import PrintRangeSelector from "../components/PrintRangeSelector";
import TemplatePdfPreview from "../components/TemplatePdfPreview";
import PrintFigureSelector from "../components/PrintFigureSelector";
import PrintSponsorsEditor from "../components/PrintSponsorsEditor";
import { GetPrintTemplateService, DeletePrintTemplateService } from "../services/printTemplate.service";
import { GetBingoCardsByRangeService, RangeQuery } from "../services/getBingoCardsByRange.service";
import { DEFAULT_SPONSORS_TITLE, generateTemplateBingoCardsPdf, PrintFigure, PrintSponsor } from "../utils/generateTemplateBingoCardsPdf";
import { buildSampleCard } from "../utils/sampleCard";
import { PrintTemplate } from "../types/printTemplate.types";

const EVENT_VALUES_STORAGE_KEY = "asodifi-print-event-values";
const PRINT_FIGURES_STORAGE_KEY = "asodifi-print-figures";
const PRINT_SPONSORS_STORAGE_KEY = "asodifi-print-sponsors";
/**
 * Tope por orden. Medido con la plantilla y patrocinadores reales: 10.000 hojas
 * consumen ~520 MB de memoria, mientras 20.000 se van a 2,2 GB y una pestaña no
 * lo aguanta. Para tandas mayores conviene partir el rango en varias órdenes.
 */
const MAX_RANGE_CARDS = 10000;
/** Desde aquí la generación deja de ser instantánea y conviene avisarlo. */
const HEAVY_BATCH_CARDS = 3000;

type TopTab = "template" | "print";
type PrintTab = "mass" | "single";
type ContentSection = "event" | "figures" | "sponsors";

const getPrintTemplateService = new GetPrintTemplateService();
const deletePrintTemplateService = new DeletePrintTemplateService();
const getBingoCardsByRangeService = new GetBingoCardsByRangeService();

const rangeCount = (range: RangeQuery): number => {
  if (range.specific?.length) return range.specific.length;
  if (typeof range.start === "number" && typeof range.end === "number") return Math.max(0, range.end - range.start + 1);
  return 0;
};

const loadStoredValues = (): Record<string, string> => {
  try {
    const raw = window.localStorage.getItem(EVENT_VALUES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** La selección de figuras se recuerda entre sesiones: rara vez cambia entre tandas. */
const loadStoredFigureIds = (): number[] => {
  try {
    const raw = window.localStorage.getItem(PRINT_FIGURES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
};

interface SponsorsConfig { title: string; names: string[]; sponsors: PrintSponsor[]; }

const loadStoredSponsors = (): SponsorsConfig => {
  try {
    const raw = window.localStorage.getItem(PRINT_SPONSORS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      title: typeof parsed?.title === "string" ? parsed.title : DEFAULT_SPONSORS_TITLE,
      names: Array.isArray(parsed?.names) ? parsed.names.filter((name: unknown) => typeof name === "string") : [],
      sponsors: Array.isArray(parsed?.sponsors)
        ? parsed.sponsors.filter((sponsor: unknown): sponsor is PrintSponsor => Boolean(sponsor && typeof sponsor === "object" && "id" in sponsor && "name" in sponsor && "url" in sponsor))
        : [],
    };
  } catch {
    return { title: DEFAULT_SPONSORS_TITLE, names: [], sponsors: [] };
  }
};

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<PrintTemplate | null>(null);
  const [topTab, setTopTab] = useState<TopTab>("print");
  const [printTab, setPrintTab] = useState<PrintTab>("mass");
  const [contentSection, setContentSection] = useState<ContentSection>("event");
  const [eventValues, setEventValues] = useState<Record<string, string>>(loadStoredValues);
  const [sponsorsConfig, setSponsorsConfig] = useState<SponsorsConfig>(loadStoredSponsors);
  const [printFigures, setPrintFigures] = useState<PrintFigure[]>([]);
  const [storedFigureIds, setStoredFigureIds] = useState<number[]>(loadStoredFigureIds);

  const [range, setRange] = useState<RangeQuery>({});
  const [isGeneratingMass, setIsGeneratingMass] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [singleId, setSingleId] = useState("");
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [sampleCard] = useState(() => buildSampleCard());

  useEffect(() => {
    getPrintTemplateService.run()
      .then((data) => { setTemplate(data); setTopTab(data ? "print" : "template"); })
      .catch(() => toast.error("No fue posible cargar la plantilla."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EVENT_VALUES_STORAGE_KEY, JSON.stringify(eventValues));
  }, [eventValues]);

  const handleFiguresChange = (figures: PrintFigure[]) => {
    setPrintFigures(figures);
    const ids = figures.map((figure) => figure.id);
    setStoredFigureIds(ids);
    window.localStorage.setItem(PRINT_FIGURES_STORAGE_KEY, JSON.stringify(ids));
  };

  const handleSponsorsChange = (next: SponsorsConfig) => {
    setSponsorsConfig(next);
    window.localStorage.setItem(PRINT_SPONSORS_STORAGE_KEY, JSON.stringify(next));
  };

  const sheetOptions = {
    sponsorNames: sponsorsConfig.names,
    sponsorsTitle: sponsorsConfig.title,
    sponsors: sponsorsConfig.sponsors,
    figures: printFigures,
  };

  const handleUploaded = (uploaded: PrintTemplate) => {
    setTemplate(uploaded);
    setTopTab("template");
  };

  const handleReplaceTemplate = async () => {
    try {
      await deletePrintTemplateService.run();
    } catch (error) {
      console.error("Error eliminando la plantilla:", error);
    }
    setTemplate(null);
  };

  const count = rangeCount(range);
  const exceedsLimit = count > MAX_RANGE_CARDS;

  const handleGenerateMass = async () => {
    if (!template) return;
    if (count === 0) { toast.error("Define un rango o cartones específicos para imprimir."); return; }
    if (exceedsLimit) { toast.error(`Máximo ${MAX_RANGE_CARDS} cartones por orden de impresión.`); return; }

    setIsGeneratingMass(true);
    setProgress({ done: 0, total: count });
    try {
      const cards = await getBingoCardsByRangeService.run(range);
      if (cards.length === 0) { toast.error("No se encontraron cartones para esa selección."); return; }
      const doc = await generateTemplateBingoCardsPdf(cards, template, eventValues, {
        ...sheetOptions,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      doc.save(cards.length === 1 ? `carton-${cards[0].id}.pdf` : `cartones-${cards[0].id}-a-${cards[cards.length - 1].id}.pdf`);
      toast.success(`${cards.length.toLocaleString("es-CO")} ${cards.length === 1 ? "cartón" : "cartones"} listos en ${doc.getNumberOfPages().toLocaleString("es-CO")} hoja(s).`);
    } catch (error) {
      console.error("Error generando el PDF de impresión:", error);
      toast.error("No fue posible generar el PDF.");
    } finally {
      setIsGeneratingMass(false);
      setProgress(null);
    }
  };

  const handleGenerateSingle = async () => {
    if (!template) return;
    const id = Number(singleId);
    if (!Number.isInteger(id) || id <= 0) { toast.error("Ingresa un número de cartón válido."); return; }
    setIsGeneratingSingle(true);
    try {
      const cards = await getBingoCardsByRangeService.run({ specific: [id] });
      if (cards.length === 0) { toast.error(`No existe el cartón #${id}.`); return; }
      const doc = await generateTemplateBingoCardsPdf(cards, template, eventValues, sheetOptions);
      doc.save(`carton-${id}.pdf`);
      toast.success(`Cartón #${id} generado a hoja completa.`);
    } catch (error) {
      console.error("Error generando el PDF individual:", error);
      toast.error("No fue posible generar el PDF.");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  if (isLoading) {
    return (
      <HomePageStyle>
        <div className="loading-state"><AppIcon icon="rotate" /><span>Cargando plantilla…</span></div>
      </HomePageStyle>
    );
  }

  if (!template) {
    return (
      <HomePageStyle>
        <header className="module-head">
          <div><span className="eyebrow">Impresión de cartones</span><h1 className="page-heading">Tu plantilla, lista para imprimir.</h1></div>
        </header>
        <TemplateUploader onUploaded={handleUploaded} />
      </HomePageStyle>
    );
  }

  const previewNode = <TemplatePdfPreview template={template} config={template.config} card={sampleCard} values={eventValues} sheetOptions={sheetOptions} />;
  const filledEventValues = Object.values(eventValues).filter((value) => value.trim()).length;
  const sponsorTotal = sponsorsConfig.sponsors.length + sponsorsConfig.names.filter((name) => name.trim()).length;

  return (
    <HomePageStyle>
      <header className="module-head">
        <div>
          <span className="eyebrow">Impresión de cartones</span>
          <h1 className="page-heading">Órdenes de impresión ASODIFI</h1>
        </div>
        <div className="template-chip">
          <span className="chip-dot" />
          <div className="chip-copy"><strong>Plantilla activa</strong><small>{template.width}×{template.height}px</small></div>
          <AppButton variant="light" icon="edit" label="Cambiar" onClick={handleReplaceTemplate} />
        </div>
      </header>

      <nav className="workflow-tabs">
        <button className={topTab === "template" ? "active" : ""} onClick={() => setTopTab("template")}>
          <span className="workflow-number">01</span>
          <span className="workflow-copy"><small>Preparación</small><strong>Diseñar plantilla</strong><em>Ubica textos y numeración</em></span>
          <AppIcon icon="vector-square" />
        </button>
        <button className={topTab === "print" ? "active" : ""} onClick={() => setTopTab("print")}>
          <span className="workflow-number">02</span>
          <span className="workflow-copy"><small>Producción</small><strong>Generar impresión</strong><em>Configura el contenido y los cartones</em></span>
          <AppIcon icon="receipt" />
        </button>
      </nav>

      {topTab === "template" && (
        <TemplateEditor template={template} onSaved={setTemplate} />
      )}

      {topTab === "print" && (
        <div className="print-workspace">
          <div className="print-controls">
            <section className="content-card surface-card">
              <div className="panel-head">
                <div><span className="kicker">Paso 1 · Contenido</span><h2>¿Qué llevará cada hoja?</h2></div>
                <span className="saved-indicator"><AppIcon icon="check" /> Guardado automático</span>
              </div>

              <div className="setup-tabs">
                <button className={contentSection === "event" ? "active" : ""} onClick={() => setContentSection("event")}>
                  <span className="setup-icon"><AppIcon icon="calendar" /></span>
                  <span><strong>Evento</strong><small>{filledEventValues} datos completados</small></span>
                  <AppIcon icon="angle-right" />
                </button>
                <button className={contentSection === "figures" ? "active" : ""} onClick={() => setContentSection("figures")}>
                  <span className="setup-icon"><AppIcon icon="vector-square" /></span>
                  <span><strong>Figuras</strong><small>{printFigures.length ? `${printFigures.length} en orden` : "Sin seleccionar"}</small></span>
                  <AppIcon icon="angle-right" />
                </button>
                <button className={contentSection === "sponsors" ? "active" : ""} onClick={() => setContentSection("sponsors")}>
                  <span className="setup-icon"><AppIcon icon="certificate" /></span>
                  <span><strong>Patrocinadores</strong><small>{sponsorTotal ? `${sponsorTotal} en la hoja` : "Bloque vacío"}</small></span>
                  <AppIcon icon="angle-right" />
                </button>
              </div>

              <div className="setup-content">
                {contentSection === "event" && (
                  <div className="section-pane"><div className="pane-title"><span>Datos del evento</span><small>Se completan sobre la plantilla sin modificar su diseño.</small></div><DynamicEventForm fields={template.config.fields} values={eventValues} onChange={setEventValues} /></div>
                )}
                {contentSection === "figures" && (
                  <div className="section-pane"><div className="pane-title"><span>Secuencia de figuras</span><small>Selecciona y ordena tal como se jugarán.</small></div><PrintFigureSelector selectedIds={storedFigureIds} onChange={handleFiguresChange} /></div>
                )}
                {contentSection === "sponsors" && (
                  <div className="section-pane"><div className="pane-title"><span>Patrocinadores de la hoja</span><small>Usa logos reales o agrega un nombre cuando no haya imagen.</small></div><PrintSponsorsEditor title={sponsorsConfig.title} names={sponsorsConfig.names} sponsors={sponsorsConfig.sponsors} onChange={handleSponsorsChange} /></div>
                )}
              </div>
            </section>

            <section className="order-card surface-card">
              <div className="panel-head">
                <div><span className="kicker">Paso 2 · Cartones</span><h2>Define la orden de impresión</h2></div>
                <div className="segmented compact">
                  <button className={printTab === "mass" ? "active" : ""} onClick={() => setPrintTab("mass")}>Masiva</button>
                  <button className={printTab === "single" ? "active" : ""} onClick={() => setPrintTab("single")}>Individual</button>
                </div>
              </div>

              {printTab === "mass" ? (
                <div className="order-content">
                  <span className="section-label">Cartones a imprimir</span>
                <PrintRangeSelector onChange={setRange} />
                <div className="stat-chips">
                  <div className="stat"><small>Seleccionados</small><strong>{count.toLocaleString("es-CO")}</strong></div>
                  <div className="stat"><small>Hojas</small><strong>{count.toLocaleString("es-CO")}</strong></div>
                  <div className="stat accent"><small>Formato</small><strong>1 / hoja</strong></div>
                </div>
                {exceedsLimit ? (
                  <div className="limit-warning">
                    <AppIcon icon="triangle-exclamation" />
                    Máximo {MAX_RANGE_CARDS.toLocaleString("es-CO")} cartones por orden. Divide el rango en varias tandas.
                  </div>
                ) : count >= HEAVY_BATCH_CARDS && (
                  <div className="limit-warning is-soft">
                    <AppIcon icon="clock" />
                    Tanda grande: puede tardar cerca de un minuto. No cierres la pestaña hasta que descargue.
                  </div>
                )}

                {progress && (
                  <div className="progress-panel">
                    <div className="progress-head">
                      <span>Armando hojas…</span>
                      <strong>{progress.done.toLocaleString("es-CO")} / {progress.total.toLocaleString("es-CO")}</strong>
                    </div>
                    <div className="progress-track"><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                    <small>Al terminar se comprime el archivo; en tandas grandes eso toma unos segundos más.</small>
                  </div>
                )}
                </div>
            ) : (
              <div className="order-content">
                <span className="section-label">Cartón a reimprimir</span>
                <p className="section-hint">Misma hoja que la impresión masiva, ideal para reemplazar uno dañado o entregar uno suelto.</p>
                <label className="single-field"><span>Número de cartón</span><input type="number" min="1" className="form-input" value={singleId} onChange={(event) => setSingleId(event.target.value)} placeholder="Ej. 1000" /></label>
              </div>
            )}

            <div className="panel-foot">
              <span className="foot-hint"><AppIcon icon="certificate" />Formato carta · una hoja completa por cartón</span>
              {printTab === "mass" ? (
                <AppButton icon="receipt" label={isGeneratingMass ? "Generando…" : "Generar PDF"} onClick={handleGenerateMass} disabled={isGeneratingMass || count === 0 || exceedsLimit} />
              ) : (
                <AppButton icon="receipt" label={isGeneratingSingle ? "Generando…" : "Generar PDF"} onClick={handleGenerateSingle} disabled={isGeneratingSingle} />
              )}
            </div>
            </section>
          </div>

          <aside className="preview-rail surface-card">{previewNode}</aside>
        </div>
      )}
    </HomePageStyle>
  );
};

export default HomePage;

const HomePageStyle = styled.div`
  .loading-state { display: flex; min-height: 320px; align-items: center; justify-content: center; flex-direction: column; gap: .8rem; color: var(--text-muted); font-size: .78rem; }
  .loading-state svg { font-size: 1.4rem; animation: spin 1.1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .template-chip { display: flex; align-items: center; gap: .7rem; padding: .5rem .5rem .5rem .85rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 13px; }
  .chip-dot { width: 8px; height: 8px; flex: 0 0 8px; background: var(--color-secondary); border-radius: 50%; box-shadow: 0 0 0 4px rgba(var(--color-secondary-rgb),.12); }
  .chip-copy { display: flex; flex-direction: column; line-height: 1.2; }
  .chip-copy strong { font-size: .72rem; font-weight: 600; }
  .chip-copy small { color: var(--text-muted); font-size: .6rem; }

  .workflow-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-bottom: 1.25rem; }
  .workflow-tabs > button { position: relative; display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: .8rem; min-width: 0; padding: .8rem 1rem; color: var(--text-muted); text-align: left; background: rgba(0,0,0,.14); border: 1px solid var(--border-subtle); border-radius: 14px; cursor: pointer; overflow: hidden; transition: border-color .18s ease, background .18s ease, transform .18s ease; }
  .workflow-tabs > button:hover { color: var(--text-secondary); border-color: var(--border-strong); transform: translateY(-1px); }
  .workflow-tabs > button.active { color: var(--text-primary); background: linear-gradient(120deg, rgba(var(--color-primary-rgb),.18), rgba(var(--color-secondary-rgb),.06)); border-color: rgba(var(--color-primary-rgb),.5); box-shadow: inset 3px 0 0 var(--color-primary), 0 10px 24px rgba(0,0,0,.13); }
  .workflow-number { display: grid; width: 38px; height: 38px; place-items: center; color: #b9abff; background: rgba(var(--color-primary-rgb),.12); border: 1px solid rgba(var(--color-primary-rgb),.25); border-radius: 11px; font-size: .62rem; font-weight: 700; }
  .workflow-copy { display: flex; min-width: 0; flex-direction: column; }
  .workflow-copy small { color: var(--color-secondary); font-size: .52rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .workflow-copy strong { margin-top: .12rem; color: inherit; font-size: .76rem; }
  .workflow-copy em { margin-top: .08rem; overflow: hidden; color: var(--text-muted); font-size: .58rem; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
  .workflow-tabs > button > svg { color: rgba(255,255,255,.18); font-size: 1rem; }
  .workflow-tabs > button.active > svg { color: var(--color-secondary); }

  .segmented { display: inline-flex; gap: .25rem; padding: .28rem; background: rgba(0,0,0,.2); border: 1px solid var(--border-subtle); border-radius: 12px; }
  .segmented button { display: flex; align-items: center; gap: .5rem; padding: .58rem 1rem; color: var(--text-muted); white-space: nowrap; background: transparent; border: 0; border-radius: 9px; font-size: .72rem; font-weight: 600; cursor: pointer; transition: background .18s ease, color .18s ease; }
  .segmented button svg { font-size: .78rem; }
  .segmented button:hover { color: var(--text-primary); }
  .segmented button.active { color: #fff; background: linear-gradient(135deg, #8a6bff, #6847f2); box-shadow: 0 6px 16px rgba(104,71,242,.25); }
  .segmented.compact button { padding: .48rem .85rem; font-size: .68rem; }
  .top-segmented { margin-bottom: 1.25rem; }

  .print-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 1.25rem; align-items: start; }
  .print-controls { display: flex; min-width: 0; flex-direction: column; gap: 1rem; }
  .content-card, .order-card { padding: 0; overflow: hidden; }
  .control-panel { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.3rem; border-bottom: 1px solid var(--border-subtle); }
  .kicker { color: var(--color-secondary); font-size: .6rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .panel-head h2 { margin: .3rem 0 0; color: var(--text-primary); font-size: 1rem; font-weight: 600; }
  .saved-indicator { display: flex; align-items: center; gap: .35rem; color: var(--text-muted); font-size: .58rem; }
  .saved-indicator svg { color: var(--color-secondary); }
  .setup-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; padding: .8rem; background: rgba(0,0,0,.08); border-bottom: 1px solid var(--border-subtle); }
  .setup-tabs > button { display: grid; grid-template-columns: 32px minmax(0,1fr) auto; align-items: center; gap: .55rem; min-width: 0; padding: .65rem; color: var(--text-muted); text-align: left; background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 11px; cursor: pointer; transition: background .16s ease, border-color .16s ease; }
  .setup-tabs > button:hover { border-color: var(--border-strong); }
  .setup-tabs > button.active { color: var(--text-primary); background: rgba(var(--color-primary-rgb),.12); border-color: rgba(var(--color-primary-rgb),.45); }
  .setup-tabs > button > span:nth-child(2) { display: flex; min-width: 0; flex-direction: column; }
  .setup-tabs strong { font-size: .66rem; }
  .setup-tabs small { margin-top: .12rem; overflow: hidden; color: var(--text-muted); font-size: .54rem; text-overflow: ellipsis; white-space: nowrap; }
  .setup-tabs > button > svg { color: var(--text-muted); font-size: .55rem; }
  .setup-tabs > button.active > svg { color: var(--color-secondary); }
  .setup-icon { display: grid; width: 32px; height: 32px; place-items: center; color: #b8a9ff; background: rgba(var(--color-primary-rgb),.1); border-radius: 9px; font-size: .72rem; }
  .setup-tabs > button.active .setup-icon { color: #fff; background: linear-gradient(135deg, #8a6bff, #6847f2); }
  .setup-content { padding: 1.1rem 1.3rem 1.25rem; }
  .pane-title { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
  .pane-title span { color: var(--text-secondary); font-size: .72rem; font-weight: 700; }
  .pane-title small { color: var(--text-muted); font-size: .58rem; text-align: right; }
  .order-content { padding: 1.1rem 1.3rem; border-bottom: 1px solid var(--border-subtle); }
  .panel-section { padding: 1.1rem 1.3rem; border-bottom: 1px solid var(--border-subtle); }
  .section-label { display: block; margin-bottom: .8rem; color: var(--text-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .section-hint { margin: -.4rem 0 .9rem; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .stat-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; margin-top: 1rem; }
  .stat { padding: .7rem .8rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 11px; }
  .stat small { display: block; color: var(--text-muted); font-size: .56rem; text-transform: uppercase; letter-spacing: .04em; }
  .stat strong { display: block; margin-top: .25rem; color: var(--text-primary); font-size: 1rem; }
  .stat.accent { background: rgba(var(--color-primary-rgb),.1); border-color: rgba(var(--color-primary-rgb),.25); }
  .stat.accent strong { color: #b7a8ff; }
  .limit-warning { display: flex; align-items: center; gap: .5rem; margin-top: 1rem; padding: .7rem .9rem; color: var(--color-danger); background: rgba(var(--color-danger-rgb),.08); border: 1px solid rgba(var(--color-danger-rgb),.25); border-radius: 10px; font-size: .68rem; }
  .limit-warning.is-soft { color: var(--color-accent); background: rgba(255,184,77,.08); border-color: rgba(255,184,77,.24); }
  .progress-panel { margin-top: 1rem; padding: .8rem .9rem; background: rgba(var(--color-primary-rgb),.07); border: 1px solid rgba(var(--color-primary-rgb),.22); border-radius: 11px; }
  .progress-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .5rem; color: var(--text-secondary); font-size: .68rem; }
  .progress-head strong { color: #b7a8ff; font-family: "Poppins", sans-serif; font-size: .72rem; }
  .progress-track { height: 6px; overflow: hidden; background: rgba(255,255,255,.07); border-radius: 99px; }
  .progress-track i { display: block; height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: inherit; transition: width .2s ease; }
  .progress-panel small { display: block; margin-top: .5rem; color: var(--text-muted); font-size: .6rem; }

  .sponsor-note { display: flex; align-items: flex-start; gap: .6rem; padding: .7rem .85rem; background: rgba(var(--color-secondary-rgb),.07); border: 1px solid rgba(var(--color-secondary-rgb),.22); border-radius: 11px; }
  .sponsor-note svg { color: var(--color-secondary); font-size: .78rem; }
  .sponsor-note.is-empty { background: rgba(255,184,77,.07); border-color: rgba(255,184,77,.24); }
  .sponsor-note.is-empty svg { color: var(--color-accent); }
  .sponsor-note strong { display: block; font-size: .72rem; font-weight: 600; }
  .sponsor-note small { display: block; margin-top: .25rem; color: var(--text-muted); font-size: .64rem; line-height: 1.5; }

  .single-field { display: flex; flex-direction: column; gap: .4rem; max-width: 220px; }
  .single-field > span { color: var(--text-muted); font-size: .6rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .panel-foot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.3rem; }
  .foot-hint { display: flex; align-items: center; gap: .45rem; color: var(--text-muted); font-size: .66rem; }
  .foot-hint svg { color: var(--color-accent); }

  .preview-rail { position: sticky; top: 1rem; padding: 1rem; }

  @media (max-width: 900px) {
    .print-workspace { grid-template-columns: 1fr; }
    .preview-rail { position: static; max-width: 360px; }
    .module-head { flex-direction: column; align-items: flex-start; }
  }
  @media (max-width: 650px) {
    .workflow-tabs { grid-template-columns: 1fr; }
    .setup-tabs { grid-template-columns: 1fr; }
    .pane-title { flex-direction: column; gap: .2rem; }
    .pane-title small { text-align: left; }
    .panel-foot { align-items: stretch; flex-direction: column; }
  }
`;
