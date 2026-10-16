import React, { useState } from "react";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";
import { GetBingoCardByIdService } from "../services/getBingoCardById.service";

const getBingoCardByIdService = new GetBingoCardByIdService();

const CardLookup: React.FC = () => {
  const [inputId, setInputId] = useState("");
  const [card, setCard] = useState<number[][] | null>(null);
  const [foundId, setFoundId] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "not-found" | "invalid">("idle");

  const handleSearch = async () => {
    const numericId = Number(inputId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setStatus("invalid");
      setCard(null);
      return;
    }

    setStatus("loading");
    try {
      const result = await getBingoCardByIdService.run(numericId);
      setCard(result.card);
      setFoundId(result.id);
      setStatus("idle");
    } catch {
      setCard(null);
      setFoundId(null);
      setStatus("not-found");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSearch();
  };

  const previewRows = card ? card[0].map((_, rowIndex) => card.map((column) => column[rowIndex])) : undefined;

  return (
    <CardLookupStyle className="surface-card">
      <div className="lookup-intro">
        <span className="eyebrow">Verificación</span>
        <h2>Revisar un cartón individual</h2>
        <p>Ingresa el número de cartón para ver su diseño y numeración exacta.</p>
      </div>

      <div className="lookup-search">
        <input
          type="number"
          min="1"
          placeholder="Ej. 1000"
          value={inputId}
          onChange={(event) => { setInputId(event.target.value); setStatus("idle"); }}
          onKeyDown={handleKeyDown}
        />
        <AppButton icon="search" label={status === "loading" ? "Buscando…" : "Buscar"} onClick={handleSearch} disabled={status === "loading"} />
      </div>

      {status === "invalid" && <div className="lookup-message error"><AppIcon icon="triangle-exclamation" />Ingresa un número de cartón válido.</div>}
      {status === "not-found" && <div className="lookup-message error"><AppIcon icon="triangle-exclamation" />No existe un cartón con ese número.</div>}

      {card && foundId !== null && (
        <div className="lookup-result">
          <BingoCardVisual values={previewRows} cardId={foundId} label="Cartón encontrado" />
        </div>
      )}

      {!card && status === "idle" && (
        <div className="lookup-empty">
          <AppIcon icon="vector-square" />
          <span>Busca un cartón para ver su vista previa.</span>
        </div>
      )}
    </CardLookupStyle>
  );
};

export default CardLookup;

const CardLookupStyle = styled.div`
  padding: clamp(1.25rem, 2vw, 1.7rem);
  .lookup-intro { margin-bottom: 1.4rem; }
  .eyebrow { color: var(--color-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .5rem 0 .35rem; color: var(--text-primary); font-size: 1.15rem; font-weight: 600; }
  p { margin: 0; color: var(--text-secondary); font-size: .75rem; line-height: 1.6; }
  .lookup-search { display: flex; gap: .6rem; max-width: 420px; margin-bottom: 1.2rem; }
  .lookup-search input { flex: 1; padding: .8rem .9rem; color: var(--text-primary); background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 11px; outline: 0; font-size: .78rem; }
  .lookup-search input:focus { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.1); }
  .lookup-message { display: flex; align-items: center; gap: .5rem; max-width: 420px; margin-bottom: 1.2rem; padding: .7rem .9rem; border-radius: 10px; font-size: .72rem; }
  .lookup-message.error { color: var(--color-danger); background: rgba(var(--color-danger-rgb),.08); border: 1px solid rgba(var(--color-danger-rgb),.25); }
  .lookup-result { display: flex; justify-content: center; margin-top: .5rem; }
  .lookup-empty { display: flex; min-height: 200px; align-items: center; justify-content: center; flex-direction: column; gap: .8rem; color: var(--text-muted); text-align: center; }
  .lookup-empty svg { font-size: 1.5rem; }
`;
