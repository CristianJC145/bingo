import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import {
  getObsBranding,
  getObsBrandingMime,
  getObsBrandingUrl,
  ObsBrandingAsset,
  resetObsBranding,
  uploadObsBranding,
} from "../services/obsBranding.service";

const maxSize = 50 * 1024 * 1024;

const DefaultArtwork = () => <div className="default-artwork"><div className="art-balls"><i>B</i><i>31</i><i>O</i><i>72</i><i>G</i></div><div className="art-logo"><small>TRANSMISIÓN</small><strong>BINGO</strong><span>EN VIVO</span></div><div className="art-rings"><i /><i /><i /></div></div>;

const ObsBrandingManager: React.FC = () => {
  const [asset, setAsset] = useState<ObsBrandingAsset | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const localUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => { getObsBranding().then(setAsset).catch(() => toast.error("No fue posible cargar el fondo de OBS.")).finally(() => setLoading(false)); }, []);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    const mime = getObsBrandingMime(selected);
    if (!mime) { toast.error("Usa PNG, JPG, WEBP, GIF, MP4 o WEBM."); return; }
    if (selected.size > maxSize) { toast.error("El archivo supera el límite de 50 MB."); return; }
    setFile(selected);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      setAsset(await uploadObsBranding(file));
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("El nuevo fondo ya está disponible en OBS.");
    } catch { toast.error("No fue posible guardar el fondo de transmisión."); }
    finally { setSaving(false); }
  };

  const restore = async () => {
    try {
      await resetObsBranding();
      setAsset(null); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Se restauró el diseño animado predeterminado.");
    } catch { toast.error("No fue posible restaurar el diseño predeterminado."); }
  };

  const previewUrl = localUrl ?? (asset ? getObsBrandingUrl(asset.url) : null);
  const previewType = file ? getObsBrandingMime(file) : asset?.mimeType;

  return <BrandingStyle className="surface-card">
    <div className="branding-heading"><div><span>Identidad de transmisión</span><h2>Fondo vertical de OBS</h2><p>Personaliza la columna que reúne la cámara y los logos de patrocinadores.</p></div><span className={asset ? "custom-status" : "default-status"}><i />{loading ? "Cargando diseño…" : asset ? "Diseño personalizado" : "Diseño animado"}</span></div>
    <div className="branding-workspace">
      <div className="vertical-preview">
        {previewUrl ? previewType?.startsWith("video/") ? <video src={previewUrl} autoPlay muted loop playsInline /> : <img src={previewUrl} alt="Vista previa del fondo vertical" /> : <DefaultArtwork />}
        <div className="preview-camera"><span><AppIcon icon="image" /></span><small>CÁMARA</small></div>
        <div className="preview-sponsors"><small>PATROCINADORES</small><div><i /><i /><i /></div></div>
        <span className="preview-label">VISTA PREVIA 9:16</span>
      </div>
      <div className="branding-controls">
        <div className="control-intro"><span><AppIcon icon="image" /></span><div><strong>{file ? "Nuevo diseño seleccionado" : asset ? "Fondo personalizado activo" : "Diseño predeterminado activo"}</strong><small>El área de cámara seguirá siendo transparente; el diseño se muestra a su alrededor.</small></div></div>
        <label className={`branding-drop ${file ? "ready" : ""}`}><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => selectFile(event.target.files?.[0])} /><AppIcon icon={file ? "check" : "cloud-upload-alt"} /><strong>{file?.name ?? "Seleccionar diseño vertical"}</strong><small>Recomendado 1080 × 1920 · Imagen o video · Máximo 50 MB</small></label>
        <div className="branding-actions"><AppButton icon="check" label={saving ? "Publicando…" : "Aplicar en OBS"} disabled={!file || saving} onClick={save} /><AppButton variant="light" icon="rotate" label="Usar predeterminado" disabled={!asset && !file} onClick={restore} /></div>
        <div className="branding-note"><AppIcon icon="circle-check" /><span>Los cambios aparecen automáticamente en la fuente del navegador sin modificar su URL.</span></div>
      </div>
    </div>
  </BrandingStyle>;
};

export default ObsBrandingManager;

const BrandingStyle = styled.section`
  margin-top:1.25rem;padding:1.25rem;
  .branding-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.branding-heading>div{display:flex;flex-direction:column}.branding-heading>div>span{color:var(--color-secondary);font-size:.52rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.branding-heading h2{margin:.25rem 0;color:#fff;font-size:.95rem}.branding-heading p{margin:0;color:var(--text-muted);font-size:.6rem}.branding-heading>span{display:flex;align-items:center;gap:.38rem;padding:.42rem .58rem;border-radius:9px;font-size:.52rem;font-weight:700}.branding-heading>span i{width:7px;height:7px;border-radius:50%}.default-status{color:#65dfca;background:rgba(75,221,201,.08)}.default-status i{background:#65dfca;box-shadow:0 0 8px #65dfca}.custom-status{color:#ffe07c;background:rgba(255,196,64,.09)}.custom-status i{background:#ffd45d;box-shadow:0 0 8px #ffd45d}
  .branding-workspace{display:grid;grid-template-columns:235px minmax(0,1fr);gap:1.2rem;align-items:stretch}.vertical-preview{position:relative;aspect-ratio:9/16;overflow:hidden;background:#110c32;border:2px solid #ffc94c;border-radius:23px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.06),0 18px 35px rgba(5,2,24,.35)}.vertical-preview>img,.vertical-preview>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.default-artwork{position:absolute;inset:0;overflow:hidden;background:radial-gradient(circle at 50% 25%,rgba(255,79,164,.34),transparent 30%),radial-gradient(circle at 40% 83%,rgba(48,226,214,.24),transparent 35%),linear-gradient(155deg,#491274,#111040 55%,#25105a)}.art-logo{position:absolute;top:42%;right:0;left:0;display:flex;align-items:center;flex-direction:column;color:#fff;text-align:center}.art-logo small{color:#70eadc;font-size:.38rem;font-weight:800;letter-spacing:.2em}.art-logo strong{margin-top:.2rem;color:#fff4aa;font-size:1.8rem;line-height:1;text-shadow:0 0 18px rgba(255,190,57,.35)}.art-logo span{margin-top:.28rem;font-size:.48rem;font-weight:800;letter-spacing:.18em}.art-rings i{position:absolute;left:50%;width:180px;aspect-ratio:1;transform:translateX(-50%);border:1px solid rgba(255,255,255,.09);border-radius:50%}.art-rings i:nth-child(1){top:-45px}.art-rings i:nth-child(2){bottom:5%;width:230px;border-color:rgba(80,232,218,.12)}.art-rings i:nth-child(3){bottom:-25%;width:260px;border-color:rgba(255,205,77,.12)}.art-balls i{position:absolute;display:grid;width:25px;aspect-ratio:1;place-items:center;color:#fff;background:linear-gradient(145deg,#ff65ad,#7a4ce3);border:2px solid rgba(255,255,255,.82);border-radius:50%;box-shadow:0 7px 14px rgba(9,3,31,.3);font-size:.34rem;font-style:normal;font-weight:800;animation:preview-float 3s ease-in-out infinite alternate}.art-balls i:nth-child(1){top:11%;left:12%}.art-balls i:nth-child(2){top:19%;right:13%;animation-delay:-.8s}.art-balls i:nth-child(3){top:62%;left:10%;animation-delay:-1.4s}.art-balls i:nth-child(4){right:12%;bottom:14%;animation-delay:-2s}.art-balls i:nth-child(5){bottom:6%;left:42%;animation-delay:-.4s}
  .preview-camera{position:absolute;top:7%;right:8%;left:8%;display:grid;height:28%;place-items:center;color:rgba(255,255,255,.65);background:rgba(9,8,31,.4);border:2px solid #55e5d6;border-radius:14px;box-shadow:0 0 0 3px rgba(255,80,162,.28);backdrop-filter:blur(2px)}.preview-camera>span{display:grid;width:32px;height:32px;place-items:center;background:rgba(255,255,255,.1);border-radius:10px}.preview-camera small{position:absolute;right:8px;bottom:7px;font-size:.32rem;font-weight:800;letter-spacing:.12em}.preview-sponsors{position:absolute;right:8%;bottom:7%;left:8%;display:flex;height:19%;align-items:center;justify-content:center;flex-direction:column;background:rgba(12,10,39,.75);border:1px solid rgba(255,215,88,.58);border-radius:14px;backdrop-filter:blur(5px)}.preview-sponsors small{color:#ffe28b;font-size:.35rem;font-weight:900;letter-spacing:.12em}.preview-sponsors>div{display:flex;gap:6px;margin-top:9px}.preview-sponsors i{width:30px;height:18px;background:rgba(255,255,255,.12);border-radius:5px}.preview-label{position:absolute;top:8px;left:50%;padding:.25rem .38rem;transform:translateX(-50%);color:#4a1d48;background:#ffe57d;border-radius:6px;font-size:.28rem;font-weight:900;white-space:nowrap}
  .branding-controls{display:flex;justify-content:center;flex-direction:column;padding:1rem;background:rgba(0,0,0,.14);border:1px solid var(--border-subtle);border-radius:16px}.control-intro{display:flex;align-items:center;gap:.75rem;margin-bottom:.9rem}.control-intro>span{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;color:#b7a8ff;background:rgba(var(--color-primary-rgb),.1);border-radius:12px}.control-intro>div{display:flex;flex-direction:column}.control-intro strong{color:#eef0f6;font-size:.72rem}.control-intro small{max-width:520px;margin-top:.22rem;color:var(--text-muted);font-size:.52rem;line-height:1.45}.branding-drop{display:flex;min-height:135px;align-items:center;justify-content:center;flex-direction:column;color:#9b89ff;background:linear-gradient(145deg,rgba(124,92,255,.045),rgba(75,221,201,.02));border:1px dashed #424b5d;border-radius:14px;cursor:pointer}.branding-drop:hover{border-color:rgba(var(--color-primary-rgb),.55)}.branding-drop.ready{color:#65dfca;border-color:rgba(75,221,201,.38)}.branding-drop input{position:absolute;width:1px;height:1px;opacity:0}.branding-drop svg{font-size:1rem}.branding-drop strong{max-width:420px;margin-top:.55rem;overflow:hidden;color:#e6e9ef;font-size:.68rem;text-overflow:ellipsis;white-space:nowrap}.branding-drop small{margin-top:.25rem;color:var(--text-muted);font-size:.5rem}.branding-actions{display:flex;gap:.55rem;margin-top:.75rem}.branding-actions>div{flex:1}.branding-actions .vs-btn{width:100%}.branding-note{display:flex;align-items:center;gap:.4rem;margin-top:.8rem;color:var(--text-muted);font-size:.52rem}.branding-note svg{color:#65dfca}
  @keyframes preview-float{to{transform:translateY(-12px) rotate(9deg)}}
  @media(max-width:900px){.branding-workspace{grid-template-columns:190px minmax(0,1fr)}}@media(max-width:620px){.branding-heading{flex-direction:column}.branding-workspace{grid-template-columns:1fr}.vertical-preview{width:210px;margin:auto}.branding-actions{flex-direction:column}}
`;
