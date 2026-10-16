import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { createPersonSponsor, deleteSponsor, getSponsorInitials, getSponsorMime, getSponsorUrl, isPersonSponsor, listSponsors, SponsorAsset, uploadSponsor } from "../services/sponsors.service";

const maxSize = 40 * 1024 * 1024;
type SponsorKind = "brand" | "person";
type PersonKind = "particular" | "role";

const SponsorManager: React.FC = () => {
  const [assets, setAssets] = useState<SponsorAsset[]>([]);
  const [kind, setKind] = useState<SponsorKind>("brand");
  const [personKind, setPersonKind] = useState<PersonKind>("particular");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SponsorAsset | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try { setAssets(await listSponsors()); }
    catch { toast.error("No fue posible cargar los patrocinadores."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    const mime = getSponsorMime(selected);
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) { toast.error("Los patrocinadores deben cargarse como logos PNG, JPG, WEBP o GIF."); return; }
    if (selected.size > maxSize) { toast.error("El archivo supera el límite de 40 MB."); return; }
    setFile(selected);
    if (!name.trim()) setName(selected.name.replace(/\.[^.]+$/, "").slice(0, 60));
  };

  const save = async () => {
    if (!name.trim() || (kind === "brand" && !file) || (kind === "person" && personKind === "role" && !role.trim())) return;
    setSaving(true);
    try {
      const created = kind === "person"
        ? await createPersonSponsor(name.trim(), personKind === "role" ? role.trim() : undefined)
        : await uploadSponsor(name.trim(), file as File);
      setAssets((current) => [...current, created]);
      setName(""); setRole(""); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(kind === "person" ? "Patrocinador personal agregado al overlay." : "Logo agregado al overlay.");
    } catch { toast.error("No fue posible guardar el patrocinador."); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!toDelete) return;
    try { await deleteSponsor(toDelete.id); setAssets((current) => current.filter((item) => item.id !== toDelete.id)); setToDelete(null); toast.success("Patrocinador eliminado."); }
    catch { toast.error("No fue posible eliminar el patrocinador."); }
  };

  return <SponsorStyle className="surface-card">
    <div className="sponsor-heading"><div><span>Escena OBS</span><h2>Patrocinadores</h2><p>Combina logos y personas; el overlay organiza y rota cada reconocimiento automáticamente.</p></div><span className="asset-count">{assets.length} patrocinador{assets.length === 1 ? "" : "es"}</span></div>
    <div className="sponsor-layout">
      <div className="sponsor-form">
        <div className="kind-selector" role="group" aria-label="Tipo de patrocinador"><button className={kind === "brand" ? "active" : ""} type="button" onClick={() => setKind("brand")}><AppIcon icon="image" /><span><strong>Marca</strong><small>Con logo</small></span></button><button className={kind === "person" ? "active" : ""} type="button" onClick={() => setKind("person")}><AppIcon icon="user" /><span><strong>Persona</strong><small>Con o sin cargo</small></span></button></div>
        <label className="text-field"><span>{kind === "person" ? "Nombre de la persona" : "Nombre del patrocinador"}</span><input value={name} maxLength={90} onChange={(event) => setName(event.target.value)} placeholder={kind === "person" ? "Ej. Pepito Pérez" : "Ej. Marca principal"} /></label>
        {kind === "person" ? <>
          <div className="person-kind" role="group" aria-label="Presentación de la persona"><button className={personKind === "particular" ? "active" : ""} type="button" onClick={() => setPersonKind("particular")}>Particular</button><button className={personKind === "role" ? "active" : ""} type="button" onClick={() => setPersonKind("role")}>Con cargo u organización</button></div>
          {personKind === "role" && <label className="text-field"><span>Cargo u organización</span><textarea value={role} maxLength={120} rows={2} onChange={(event) => setRole(event.target.value)} placeholder="Ej. Representante a la Cámara" /></label>}
          <div className={`person-preview ${personKind === "particular" ? "particular" : ""}`}><span>{getSponsorInitials(name) || "PP"}</span><div><strong>{name.trim() || "Nombre del patrocinador"}</strong>{personKind === "role" ? <small>{role.trim() || "Cargo u organización"}</small> : <small>Patrocinador particular</small>}</div></div>
        </> : <label className={`media-drop ${file ? "ready" : ""}`}><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => selectFile(event.target.files?.[0])} /><AppIcon icon={file ? "check" : "image"} /><strong>{file?.name ?? "Adjuntar logo"}</strong><small>{file ? "Listo para publicar" : "PNG, JPG, WEBP o GIF · Fondo transparente recomendado"}</small></label>}
        <AppButton icon="plus" label={saving ? "Publicando…" : "Agregar al overlay"} disabled={saving || !name.trim() || (kind === "brand" ? !file : personKind === "role" && !role.trim())} onClick={save} />
      </div>
      <div className="sponsor-library">
        {loading ? <div className="sponsor-empty">Cargando recursos…</div> : assets.length === 0 ? <div className="sponsor-empty"><AppIcon icon="image" /><strong>Sin patrocinadores</strong><small>La franja del overlay mostrará una reserva visual hasta que agregues uno.</small></div> : assets.map((asset, index) => {
          const person = isPersonSponsor(asset);
          return <article className={person ? "person-item" : ""} key={asset.id}><div className={`media-thumb ${person ? "person-thumb" : ""}`}>{person ? getSponsorInitials(asset.name) : asset.mediaType === "video" ? <video src={getSponsorUrl(asset.url)} muted /> : <img src={getSponsorUrl(asset.url)} alt="" />}</div><span className="asset-order">{String(index + 1).padStart(2,"0")}</span><div><strong>{asset.name}</strong><small>{person ? asset.role || "Patrocinador" : asset.mediaType === "video" ? "Video heredado" : "Logo · Visible en el mosaico"}</small></div><button type="button" onClick={() => setToDelete(asset)} aria-label={`Eliminar ${asset.name}`}><AppIcon icon="trash-alt" /></button></article>;
        })}
      </div>
    </div>
    <AppModal title="Eliminar patrocinador" isOpen={Boolean(toDelete)} onClose={() => setToDelete(null)}><div className="remove-sponsor"><AppIcon icon="trash-alt" /><h3>¿Eliminar “{toDelete?.name}”?</h3><p>Dejará de aparecer en la transmisión.</p><div><AppButton variant="transparent" label="Cancelar" onClick={() => setToDelete(null)} /><AppButton variant="light" label="Eliminar" icon="trash-alt" onClick={remove} /></div></div></AppModal>
  </SponsorStyle>;
};

export default SponsorManager;

const SponsorStyle = styled.section`
  margin-top: 1.25rem; padding: 1.25rem;
  .sponsor-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .sponsor-heading > div { display: flex; flex-direction: column; }
  .sponsor-heading > div > span { color: var(--color-secondary); font-size: .52rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  h2 { margin: .25rem 0; color: #fff; font-size: .95rem; }
  .sponsor-heading p { margin: 0; color: var(--text-muted); font-size: .6rem; }
  .asset-count { padding: .4rem .55rem; color: #b7a9ff; background: rgba(var(--color-primary-rgb),.08); border-radius: 8px; font-size: .52rem; font-weight: 700; }
  .sponsor-layout { display: grid; grid-template-columns: minmax(260px,.68fr) minmax(380px,1.32fr); gap: 1rem; }
  .sponsor-form { padding: .85rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .kind-selector { display:grid; grid-template-columns:1fr 1fr; gap:.45rem; margin-bottom:.7rem; padding:4px; background:rgba(7,10,22,.48); border:1px solid var(--border-subtle); border-radius:12px; }
  .kind-selector button { display:flex; align-items:center; gap:.55rem; padding:.6rem; color:#7d8798; background:transparent; border:1px solid transparent; border-radius:9px; cursor:pointer; text-align:left; }
  .kind-selector button>svg { width:16px; }
  .kind-selector button>span { display:flex; min-width:0; flex-direction:column; }
  .kind-selector button strong { color:#aab2c0; font-size:.6rem; }
  .kind-selector button small { margin-top:.1rem; color:#697386; font-size:.43rem; }
  .kind-selector button.active { color:#68ead9; background:linear-gradient(145deg,rgba(116,78,228,.18),rgba(44,221,204,.07)); border-color:rgba(104,234,217,.24); box-shadow:inset 0 1px rgba(255,255,255,.06); }
  .kind-selector button.active strong { color:#fff; }
  .person-kind { display:grid; grid-template-columns:.78fr 1.22fr; gap:4px; margin:0 0 .58rem; padding:3px; background:rgba(8,11,26,.42); border:1px solid var(--border-subtle); border-radius:10px; }
  .person-kind button { padding:.48rem .4rem; color:#778295; background:transparent; border:0; border-radius:7px; cursor:pointer; font-size:.48rem; font-weight:750; }
  .person-kind button.active { color:#fff4ad; background:linear-gradient(110deg,rgba(111,69,219,.34),rgba(210,61,148,.18)); box-shadow:inset 0 1px rgba(255,255,255,.07); }
  .text-field { display:flex; flex-direction:column; gap:.35rem; margin-bottom:.58rem; }
  .sponsor-form label > span { color: var(--text-muted); font-size: .52rem; font-weight: 700; text-transform: uppercase; }
  .sponsor-form input[type="text"], .sponsor-form textarea { width:100%; padding: .65rem .7rem; color: #fff; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 9px; outline: 0; font:inherit; font-size: .65rem; resize:none; }
  .sponsor-form input[type="text"]:focus,.sponsor-form textarea:focus { border-color:rgba(100,226,211,.44); box-shadow:0 0 0 3px rgba(100,226,211,.06); }
  .person-preview { position:relative; display:grid; min-height:88px; grid-template-columns:58px minmax(0,1fr); align-items:center; gap:.72rem; margin:.2rem 0 .7rem; padding:.72rem; overflow:hidden; background:radial-gradient(circle at 13% 50%,rgba(255,203,72,.17),transparent 24%),linear-gradient(120deg,rgba(92,49,180,.28),rgba(18,24,57,.72)); border:1px solid rgba(255,207,84,.25); border-radius:13px; }
  .person-preview::after { position:absolute; top:0; right:-22%; width:45%; height:100%; content:""; background:linear-gradient(110deg,transparent,rgba(255,255,255,.08),transparent); transform:skewX(-16deg); }
  .person-preview>span,.person-thumb { display:grid; place-items:center; color:#54204f; background:radial-gradient(circle at 32% 25%,#fff8c7,#ffd251 52%,#ef795b); border:2px solid #fff1ad; border-radius:50%; box-shadow:0 6px 16px rgba(255,161,54,.2); font-weight:900; }
  .person-preview>span { width:52px; aspect-ratio:1; font-size:.72rem; }
  .person-preview>div { display:flex; min-width:0; flex-direction:column; }
  .person-preview strong { overflow:hidden; color:#fff7c2; font-size:.67rem; text-overflow:ellipsis; white-space:nowrap; }
  .person-preview small { display:-webkit-box; margin-top:.2rem; overflow:hidden; color:#b8c3d2; font-size:.5rem; line-height:1.35; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .person-preview.particular strong { color:#fff1a0; font-size:.73rem; }
  .person-preview.particular small { color:#6fe8da; font-size:.43rem; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }
  .media-drop { display: flex; min-height: 105px; align-items: center; justify-content: center; flex-direction: column; margin-bottom: .65rem; color: #8f7ff0; background: rgba(255,255,255,.02); border: 1px dashed #3a4453; border-radius: 11px; cursor: pointer; }
  .media-drop.ready { color: #65dfca; border-color: rgba(75,221,201,.28); }
  .media-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .media-drop strong { max-width: 230px; margin-top: .4rem; overflow: hidden; color: var(--text-secondary); font-size: .6rem; text-overflow: ellipsis; white-space: nowrap; }
  .media-drop small { margin-top: .2rem; color: var(--text-muted); font-size: .46rem; }
  .sponsor-form > div:last-child .vs-btn { width: 100%; }
  .sponsor-library { display: grid; max-height: 310px; overflow-y: auto; grid-template-columns: 1fr 1fr; gap: .5rem; align-content: start; }
  .sponsor-library article { display: grid; min-width: 0; grid-template-columns: 52px 24px 1fr 26px; align-items: center; gap: .45rem; padding: .55rem; background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 11px; }
  .media-thumb { width: 52px; height: 38px; overflow: hidden; background: #0a0e14; border-radius: 7px; }
  .media-thumb img, .media-thumb video { width: 100%; height: 100%; object-fit: contain; }
  .media-thumb.person-thumb { width:42px; height:42px; justify-self:center; color:#52204d; background:radial-gradient(circle at 32% 25%,#fff8c7,#ffd251 52%,#ef795b); font-size:.56rem; }
  .sponsor-library article.person-item { background:linear-gradient(120deg,rgba(100,62,192,.09),rgba(255,200,65,.025)); border-color:rgba(255,210,92,.14); }
  .asset-order { color: #636e80; font-size: .46rem; font-weight: 700; }
  .sponsor-library article > div:nth-child(3) { display: flex; min-width: 0; flex-direction: column; }
  .sponsor-library article strong { overflow: hidden; color: #e9edf4; font-size: .58rem; text-overflow: ellipsis; white-space: nowrap; }
  .sponsor-library article small { display:-webkit-box; margin-top: .15rem; overflow:hidden; color: var(--text-muted); font-size: .44rem; line-height:1.3; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .sponsor-library article > button { display: grid; width: 26px; height: 26px; place-items: center; color: #687386; background: transparent; border: 0; border-radius: 7px; cursor: pointer; }
  .sponsor-library article > button:hover { color: #ff788d; background: rgba(var(--color-danger-rgb),.08); }
  .sponsor-empty { display: flex; min-height: 180px; grid-column: 1/-1; align-items: center; justify-content: center; flex-direction: column; color: var(--text-muted); text-align: center; font-size: .55rem; }
  .sponsor-empty svg { margin-bottom: .5rem; color: #796cce; font-size: 1.2rem; }
  .sponsor-empty strong { color: var(--text-secondary); }
  .sponsor-empty small { max-width: 260px; margin-top: .25rem; line-height: 1.5; }
  .remove-sponsor { text-align: center; } .remove-sponsor > svg { color: #ff788d; font-size: 1.3rem; } .remove-sponsor h3 { color: #fff; font-size: .85rem; } .remove-sponsor p { color: var(--text-muted); font-size: .62rem; } .remove-sponsor > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin-top: 1rem; } .remove-sponsor .vs-btn { width: 100%; }
  @media(max-width:900px){ .sponsor-layout { grid-template-columns: 1fr; } }
  @media(max-width:620px){ .sponsor-library { grid-template-columns: 1fr; } }
`;
