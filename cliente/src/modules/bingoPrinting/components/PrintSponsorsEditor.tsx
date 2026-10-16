import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { getSponsorUrl, listSponsors, SponsorAsset } from "../../bingoCustomization/services/sponsors.service";
import type { PrintSponsor } from "../utils/generateTemplateBingoCardsPdf";

interface PrintSponsorsEditorProps {
  title: string;
  names: string[];
  sponsors: PrintSponsor[];
  onChange: (value: { title: string; names: string[]; sponsors: PrintSponsor[] }) => void;
}

const MAX_PRINT_SPONSORS = 8;

const PrintSponsorsEditor: React.FC<PrintSponsorsEditorProps> = ({ title, names, sponsors, onChange }) => {
  const [assets, setAssets] = useState<SponsorAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listSponsors()
      .then((items) => setAssets(items.filter((asset) => asset.mediaType === "image")))
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const change = (patch: Partial<{ title: string; names: string[]; sponsors: PrintSponsor[] }>) =>
    onChange({ title, names, sponsors, ...patch });

  const toggleAsset = (asset: SponsorAsset) => {
    const isSelected = sponsors.some((sponsor) => sponsor.id === asset.id);
    if (!isSelected && sponsors.length + names.filter((name) => name.trim()).length >= MAX_PRINT_SPONSORS) return;
    change({
      sponsors: isSelected
        ? sponsors.filter((sponsor) => sponsor.id !== asset.id)
        : [...sponsors, { id: asset.id, name: asset.name, url: getSponsorUrl(asset.url) }],
    });
  };

  const updateName = (index: number, value: string) => change({ names: names.map((name, itemIndex) => itemIndex === index ? value : name) });
  const removeName = (index: number) => change({ names: names.filter((_, itemIndex) => itemIndex !== index) });
  const filledNames = names.filter((name) => name.trim()).length;
  const total = sponsors.length + filledNames;

  return (
    <PrintSponsorsEditorStyle>
      <div className="sponsor-toolbar">
        <label className="title-field">
          <span>Título de la sección</span>
          <input className="form-input" value={title} onChange={(event) => change({ title: event.target.value })} placeholder="Patrocinadores" />
        </label>
        <div className="capacity"><strong>{total}/{MAX_PRINT_SPONSORS}</strong><span>espacios usados</span></div>
      </div>

      <div className="subhead">
        <div><strong>Logos disponibles</strong><small>Se imprimirán con su imagen y nombre.</small></div>
        {sponsors.length > 0 && <button type="button" onClick={() => change({ sponsors: [] })}>Limpiar selección</button>}
      </div>

      {isLoading ? (
        <div className="state"><AppIcon icon="rotate" /> Cargando logos…</div>
      ) : assets.length > 0 ? (
        <div className="asset-grid">
          {assets.map((asset) => {
            const isSelected = sponsors.some((sponsor) => sponsor.id === asset.id);
            const isDisabled = !isSelected && total >= MAX_PRINT_SPONSORS;
            return (
              <button type="button" key={asset.id} className={isSelected ? "selected" : ""} disabled={isDisabled} onClick={() => toggleAsset(asset)}>
                <span className="logo-stage"><img src={getSponsorUrl(asset.url)} alt="" /></span>
                <span className="asset-name">{asset.name}</span>
                {isSelected && <i><AppIcon icon="check" /></i>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="state"><AppIcon icon="image" /> No hay logos de imagen en Personalización.</div>
      )}

      <details className="manual-area" open={names.length > 0}>
        <summary><span><AppIcon icon="font" /> Patrocinadores sin logo</span><small>Opcional</small></summary>
        <div className="manual-content">
          {names.map((name, index) => (
            <div className="name-row" key={index}>
              <span>{index + 1}</span>
              <input className="form-input" value={name} onChange={(event) => updateName(index, event.target.value)} placeholder="Nombre del patrocinador" />
              <button type="button" onClick={() => removeName(index)} aria-label="Quitar"><AppIcon icon="times" /></button>
            </div>
          ))}
          <button type="button" className="add-name" disabled={total >= MAX_PRINT_SPONSORS} onClick={() => change({ names: [...names, ""] })}>
            <AppIcon icon="plus" /> Agregar nombre manual
          </button>
        </div>
      </details>
    </PrintSponsorsEditorStyle>
  );
};

export default PrintSponsorsEditor;

const PrintSponsorsEditorStyle = styled.div`
  .sponsor-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
  .title-field { display: flex; flex: 1; max-width: 300px; flex-direction: column; gap: .35rem; }
  .title-field > span { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .capacity { display: flex; align-items: baseline; gap: .35rem; color: var(--text-muted); }
  .capacity strong { color: #c0b2ff; font-size: 1rem; }
  .capacity span { font-size: .58rem; }
  .subhead { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: .55rem; }
  .subhead div { display: flex; flex-direction: column; }
  .subhead strong { color: var(--text-secondary); font-size: .67rem; }
  .subhead small { margin-top: .12rem; color: var(--text-muted); font-size: .58rem; }
  .subhead button { padding: 0; color: #b7a8ff; background: none; border: 0; font-size: .58rem; cursor: pointer; }
  .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(105px, 1fr)); gap: .5rem; max-height: 220px; overflow-y: auto; padding: .1rem .2rem .2rem 0; }
  .asset-grid > button { position: relative; display: flex; min-width: 0; flex-direction: column; gap: .35rem; padding: .45rem; color: var(--text-secondary); background: rgba(0,0,0,.14); border: 1px solid var(--border-subtle); border-radius: 11px; cursor: pointer; transition: border-color .16s ease, background .16s ease, transform .16s ease; }
  .asset-grid > button:hover:not(:disabled) { border-color: var(--border-strong); transform: translateY(-1px); }
  .asset-grid > button.selected { background: rgba(var(--color-primary-rgb),.12); border-color: rgba(var(--color-primary-rgb),.65); }
  .asset-grid > button:disabled { opacity: .38; cursor: not-allowed; }
  .logo-stage { display: grid; height: 52px; place-items: center; padding: .3rem; overflow: hidden; background: rgba(255,255,255,.92); border-radius: 7px; }
  .logo-stage img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
  .asset-name { overflow: hidden; font-size: .57rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .asset-grid i { position: absolute; top: .25rem; right: .25rem; display: grid; width: 17px; height: 17px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 50%; font-size: .48rem; }
  .state { display: flex; align-items: center; gap: .45rem; min-height: 66px; justify-content: center; color: var(--text-muted); background: rgba(0,0,0,.1); border: 1px dashed var(--border-subtle); border-radius: 10px; font-size: .64rem; }
  .manual-area { margin-top: .8rem; border: 1px solid var(--border-subtle); border-radius: 10px; }
  .manual-area summary { display: flex; align-items: center; justify-content: space-between; padding: .65rem .75rem; color: var(--text-secondary); font-size: .64rem; font-weight: 600; cursor: pointer; list-style: none; }
  .manual-area summary span { display: flex; align-items: center; gap: .4rem; }
  .manual-area summary small { color: var(--text-muted); font-size: .54rem; font-weight: 500; }
  .manual-content { display: flex; flex-direction: column; gap: .4rem; padding: 0 .7rem .7rem; }
  .name-row { display: grid; grid-template-columns: 20px 1fr 28px; align-items: center; gap: .35rem; }
  .name-row > span { color: var(--text-muted); font-size: .58rem; text-align: center; }
  .name-row > button { display: grid; width: 28px; height: 28px; place-items: center; color: var(--color-danger); background: rgba(var(--color-danger-rgb),.07); border: 1px solid rgba(var(--color-danger-rgb),.16); border-radius: 7px; cursor: pointer; }
  .add-name { align-self: flex-start; display: flex; align-items: center; gap: .35rem; padding: .4rem .65rem; color: #b7a8ff; background: rgba(var(--color-primary-rgb),.08); border: 1px solid rgba(var(--color-primary-rgb),.22); border-radius: 8px; font-size: .6rem; font-weight: 600; cursor: pointer; }
  .add-name:disabled { opacity: .4; cursor: not-allowed; }
`;
