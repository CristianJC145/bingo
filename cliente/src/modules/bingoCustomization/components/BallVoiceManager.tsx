import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import {
  ACTIVE_VOICE_KEY,
  BallVoice,
  DEFAULT_VOICE_ID,
  createBallVoice,
  deleteBallVoice,
  getBallVoiceOrigin,
  getFileExtension,
  isSupportedVoiceFile,
  listBallVoices,
  parseBallNumber,
  REPEAT_VOICE_KEY,
  uploadBallVoiceBall,
} from "../services/ballVoices.service";

const TOTAL_BALLS = 75;
const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
const DEFAULT_VOICE: BallVoice = { id: DEFAULT_VOICE_ID, name: "Voz original", extension: ".wav", ballCount: TOTAL_BALLS, createdAt: "" };
const SAMPLE_BALL = 7;

const BallVoiceManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voices, setVoices] = useState<BallVoice[]>([]);
  const [activeVoiceId, setActiveVoiceId] = useState<string>(() => localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID);
  const [name, setName] = useState("");
  const [fileMap, setFileMap] = useState<Record<number, File>>({});
  const [detectedExtension, setDetectedExtension] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [voiceToDelete, setVoiceToDelete] = useState<BallVoice | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const loadVoices = useCallback(async () => {
    try {
      setVoices(await listBallVoices());
    } catch {
      toast.error("No fue posible cargar las voces del narrador.");
    }
  }, []);

  useEffect(() => { loadVoices(); return () => audioRef.current?.pause(); }, [loadVoices]);

  const allVoices = [DEFAULT_VOICE, ...voices];
  const detectedCount = Object.keys(fileMap).length;
  const missingCount = TOTAL_BALLS - detectedCount;

  const handleActivate = (voiceId: string) => {
    setActiveVoiceId(voiceId);
    localStorage.setItem(ACTIVE_VOICE_KEY, voiceId);
    toast.success("Voz activa actualizada. Se usará en el panel de juego.");
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const map: Record<number, File> = {};
    const extensions = new Set<string>();
    let unmatched = 0;
    const oversized: string[] = [];

    files.forEach((file) => {
      if (!isSupportedVoiceFile(file.name)) { unmatched++; return; }
      const ballNumber = parseBallNumber(file.name);
      if (ballNumber === null) { unmatched++; return; }
      if (file.size > MAX_AUDIO_SIZE) { oversized.push(file.name); return; }
      map[ballNumber] = file;
      extensions.add(getFileExtension(file.name));
    });

    if (extensions.size > 1) {
      toast.error("Todos los audios deben tener el mismo formato (por ejemplo, todos .mp3).");
      return;
    }
    setFileMap(map);
    setDetectedExtension([...extensions][0] ?? null);
    if (unmatched > 0) toast.warning(`${unmatched} archivo(s) se ignoraron porque no coinciden con NUM1…NUM75.`);
    if (oversized.length > 0) toast.error(`${oversized.length} audio(s) superan 5 MB. El primero es ${oversized[0]}.`);
  };

  const resetForm = () => {
    setName("");
    setFileMap({});
    setDetectedExtension(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.warning("Ponle un nombre a la voz."); return; }
    if (detectedCount < TOTAL_BALLS) {
      toast.error(`Se detectaron ${detectedCount} de ${TOTAL_BALLS} balotas. Verifica que los archivos se llamen NUM1…NUM75.`);
      return;
    }

    const entries = Object.entries(fileMap).map(([number, file]) => [Number(number), file] as const).sort(([first], [second]) => first - second);
    setProgress({ done: 0, total: entries.length });
    let created: BallVoice | null = null;
    let uploadingBall: number | null = null;
    try {
      created = await createBallVoice(name.trim());
      let done = 0;
      for (const [number, file] of entries) {
        uploadingBall = number;
        await uploadBallVoiceBall(created.id, number, file);
        done += 1;
        setProgress({ done, total: entries.length });
      }
      toast.success(
        <div className="app-toast-copy"><strong>Voz agregada</strong><span>Ya puedes seleccionarla como narrador.</span></div>,
        { icon: <AppIcon icon="bell" /> }
      );
      resetForm();
      await loadVoices();
    } catch (error) {
      const detail = getUploadErrorMessage(error);
      toast.error(uploadingBall ? `Falló el audio NUM${uploadingBall}. ${detail}` : `No fue posible crear la voz. ${detail}`);
      if (created) await deleteBallVoice(created.id).catch(() => undefined);
      await loadVoices();
    } finally {
      setProgress(null);
    }
  };

  const handlePreview = async (voice: BallVoice) => {
    audioRef.current?.pause();
    if (previewingId === voice.id) { setPreviewingId(null); return; }
    const url = voice.id === DEFAULT_VOICE_ID
      ? `${import.meta.env.VITE_APP_SOUNDS}/sounds/ball/NUM${SAMPLE_BALL}.wav`
      : `${getBallVoiceOrigin()}/ball-voices/media/${voice.id}/NUM${SAMPLE_BALL}${voice.extension ?? ""}`;
    const audio = new Audio(url);
    audio.onended = () => setPreviewingId(null);
    audio.onerror = () => { setPreviewingId(null); toast.error("No fue posible reproducir la muestra."); };
    audioRef.current = audio;
    try { await audio.play(); setPreviewingId(voice.id); }
    catch { setPreviewingId(null); }
  };

  const handleDelete = async () => {
    if (!voiceToDelete) return;
    try {
      await deleteBallVoice(voiceToDelete.id);
      if (activeVoiceId === voiceToDelete.id) handleActivate(DEFAULT_VOICE_ID);
      if (localStorage.getItem(REPEAT_VOICE_KEY) === voiceToDelete.id) localStorage.setItem(REPEAT_VOICE_KEY, DEFAULT_VOICE_ID);
      setVoiceToDelete(null);
      toast.success("Voz eliminada.");
      await loadVoices();
    } catch {
      toast.error("No fue posible eliminar la voz.");
    }
  };

  return (
    <BallVoiceManagerStyle>
      <div className="section-title">
        <div><span className="eyebrow">Narrador</span><h2>Voces para cantar las balotas</h2><p>Importa una segunda voz con los 75 audios (NUM1…NUM75) y elige cuál narra la partida.</p></div>
      </div>

      <div className="voice-workspace">
        <section className="add-card surface-card">
          <div className="add-head"><span className="add-icon"><AppIcon icon="plus" /></span><div><span className="kicker">Nueva voz</span><h3>Importar 75 audios</h3></div></div>
          <label className="field"><span>Nombre de la voz</span><input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Ej. Voz femenina, Locutor 2…" disabled={Boolean(progress)} /></label>
          <label className={`dropzone ${detectedCount ? "has-files" : ""}`}>
            <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={(event) => handleFilesSelected(event.target.files)} disabled={Boolean(progress)} />
            <span className="drop-icon"><AppIcon icon={detectedCount ? "check" : "cloud-upload-alt"} /></span>
            <strong>{detectedCount ? `${detectedCount} de ${TOTAL_BALLS} balotas listas` : "Selecciona los 75 archivos de audio"}</strong>
            <small>{detectedCount ? (missingCount > 0 ? `Faltan ${missingCount} · formato ${detectedExtension}` : `Set completo · formato ${detectedExtension}`) : "Deben llamarse NUM1…NUM75 · MP3, WAV, OGG, M4A o AAC"}</small>
          </label>
          {progress ? (
            <div className="upload-progress"><div className="bar"><span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div><small>Subiendo {progress.done}/{progress.total} audios…</small></div>
          ) : (
            <AppButton icon="plus" label="Crear voz" onClick={handleCreate} disabled={detectedCount < TOTAL_BALLS || !name.trim()} />
          )}
        </section>

        <section className="list-card surface-card">
          <div className="list-head"><span className="kicker">Disponibles</span><h3>Selecciona el narrador</h3></div>
          <div className="voice-list">
            {allVoices.map((voice) => {
              const isActive = activeVoiceId === voice.id;
              const isDefault = voice.id === DEFAULT_VOICE_ID;
              const isComplete = isDefault || voice.ballCount >= TOTAL_BALLS;
              return (
                <article className={`voice-item ${isActive ? "active" : ""}`} key={voice.id}>
                  <button className="preview-btn" type="button" onClick={() => handlePreview(voice)} aria-label={`Escuchar muestra de ${voice.name}`}><AppIcon icon={previewingId === voice.id ? "power-off" : "play"} /></button>
                  <div className="voice-copy">
                    <strong>{voice.name}</strong>
                    <span>{isDefault ? "Incluida · 75 balotas" : `${voice.ballCount}/${TOTAL_BALLS} balotas${isComplete ? "" : " · incompleta"}`}</span>
                  </div>
                  {isActive ? <span className="active-badge"><AppIcon icon="check" />Activa</span> : <AppButton variant="light" label="Usar" onClick={() => handleActivate(voice.id)} disabled={!isComplete} />}
                  {!isDefault && <button className="delete-btn" type="button" onClick={() => setVoiceToDelete(voice)} aria-label={`Eliminar ${voice.name}`}><AppIcon icon="trash-alt" /></button>}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <AppModal title="Eliminar voz" isOpen={Boolean(voiceToDelete)} onClose={() => setVoiceToDelete(null)}>
        <div className="delete-confirm"><span><AppIcon icon="trash-alt" /></span><h3>¿Eliminar “{voiceToDelete?.name}”?</h3><p>Se borrarán sus 75 audios. Si estaba activa, se volverá a la voz original.</p><div><AppButton variant="transparent" label="Cancelar" onClick={() => setVoiceToDelete(null)} /><AppButton variant="light" icon="trash-alt" label="Eliminar" onClick={handleDelete} /></div></div>
      </AppModal>
    </BallVoiceManagerStyle>
  );
};

const getUploadErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null) return "Revisa la conexión e inténtalo nuevamente.";
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  return typeof response?.data?.message === "string" && response.data.message.trim()
    ? response.data.message
    : "Revisa la conexión e inténtalo nuevamente.";
};

export default BallVoiceManager;

const BallVoiceManagerStyle = styled.div`
  margin-top: 1.5rem;
  .section-title { margin-bottom: 1rem; }
  .eyebrow { color: var(--color-secondary); font-size: .58rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  h2 { margin: .3rem 0 .3rem; color: var(--text-primary); font-size: 1.05rem; }
  .section-title p { margin: 0; color: var(--text-secondary); font-size: .72rem; max-width: 560px; line-height: 1.5; }
  .voice-workspace { display: grid; grid-template-columns: minmax(290px,.72fr) minmax(360px,1.28fr); gap: 1.25rem; align-items: start; }
  .add-card, .list-card { padding: 1.25rem; }
  .add-head, .list-head { margin-bottom: 1.1rem; }
  .add-head { display: flex; align-items: center; gap: .75rem; }
  .add-icon { display: grid; width: 36px; height: 36px; place-items: center; color: #b7a8ff; background: rgba(var(--color-primary-rgb),.1); border-radius: 10px; }
  .kicker { color: var(--color-secondary); font-size: .52rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  h3 { margin: .2rem 0 0; color: var(--text-primary); font-size: .9rem; }
  .field { display: flex; flex-direction: column; gap: .4rem; margin-bottom: .8rem; }
  .field > span { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .field input { width: 100%; padding: .72rem .8rem; color: #fff; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 11px; outline: 0; font-size: .7rem; }
  .field input:focus { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.08); }
  .dropzone { display: flex; min-height: 140px; align-items: center; justify-content: center; flex-direction: column; padding: 1rem; margin-bottom: .9rem; color: var(--text-secondary); text-align: center; background: rgba(0,0,0,.15); border: 1px dashed #394353; border-radius: 14px; cursor: pointer; transition: .18s ease; }
  .dropzone:hover { background: rgba(var(--color-primary-rgb),.035); border-color: rgba(var(--color-primary-rgb),.55); }
  .dropzone.has-files { background: rgba(75,221,201,.035); border-color: rgba(75,221,201,.3); }
  .dropzone input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .drop-icon { display: grid; width: 40px; height: 40px; margin-bottom: .6rem; place-items: center; color: #9e8dff; background: rgba(var(--color-primary-rgb),.1); border-radius: 12px; }
  .has-files .drop-icon { color: #65dfca; background: rgba(75,221,201,.08); }
  .dropzone strong { font-size: .72rem; }
  .dropzone small { margin-top: .3rem; color: var(--text-muted); font-size: .55rem; }
  .add-card .vs-btn { width: 100%; }
  .upload-progress { display: flex; flex-direction: column; gap: .5rem; }
  .upload-progress .bar { height: 8px; overflow: hidden; background: rgba(255,255,255,.06); border-radius: 99px; }
  .upload-progress .bar span { display: block; height: 100%; background: linear-gradient(90deg,var(--color-primary),var(--color-secondary)); border-radius: inherit; transition: width .2s ease; }
  .upload-progress small { color: var(--text-muted); font-size: .6rem; text-align: center; }
  .voice-list { display: flex; flex-direction: column; gap: .55rem; }
  .voice-item { display: grid; grid-template-columns: 38px minmax(0,1fr) auto auto; align-items: center; gap: .75rem; padding: .7rem; background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 13px; transition: .16s ease; }
  .voice-item:hover { border-color: var(--border-strong); }
  .voice-item.active { background: linear-gradient(100deg,rgba(124,92,255,.1),rgba(75,221,201,.035)); border-color: rgba(var(--color-primary-rgb),.3); }
  .preview-btn { display: grid; width: 38px; height: 38px; place-items: center; color: #fff; background: linear-gradient(145deg,#8269f8,#6848dd); border: 0; border-radius: 11px; cursor: pointer; box-shadow: 0 7px 18px rgba(80,55,190,.2); }
  .preview-btn svg { font-size: .62rem; }
  .voice-copy { display: flex; min-width: 0; flex-direction: column; }
  .voice-copy strong { overflow: hidden; color: #edf0f6; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  .voice-copy span { margin-top: .2rem; color: var(--text-muted); font-size: .56rem; }
  .active-badge { display: flex; align-items: center; gap: .3rem; padding: .4rem .6rem; color: #65dfca; background: rgba(75,221,201,.1); border: 1px solid rgba(75,221,201,.25); border-radius: 9px; font-size: .6rem; font-weight: 700; }
  .voice-item .vs-btn { min-height: 34px; padding: .5rem .85rem; font-size: .66rem; }
  .delete-btn { display: grid; width: 30px; height: 30px; place-items: center; color: #697386; background: transparent; border: 0; border-radius: 8px; cursor: pointer; }
  .delete-btn:hover { color: #ff788d; background: rgba(var(--color-danger-rgb),.08); }
  .delete-confirm { text-align: center; }
  .delete-confirm > span { display: grid; width: 48px; height: 48px; margin: 0 auto .9rem; place-items: center; color: #ff788d; background: rgba(var(--color-danger-rgb),.08); border-radius: 14px; }
  .delete-confirm h3 { margin: 0; color: #fff; font-size: .9rem; }
  .delete-confirm p { margin: .4rem 0 1.2rem; color: var(--text-muted); font-size: .65rem; }
  .delete-confirm > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .delete-confirm .vs-btn { width: 100%; }
  @media (max-width: 900px) { .voice-workspace { grid-template-columns: 1fr; } }
`;
