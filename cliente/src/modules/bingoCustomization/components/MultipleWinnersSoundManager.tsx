import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import { playMultipleWinnersDefault } from "../../bingoGame/utils/rouletteAudio";
import {
  getMultipleWinnersSound,
  getSoundUrl,
  setMultipleWinnersSound,
  SoundEffect,
} from "../services/soundEffects.service";

interface Props { effects: SoundEffect[]; }

const MultipleWinnersSoundManager: React.FC<Props> = ({ effects }) => {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getMultipleWinnersSound()
      .then((effect) => {
        const id = effect?.id ?? null;
        setAppliedId(id);
        setSelectedId(id ?? "");
      })
      .catch(() => toast.error("No fue posible cargar el sonido para varios ganadores."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => audioRef.current?.pause(), []);

  useEffect(() => {
    if (selectedId && !effects.some((effect) => effect.id === selectedId)) setSelectedId("");
    if (appliedId && !effects.some((effect) => effect.id === appliedId)) setAppliedId(null);
  }, [appliedId, effects, selectedId]);

  const selected = useMemo(() => effects.find((effect) => effect.id === selectedId) ?? null, [effects, selectedId]);
  const applied = useMemo(() => effects.find((effect) => effect.id === appliedId) ?? null, [appliedId, effects]);
  const hasChanges = selectedId !== (appliedId ?? "");

  const stopPreview = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(false);
  };

  const preview = async () => {
    if (playing) { stopPreview(); return; }
    audioRef.current?.pause();
    if (!selected) {
      playMultipleWinnersDefault();
      return;
    }
    const audio = new Audio(getSoundUrl(selected.url));
    audio.volume = 0.95;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => { setPlaying(false); toast.error("No fue posible reproducir el sonido seleccionado."); };
    audioRef.current = audio;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); toast.error("El navegador bloqueó la reproducción del audio."); }
  };

  const save = async () => {
    setSaving(true);
    stopPreview();
    try {
      const effect = await setMultipleWinnersSound(selectedId || null);
      setAppliedId(effect?.id ?? null);
      toast.success(effect ? "Sonido para varios ganadores actualizado." : "Se restauró el aviso instrumental para varios ganadores.");
    } catch {
      toast.error("No fue posible guardar el sonido para varios ganadores.");
    } finally { setSaving(false); }
  };

  return (
    <MultipleSoundStyle className="surface-card">
      <div className="event-copy">
        <span className="event-icon"><AppIcon icon="users" /></span>
        <div>
          <small>Bingo con empate</small>
          <h2>Sonido para varios ganadores</h2>
          <p>Se reproduce únicamente cuando dos o más cartones completan la figura. La canción “Bingo” queda reservada para un solo ganador.</p>
        </div>
      </div>

      <div className="sound-selector">
        <label>
          <span>Audio del evento</span>
          <select value={selectedId} onChange={(event) => { stopPreview(); setSelectedId(event.target.value); }} disabled={loading}>
            <option value="">Aviso instrumental predeterminado</option>
            {effects.map((effect) => <option key={effect.id} value={effect.id}>{effect.name}</option>)}
          </select>
        </label>
        <div className="selection-state">
          <i />
          <div><small>SONIDO ACTIVO</small><strong>{loading ? "Cargando…" : applied?.name ?? "Aviso instrumental predeterminado"}</strong></div>
        </div>
        <div className="event-actions">
          <AppButton variant="light" icon={playing ? "power-off" : "play"} label={playing ? "Detener" : "Escuchar"} onClick={preview} disabled={loading} />
          <AppButton icon="check" label={saving ? "Guardando…" : "Aplicar selección"} onClick={save} disabled={loading || saving || !hasChanges} />
        </div>
      </div>
      {effects.length === 0 && <div className="library-tip"><AppIcon icon="bell" /><span>Para usar una canción propia, agrégala primero a la biblioteca de efectos situada arriba.</span></div>}
    </MultipleSoundStyle>
  );
};

export default MultipleWinnersSoundManager;

const MultipleSoundStyle = styled.section`
  display:grid;grid-template-columns:minmax(280px,.9fr) minmax(420px,1.1fr);gap:1rem;margin-top:1.25rem;padding:1.25rem;
  .event-copy{display:flex;align-items:flex-start;gap:.8rem}.event-icon{display:grid;width:44px;height:44px;flex:0 0 44px;place-items:center;color:#27142e;background:linear-gradient(145deg,#ffcf76,#ff7baf);border-radius:13px;box-shadow:0 9px 24px rgba(255,103,158,.18)}.event-copy>div{display:flex;min-width:0;flex-direction:column}.event-copy small{color:#ff98bf;font-size:.52rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.event-copy h2{margin:.24rem 0;color:#fff;font-size:.95rem}.event-copy p{max-width:520px;margin:0;color:var(--text-muted);font-size:.6rem;line-height:1.55}
  .sound-selector{display:grid;grid-template-columns:minmax(190px,1fr) auto;gap:.65rem}.sound-selector label{grid-column:1/-1;display:flex;flex-direction:column;gap:.35rem}.sound-selector label>span{color:var(--text-muted);font-size:.52rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.sound-selector select{width:100%;padding:.7rem .8rem;color:var(--text-primary);background:var(--bg-soft);border:1px solid var(--border-subtle);border-radius:11px;outline:0;font-size:.66rem}.sound-selector select:focus{border-color:rgba(var(--color-primary-rgb),.5)}.selection-state{display:flex;min-width:0;align-items:center;gap:.55rem;padding:.55rem .7rem;background:rgba(255,255,255,.025);border:1px solid var(--border-subtle);border-radius:11px}.selection-state>i{width:8px;height:8px;flex:0 0 8px;background:#65dfca;border-radius:50%;box-shadow:0 0 9px #65dfca}.selection-state>div{display:flex;min-width:0;flex-direction:column}.selection-state small{color:var(--text-muted);font-size:.44rem;letter-spacing:.08em}.selection-state strong{margin-top:.12rem;overflow:hidden;color:#eeeaf8;font-size:.6rem;text-overflow:ellipsis;white-space:nowrap}.event-actions{display:flex;gap:.45rem}.event-actions .vs-btn{min-height:38px}.library-tip{display:flex;grid-column:1/-1;align-items:center;gap:.45rem;padding:.55rem .7rem;color:#ffd88b;background:rgba(255,194,74,.055);border:1px solid rgba(255,194,74,.14);border-radius:10px;font-size:.54rem}
  @media(max-width:900px){grid-template-columns:1fr}.event-actions{justify-content:flex-end}@media(max-width:620px){.sound-selector{grid-template-columns:1fr}.event-actions{justify-content:stretch}.event-actions>div{flex:1}.event-actions .vs-btn{width:100%}}
`;
