import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import {
  deleteSoundEffect,
  getSavedSoundVolume,
  getSupportedAudioMime,
  getSoundUrl,
  listSoundEffects,
  SOUND_VOLUME_KEY,
  SoundEffect,
  uploadSoundEffect,
} from "../services/soundEffects.service";
import SponsorManager from "../components/SponsorManager";
import BallVoiceManager from "../components/BallVoiceManager";
import ObsBrandingManager from "../components/ObsBrandingManager";
import SlotWinnerSoundManager from "../components/SlotWinnerSoundManager";
import MultipleWinnersSoundManager from "../components/MultipleWinnersSoundManager";

const maxFileSize = 10 * 1024 * 1024;
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const HomePage: React.FC = () => {
  const [effects, setEffects] = useState<SoundEffect[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [effectToDelete, setEffectToDelete] = useState<SoundEffect | null>(null);
  const [volume, setVolume] = useState(getSavedSoundVolume);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadEffects = useCallback(async () => {
    try {
      setEffects(await listSoundEffects());
    } catch {
      toast.error("No fue posible conectar con la biblioteca de sonidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEffects();
    return () => audioRef.current?.pause();
  }, [loadEffects]);

  const selectFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!getSupportedAudioMime(selectedFile)) {
      toast.error("Formato no compatible. Usa MP3, WAV, OGG, M4A o AAC.");
      return;
    }
    if (selectedFile.size > maxFileSize) {
      toast.error("El archivo supera el límite de 10 MB.");
      return;
    }
    setFile(selectedFile);
    if (!name.trim()) setName(selectedFile.name.replace(/\.[^.]+$/, "").slice(0, 60));
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      toast.warning("Agrega un nombre y selecciona un archivo de audio.");
      return;
    }
    setUploading(true);
    try {
      const created = await uploadSoundEffect(name.trim(), file);
      setEffects((current) => [created, ...current]);
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(
        <div className="app-toast-copy"><strong>Efecto agregado</strong><span>Ya está disponible en el panel de juego.</span></div>,
        { icon: <AppIcon icon="bell" /> }
      );
    } catch {
      toast.error("No fue posible guardar el efecto de sonido.");
    } finally {
      setUploading(false);
    }
  };

  const playEffect = async (effect: SoundEffect) => {
    if (playingId === effect.id) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(getSoundUrl(effect.url));
    audio.volume = volume;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error("No fue posible reproducir este efecto.");
    };
    audioRef.current = audio;
    try {
      await audio.play();
      setPlayingId(effect.id);
    } catch {
      setPlayingId(null);
      toast.error("El navegador bloqueó la reproducción del audio.");
    }
  };

  const handleVolume = (value: number) => {
    setVolume(value);
    localStorage.setItem(SOUND_VOLUME_KEY, String(value));
    if (audioRef.current) audioRef.current.volume = value;
  };

  const handleDelete = async () => {
    if (!effectToDelete) return;
    try {
      if (playingId === effectToDelete.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      await deleteSoundEffect(effectToDelete.id);
      setEffects((current) => current.filter((effect) => effect.id !== effectToDelete.id));
      setEffectToDelete(null);
      toast.success("Efecto eliminado correctamente.");
    } catch {
      toast.error("No fue posible eliminar el efecto.");
    }
  };

  return (
    <CustomizationStyle>
      <div className="page-intro"><div><span className="eyebrow">Personalización de audio</span><h1 className="page-heading">Dale identidad sonora a la partida.</h1><p className="page-description">Crea una biblioteca de efectos rápidos para celebrar, anunciar o ambientar momentos desde el panel de juego.</p></div><div className="library-status"><span><AppIcon icon="bell" /></span><div><small>Biblioteca activa</small><strong>{effects.length} efecto{effects.length === 1 ? "" : "s"}</strong></div></div></div>

      <div className="sound-workspace">
        <section className="upload-card surface-card">
          <div className="section-heading"><span className="section-icon"><AppIcon icon="plus" /></span><div><span>Nuevo recurso</span><h2>Agregar efecto</h2></div></div>
          <label className="field-label"><span>Nombre visible</span><input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Ej. Aplausos, celebración, suspenso…" /></label>
          <label className={`upload-zone ${file ? "has-file" : ""}`}>
            <input ref={fileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac" onChange={(event) => selectFile(event.target.files?.[0])} />
            <span className="upload-icon"><AppIcon icon={file ? "check" : "cloud-upload-alt"} /></span>
            <strong>{file ? file.name : "Selecciona un archivo de audio"}</strong>
            <small>{file ? `${formatSize(file.size)} · Listo para guardar` : "MP3, WAV, OGG, M4A o AAC · Máximo 10 MB"}</small>
          </label>
          {file && <button className="change-file" type="button" onClick={() => fileInputRef.current?.click()}>Cambiar archivo</button>}
          <AppButton icon="plus" label={uploading ? "Guardando…" : "Agregar a la biblioteca"} onClick={handleUpload} disabled={uploading || !file || !name.trim()} />
          <div className="upload-note"><AppIcon icon="check" /><span>Al guardar aparecerá automáticamente en el menú flotante del panel.</span></div>
        </section>

        <section className="library-card surface-card">
          <div className="library-heading"><div><span className="section-kicker">Biblioteca</span><h2>Efectos disponibles</h2></div><label className="volume-control"><span>Volumen <strong>{Math.round(volume * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => handleVolume(Number(event.target.value))} /></label></div>
          {loading ? <div className="library-empty"><span className="loading-ring" /><strong>Cargando sonidos…</strong></div> : effects.length === 0 ? <div className="library-empty"><span><AppIcon icon="bell" /></span><strong>Tu biblioteca está vacía</strong><small>Agrega el primer efecto para tenerlo disponible durante la partida.</small></div> : <div className="effect-list">{effects.map((effect, index) => <article className={`effect-item ${playingId === effect.id ? "playing" : ""}`} key={effect.id}><button className="play-effect" type="button" onClick={() => playEffect(effect)} aria-label={`${playingId === effect.id ? "Detener" : "Reproducir"} ${effect.name}`}><AppIcon icon={playingId === effect.id ? "power-off" : "play"} /></button><div className="effect-copy"><strong>{effect.name}</strong><span>{effect.mimeType.replace("audio/", "").toUpperCase()} · {formatSize(effect.size)}</span></div><div className="sound-wave" aria-hidden="true">{Array.from({ length: 12 }, (_, bar) => <i style={{ height: `${5 + ((bar * 7 + index * 3) % 15)}px` }} key={bar} />)}</div><button className="delete-effect" type="button" onClick={() => setEffectToDelete(effect)} aria-label={`Eliminar ${effect.name}`}><AppIcon icon="trash-alt" /></button></article>)}</div>}
        </section>
      </div>

      <MultipleWinnersSoundManager effects={effects} />

      <SlotWinnerSoundManager />

      <BallVoiceManager />

      <ObsBrandingManager />

      <SponsorManager />

      <AppModal title="Eliminar efecto" isOpen={Boolean(effectToDelete)} onClose={() => setEffectToDelete(null)}>
        <div className="delete-confirm"><span><AppIcon icon="trash-alt" /></span><h3>¿Eliminar “{effectToDelete?.name}”?</h3><p>Dejará de estar disponible inmediatamente en el panel de juego.</p><div><AppButton variant="transparent" label="Cancelar" onClick={() => setEffectToDelete(null)} /><AppButton variant="light" icon="trash-alt" label="Eliminar" onClick={handleDelete} /></div></div>
      </AppModal>
    </CustomizationStyle>
  );
};

export default HomePage;

const CustomizationStyle = styled.div`
  .page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; }
  .library-status { display: flex; min-width: 185px; align-items: center; gap: .7rem; padding: .75rem .9rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .library-status > span { display: grid; width: 34px; height: 34px; place-items: center; color: #65dfca; background: rgba(75,221,201,.08); border-radius: 10px; }
  .library-status > div { display: flex; flex-direction: column; }
  .library-status small { color: var(--text-muted); font-size: .53rem; letter-spacing: .08em; text-transform: uppercase; }
  .library-status strong { margin-top: .2rem; font-size: .68rem; }
  .sound-workspace { display: grid; grid-template-columns: minmax(290px,.72fr) minmax(420px,1.28fr); gap: 1.25rem; align-items: start; }
  .upload-card, .library-card { padding: 1.25rem; }
  .section-heading { display: flex; align-items: center; gap: .75rem; margin-bottom: 1.2rem; }
  .section-icon { display: grid; width: 36px; height: 36px; place-items: center; color: #b7a8ff; background: rgba(var(--color-primary-rgb),.1); border-radius: 10px; }
  .section-heading > div { display: flex; flex-direction: column; }
  .section-heading > div > span, .section-kicker { color: var(--color-secondary); font-size: .52rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  h2 { margin: .22rem 0 0; color: var(--text-primary); font-size: .92rem; }
  .field-label { display: flex; flex-direction: column; gap: .4rem; margin-bottom: .8rem; }
  .field-label > span { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
  .field-label input { width: 100%; padding: .72rem .8rem; color: #fff; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 11px; outline: 0; font-size: .7rem; }
  .field-label input:focus { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.08); }
  .upload-zone { display: flex; min-height: 150px; align-items: center; justify-content: center; flex-direction: column; padding: 1rem; color: var(--text-secondary); text-align: center; background: rgba(0,0,0,.15); border: 1px dashed #394353; border-radius: 14px; cursor: pointer; transition: .18s ease; }
  .upload-zone:hover { background: rgba(var(--color-primary-rgb),.035); border-color: rgba(var(--color-primary-rgb),.55); }
  .upload-zone.has-file { background: rgba(75,221,201,.035); border-color: rgba(75,221,201,.3); }
  .upload-zone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .upload-icon { display: grid; width: 40px; height: 40px; margin-bottom: .65rem; place-items: center; color: #9e8dff; background: rgba(var(--color-primary-rgb),.1); border-radius: 12px; }
  .has-file .upload-icon { color: #65dfca; background: rgba(75,221,201,.08); }
  .upload-zone strong { max-width: 260px; overflow: hidden; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
  .upload-zone small { margin-top: .3rem; color: var(--text-muted); font-size: .55rem; }
  .change-file { display: block; margin: .45rem 0 .75rem auto; padding: 0; color: #a99aff; background: transparent; border: 0; font-size: .55rem; cursor: pointer; }
  .upload-card > div:nth-last-child(2) .vs-btn { width: 100%; margin-top: .8rem; }
  .upload-note { display: flex; align-items: flex-start; gap: .4rem; margin-top: .8rem; color: var(--text-muted); font-size: .54rem; line-height: 1.5; }
  .upload-note svg { margin-top: .1rem; color: #65dfca; }
  .library-heading { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1rem; }
  .volume-control { display: flex; width: 155px; flex-direction: column; gap: .35rem; }
  .volume-control span { display: flex; justify-content: space-between; color: var(--text-muted); font-size: .52rem; }
  .volume-control strong { color: #b9adff; }
  .volume-control input { width: 100%; accent-color: var(--color-primary); cursor: pointer; }
  .effect-list { display: flex; max-height: 485px; overflow-y: auto; flex-direction: column; gap: .5rem; padding-right: .2rem; }
  .effect-item { display: grid; grid-template-columns: 38px minmax(110px,1fr) minmax(70px,.65fr) 30px; align-items: center; gap: .7rem; padding: .7rem; background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 13px; transition: .16s ease; }
  .effect-item:hover { background: rgba(255,255,255,.04); border-color: var(--border-strong); }
  .effect-item.playing { background: linear-gradient(100deg,rgba(124,92,255,.1),rgba(75,221,201,.035)); border-color: rgba(var(--color-primary-rgb),.3); }
  .play-effect { display: grid; width: 38px; height: 38px; place-items: center; color: #fff; background: linear-gradient(145deg,#8269f8,#6848dd); border: 0; border-radius: 11px; cursor: pointer; box-shadow: 0 7px 18px rgba(80,55,190,.2); }
  .playing .play-effect { color: #17211f; background: #65dfca; }
  .play-effect svg { font-size: .65rem; }
  .effect-copy { display: flex; min-width: 0; flex-direction: column; }
  .effect-copy strong { overflow: hidden; color: #edf0f6; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
  .effect-copy span { margin-top: .2rem; color: var(--text-muted); font-size: .48rem; }
  .sound-wave { display: flex; height: 24px; align-items: center; justify-content: flex-end; gap: 2px; overflow: hidden; }
  .sound-wave i { width: 2px; background: #434d5d; border-radius: 9px; transition: background .15s ease; }
  .playing .sound-wave i { background: #7560df; animation: sound-bar .7s ease-in-out infinite alternate; }
  .playing .sound-wave i:nth-child(2n) { animation-delay: -.3s; }
  .delete-effect { display: grid; width: 30px; height: 30px; place-items: center; color: #697386; background: transparent; border: 0; border-radius: 8px; cursor: pointer; }
  .delete-effect:hover { color: #ff788d; background: rgba(var(--color-danger-rgb),.08); }
  .library-empty { display: flex; min-height: 300px; align-items: center; justify-content: center; flex-direction: column; color: var(--text-muted); text-align: center; }
  .library-empty > span:not(.loading-ring) { display: grid; width: 46px; height: 46px; margin-bottom: .8rem; place-items: center; color: #7e70d3; background: rgba(var(--color-primary-rgb),.08); border-radius: 14px; }
  .library-empty strong { color: var(--text-secondary); font-size: .72rem; }
  .library-empty small { max-width: 280px; margin-top: .3rem; font-size: .56rem; line-height: 1.5; }
  .loading-ring { width: 28px; height: 28px; margin-bottom: .7rem; border: 2px solid #303746; border-top-color: #8c75ff; border-radius: 50%; animation: spin .8s linear infinite; }
  .delete-confirm { text-align: center; }
  .delete-confirm > span { display: grid; width: 48px; height: 48px; margin: 0 auto .9rem; place-items: center; color: #ff788d; background: rgba(var(--color-danger-rgb),.08); border-radius: 14px; }
  .delete-confirm h3 { margin: 0; color: #fff; font-size: .9rem; }
  .delete-confirm p { margin: .4rem 0 1.2rem; color: var(--text-muted); font-size: .65rem; }
  .delete-confirm > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .delete-confirm .vs-btn { width: 100%; }
  @keyframes sound-bar { to { height: 4px; opacity: .45; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 900px) { .sound-workspace { grid-template-columns: 1fr; } }
  @media (max-width: 620px) { .page-intro { align-items: flex-start; flex-direction: column; } .library-status { width: 100%; } .library-heading { align-items: flex-start; flex-direction: column; } .volume-control { width: 100%; } .effect-item { grid-template-columns: 38px minmax(0,1fr) 30px; } .sound-wave { display: none; } }
`;
