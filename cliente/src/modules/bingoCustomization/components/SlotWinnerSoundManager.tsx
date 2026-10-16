import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import defaultWinnerSoundUrl from "../../../assets/sounds/slot/slot-winner.mp3";
import {
  getSlotWinnerSound,
  getSlotWinnerSoundMime,
  getSlotWinnerSoundUrl,
  resetSlotWinnerSound,
  SlotWinnerSoundAsset,
  uploadSlotWinnerSound,
} from "../services/slotWinnerSound.service";

const MAX_SIZE = 15 * 1024 * 1024;
const formatSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const SlotWinnerSoundManager: React.FC = () => {
  const [asset, setAsset] = useState<SlotWinnerSoundAsset | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => {
    getSlotWinnerSound().then(setAsset).catch(() => toast.error("No fue posible cargar el sonido de la máquina.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  useEffect(() => () => audioRef.current?.pause(), []);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (!getSlotWinnerSoundMime(selected)) { toast.error("Formato no compatible. Usa MP3, WAV, OGG, M4A o AAC."); return; }
    if (selected.size > MAX_SIZE) { toast.error("El archivo supera el límite de 15 MB."); return; }
    audioRef.current?.pause();
    setPlaying(false);
    setFile(selected);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      setAsset(await uploadSlotWinnerSound(file));
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("El nuevo sonido se usará en el próximo ganador de la máquina.");
    } catch { toast.error("No fue posible guardar el sonido de ganador."); }
    finally { setSaving(false); }
  };

  const restore = async () => {
    audioRef.current?.pause();
    setPlaying(false);
    if (!asset) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      await resetSlotWinnerSound();
      setAsset(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Se restauró el sonido de jackpot predeterminado.");
    } catch { toast.error("No fue posible restaurar el sonido predeterminado."); }
  };

  const togglePreview = async () => {
    if (playing) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    audioRef.current?.pause();
    const url = localUrl ?? (asset ? getSlotWinnerSoundUrl(asset.url) : defaultWinnerSoundUrl);
    const audio = new Audio(url);
    audio.volume = 1;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => { setPlaying(false); toast.error("No fue posible reproducir la vista previa."); };
    audioRef.current = audio;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); toast.error("El navegador bloqueó la reproducción del audio."); }
  };

  const visibleName = file?.name ?? asset?.originalName ?? "Jackpot predeterminado";
  const visibleSize = file?.size ?? asset?.size;
  const visibleMime = file ? getSlotWinnerSoundMime(file) : asset?.mimeType;
  const isCustom = Boolean(file || asset);

  return (
    <WinnerSoundStyle className="surface-card">
      <div className="sound-heading">
        <div><span>Máquina de la suerte</span><h2>Sonido al revelar el ganador</h2><p>Se reproduce exactamente cuando aparece el cartón ganador en la transmisión.</p></div>
        <span className={isCustom ? "custom-status" : "default-status"}><i />{loading ? "Cargando…" : file ? "Cambio pendiente" : asset ? "Sonido personalizado" : "Sonido predeterminado"}</span>
      </div>

      <div className="sound-editor">
        <section className={`active-sound ${playing ? "is-playing" : ""}`}>
          <button type="button" onClick={togglePreview} aria-label={playing ? "Detener sonido" : "Escuchar sonido"}><AppIcon icon={playing ? "power-off" : "play"} /></button>
          <div className="active-copy"><small>SONIDO ACTIVO</small><strong title={visibleName}>{visibleName}</strong><span>{visibleSize ? `${visibleMime?.replace("audio/", "").toUpperCase()} · ${formatSize(visibleSize)}` : "Incluido con la aplicación"}</span></div>
          <div className="audio-wave" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i style={{ height: `${8 + ((index * 7) % 25)}px` }} key={index} />)}</div>
        </section>

        <label className={`winner-drop ${file ? "ready" : ""}`}>
          <input ref={inputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac" onChange={(event) => selectFile(event.target.files?.[0])} />
          <span><AppIcon icon={file ? "check" : "cloud-upload-alt"} /></span>
          <div><strong>{file ? "Archivo listo para aplicar" : "Importar otro sonido"}</strong><small>{file ? file.name : "MP3, WAV, OGG, M4A o AAC · Máximo 15 MB"}</small></div>
          <em>Seleccionar</em>
        </label>

        <div className="sound-actions">
          <AppButton icon="check" label={saving ? "Guardando…" : "Usar este sonido"} disabled={!file || saving} onClick={save} />
          <AppButton variant="light" icon={playing ? "power-off" : "play"} label={playing ? "Detener prueba" : "Escuchar prueba"} onClick={togglePreview} />
          <AppButton variant="transparent" icon="rotate" label="Restaurar predeterminado" disabled={!asset && !file} onClick={restore} />
        </div>
      </div>
    </WinnerSoundStyle>
  );
};

export default SlotWinnerSoundManager;

const WinnerSoundStyle = styled.section`
  margin-top:1.25rem;padding:1.25rem;
  .sound-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.sound-heading>div{display:flex;min-width:0;flex-direction:column}.sound-heading>div>span{color:#ffd466;font-size:.52rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.sound-heading h2{margin:.24rem 0;color:#fff;font-size:.95rem}.sound-heading p{margin:0;color:var(--text-muted);font-size:.6rem}.sound-heading>span{display:flex;flex:0 0 auto;align-items:center;gap:.38rem;padding:.42rem .58rem;border-radius:9px;font-size:.52rem;font-weight:700}.sound-heading>span i{width:7px;height:7px;border-radius:50%}.default-status{color:#65dfca;background:rgba(75,221,201,.08)}.default-status i{background:#65dfca;box-shadow:0 0 8px #65dfca}.custom-status{color:#ffe07c;background:rgba(255,196,64,.09)}.custom-status i{background:#ffd45d;box-shadow:0 0 8px #ffd45d}
  .sound-editor{display:grid;grid-template-columns:minmax(290px,.9fr) minmax(320px,1.1fr);gap:.75rem}.active-sound{display:grid;min-width:0;grid-template-columns:52px minmax(0,1fr) minmax(100px,.65fr);align-items:center;gap:.8rem;padding:.9rem;background:radial-gradient(circle at 10% 50%,rgba(255,196,68,.1),transparent 38%),rgba(0,0,0,.16);border:1px solid rgba(255,203,76,.22);border-radius:15px}.active-sound>button{display:grid;width:52px;height:52px;place-items:center;color:#3d240b;background:linear-gradient(145deg,#fff08e,#ffad37);border:2px solid #fff0a8;border-radius:16px;box-shadow:0 9px 22px rgba(255,168,43,.2);cursor:pointer}.active-copy{display:flex;min-width:0;flex-direction:column}.active-copy small{color:#ffd466;font-size:.46rem;font-weight:800;letter-spacing:.1em}.active-copy strong{margin-top:.2rem;overflow:hidden;color:#f6f2e8;font-size:.7rem;text-overflow:ellipsis;white-space:nowrap}.active-copy span{margin-top:.18rem;color:var(--text-muted);font-size:.5rem}.audio-wave{display:flex;height:36px;align-items:center;justify-content:flex-end;gap:2px;overflow:hidden}.audio-wave i{width:3px;background:linear-gradient(#ffd15b,#ff7a62);border-radius:5px;opacity:.38}.is-playing .audio-wave i{opacity:1;animation:winner-wave .55s ease-in-out infinite alternate}.is-playing .audio-wave i:nth-child(3n){animation-delay:-.2s}
  .winner-drop{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:.7rem;min-height:82px;padding:.75rem .85rem;color:#a997ff;background:linear-gradient(135deg,rgba(var(--color-primary-rgb),.055),rgba(75,221,201,.02));border:1px dashed #424b5d;border-radius:15px;cursor:pointer}.winner-drop:hover{border-color:rgba(var(--color-primary-rgb),.58)}.winner-drop.ready{color:#65dfca;border-color:rgba(75,221,201,.4)}.winner-drop input{position:absolute;width:1px;height:1px;opacity:0}.winner-drop>span{display:grid;width:42px;height:42px;place-items:center;background:rgba(var(--color-primary-rgb),.1);border-radius:12px}.winner-drop>div{display:flex;min-width:0;flex-direction:column}.winner-drop strong{color:#eceef5;font-size:.67rem}.winner-drop small{margin-top:.2rem;overflow:hidden;color:var(--text-muted);font-size:.5rem;text-overflow:ellipsis;white-space:nowrap}.winner-drop em{padding:.36rem .52rem;color:#c5baff;background:rgba(var(--color-primary-rgb),.1);border-radius:8px;font-size:.52rem;font-style:normal;font-weight:700}.sound-actions{display:flex;grid-column:1/-1;justify-content:flex-end;gap:.5rem;padding-top:.1rem}.sound-actions .vs-btn{min-height:36px}
  @keyframes winner-wave{to{height:5px!important;opacity:.35}}@media(max-width:900px){.sound-editor{grid-template-columns:1fr}}@media(max-width:620px){.sound-heading{flex-direction:column}.active-sound{grid-template-columns:52px minmax(0,1fr)}.audio-wave{display:none}.sound-actions{align-items:stretch;flex-direction:column}.winner-drop{grid-template-columns:42px minmax(0,1fr)}.winner-drop em{display:none}}
`;
