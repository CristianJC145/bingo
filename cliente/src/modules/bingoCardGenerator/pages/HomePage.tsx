import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";
import ExportToExcel from "../../../shared/components/ExportToExcel";
import CardsManager from "../components/CardsManager";
import CardLookup from "../components/CardLookup";
import { getLastBingoCardId, saveBingoCard, setLastBingoCardId } from "../services/bingo.service";

type TabKey = "generate" | "inventory" | "lookup";
const TABS: { key: TabKey; label: string; icon: "clone" | "list" | "search" }[] = [
  { key: "generate", label: "Generar", icon: "clone" },
  { key: "inventory", label: "Inventario", icon: "list" },
  { key: "lookup", label: "Buscar cartón", icon: "search" },
];

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("generate");
  const [lastId, setLastId] = useState(0);
  const [numCards, setNumCards] = useState(1);

  const refreshLastId = async () => {
    const { value } = await getLastBingoCardId();
    setLastId(value);
  };

  useEffect(() => {
    refreshLastId();
  }, []);

  const generateBingoCard = (id: number): { id: number; card: number[][] } => {
    const card: number[][] = [];
    const columnRanges = [{ start: 1, end: 15 }, { start: 16, end: 30 }, { start: 31, end: 45 }, { start: 46, end: 60 }, { start: 61, end: 75 }];
    for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
      const column: number[] = [];
      while (column.length < 5) {
        const number = Math.floor(Math.random() * (columnRanges[columnIndex].end - columnRanges[columnIndex].start + 1)) + columnRanges[columnIndex].start;
        if (!column.includes(number)) column.push(number);
      }
      card.push(column);
    }
    card[2][2] = id;
    return { id, card };
  };

  const generateBingoCards = async () => {
    if (!Number.isFinite(numCards) || numCards < 1) { toast.error("Indica una cantidad válida de cartones."); return; }
    const newCards: number[][][] = [];
    for (let index = 0; index < numCards; index++) {
      const newCard = generateBingoCard(lastId + index + 1);
      await saveBingoCard(newCard.card);
      newCards.push(newCard.card);
    }
    setLastId(lastId + numCards);
    await setLastBingoCardId(lastId + numCards);
    toast.success(`${numCards} ${numCards === 1 ? "cartón generado" : "cartones generados"}`);
  };

  const preview = generateBingoCard(lastId + 1).card;
  const previewRows = preview[0].map((_, rowIndex) => preview.map((column) => column[rowIndex]));

  return (
    <HomePageStyle>
      <div className="page-intro"><div><span className="eyebrow">Recursos de impresión</span><h1 className="page-heading">Cartones listos para cada partida.</h1><p className="page-description">Genera nuevas series numeradas y exporta el inventario completo para preparar la impresión.</p></div><ExportToExcel /></div>

      <div className="tab-nav">
        {TABS.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            <AppIcon icon={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "generate" && (
        <div className="generator-grid">
          <section className="generator-card surface-card">
            <span className="card-kicker">Nueva serie</span>
            <h2>¿Cuántos cartones necesitas?</h2>
            <p>Los números continuarán automáticamente desde el último cartón registrado.</p>
            <label><span>Cantidad de cartones</span><div className="quantity-control"><button type="button" onClick={() => setNumCards(Math.max(1, numCards - 1))}>−</button><input type="number" min="1" max="1000" value={numCards} onChange={(event) => setNumCards(Number(event.target.value))} /><button type="button" onClick={() => setNumCards(numCards + 1)}>+</button></div></label>
            <div className="series-summary"><div><small>Desde</small><strong>#{String(lastId + 1).padStart(4, "0")}</strong></div><span>→</span><div><small>Hasta</small><strong>#{String(lastId + Math.max(1, numCards)).padStart(4, "0")}</strong></div></div>
            <AppButton icon="clone" label={numCards === 1 ? "Generar cartón" : `Generar ${numCards} cartones`} onClick={generateBingoCards} />
          </section>

          <section className="preview-card surface-card">
            <div className="preview-heading"><div><span className="card-kicker">Vista previa</span><h2>Próximo cartón</h2></div><span className="preview-id">#{String(lastId + 1).padStart(4, "0")}</span></div>
            <div className="bingo-card-preview"><BingoCardVisual values={previewRows} cardId={lastId + 1} label="Próxima serie" /></div>
            <div className="preview-note"><span>Vista de referencia</span><small>El contenido definitivo se genera de forma aleatoria al guardar.</small></div>
          </section>

          <section className="inventory-card surface-card"><span className="card-kicker">Inventario actual</span><div className="inventory-number">{lastId.toLocaleString("es-CO")}</div><p>cartones numerados en la base de datos</p><div className="inventory-progress"><span style={{ width: `${Math.min(100, (lastId / Math.max(lastId, 1000)) * 100)}%` }} /></div><small>Último identificador: #{String(lastId).padStart(4, "0")}</small></section>
        </div>
      )}

      {activeTab === "inventory" && <CardsManager onImported={refreshLastId} />}

      {activeTab === "lookup" && <CardLookup />}
    </HomePageStyle>
  );
};

export default HomePage;

const HomePageStyle = styled.div`
  .page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; }
  .tab-nav { display: flex; gap: .4rem; margin-bottom: 1.25rem; padding: .3rem; background: rgba(0,0,0,.18); border: 1px solid var(--border-subtle); border-radius: 13px; width: fit-content; }
  .tab-nav button { display: flex; align-items: center; gap: .5rem; padding: .62rem 1.1rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 9px; font-size: .74rem; font-weight: 600; cursor: pointer; transition: background .18s ease, color .18s ease; }
  .tab-nav button:hover { color: var(--text-primary); }
  .tab-nav button.active { color: #fff; background: linear-gradient(135deg, #8a6bff, #6847f2); box-shadow: 0 8px 20px rgba(104,71,242,.25); }
  .generator-grid { display: grid; grid-template-columns: minmax(300px, .8fr) minmax(380px, 1.2fr); gap: 1.25rem; align-items: stretch; }
  .generator-card, .preview-card, .inventory-card { padding: clamp(1.25rem, 2vw, 1.7rem); }
  .generator-card { grid-row: span 2; }
  .card-kicker { color: var(--color-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .5rem 0 .35rem; color: var(--text-primary); font-size: 1.15rem; font-weight: 600; }
  p { margin: 0; color: var(--text-secondary); font-size: .75rem; line-height: 1.6; }
  label { display: flex; flex-direction: column; gap: .5rem; margin: 1.6rem 0 1rem; }
  label > span { color: var(--text-muted); font-size: .64rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
  .quantity-control { display: grid; grid-template-columns: 44px 1fr 44px; overflow: hidden; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 13px; }
  .quantity-control button { color: var(--text-secondary); background: transparent; border: 0; font-size: 1.2rem; cursor: pointer; }
  .quantity-control button:hover { color: #fff; background: rgba(255,255,255,.04); }
  .quantity-control input { width: 100%; padding: .8rem; color: #fff; text-align: center; background: transparent; border: 0; border-right: 1px solid var(--border-subtle); border-left: 1px solid var(--border-subtle); outline: 0; font-weight: 700; }
  .series-summary { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: .9rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 12px; }
  .series-summary > div { display: flex; flex-direction: column; }
  .series-summary small { color: var(--text-muted); font-size: .58rem; text-transform: uppercase; }
  .series-summary strong { margin-top: .2rem; font-size: .8rem; }
  .series-summary > span { color: var(--color-primary); }
  .generator-card > div:last-child .vs-btn { width: 100%; }
  .preview-heading { display: flex; align-items: flex-start; justify-content: space-between; }
  .preview-id { padding: .4rem .55rem; color: #baaaff; background: rgba(var(--color-primary-rgb),.1); border-radius: 8px; font-size: .65rem; font-weight: 700; }
  .bingo-card-preview { display: flex; justify-content: center; margin: 1.1rem auto; }
  .preview-note { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
  .preview-note span { color: var(--text-secondary); font-size: .66rem; font-weight: 600; }
  .preview-note small { color: var(--text-muted); font-size: .58rem; text-align: right; }
  .inventory-card { position: relative; overflow: hidden; }
  .inventory-card::after { position: absolute; right: -25px; bottom: -45px; width: 150px; height: 150px; content: ""; background: rgba(var(--color-primary-rgb),.08); border-radius: 50%; }
  .inventory-number { margin-top: .6rem; color: #fff; font-family: "Poppins", sans-serif; font-size: 2.2rem; font-weight: 700; }
  .inventory-progress { height: 5px; margin: 1.1rem 0 .6rem; overflow: hidden; background: rgba(255,255,255,.05); border-radius: 99px; }
  .inventory-progress span { display: block; height: 100%; background: linear-gradient(90deg,var(--color-primary),var(--color-secondary)); border-radius: inherit; }
  .inventory-card small { color: var(--text-muted); font-size: .62rem; }
  @media (max-width: 850px) { .generator-grid { grid-template-columns: 1fr; } .generator-card { grid-row: auto; } }
  @media (max-width: 600px) { .page-intro { align-items: flex-start; flex-direction: column; } .tab-nav { width: 100%; overflow-x: auto; } }
`;
