import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppIcon from "../../../shared/components/AppIcon";
import { getSavedSoundVolume, getSoundUrl, listSoundEffects, SOUND_VOLUME_KEY, SoundEffect } from "../../bingoCustomization/services/soundEffects.service";

interface SoundEffectsLauncherProps {
  rouletteMode?: boolean;
}

const SoundEffectsLauncher: React.FC<SoundEffectsLauncherProps> = ({ rouletteMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [effects, setEffects] = useState<SoundEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(getSavedSoundVolume);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshEffects = useCallback(async () => {
    setLoading(true);
    try {
      setEffects(await listSoundEffects());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEffects();
    return () => audioRef.current?.pause();
  }, [refreshEffects]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (isOpen && launcherRef.current && !launcherRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

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
    audio.onerror = () => { setPlayingId(null); toast.error("No fue posible reproducir este efecto."); };
    audioRef.current = audio;
    try {
      await audio.play();
      setPlayingId(effect.id);
    } catch {
      setPlayingId(null);
      toast.error("El navegador bloqueó la reproducción del audio.");
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    localStorage.setItem(SOUND_VOLUME_KEY, String(value));
    if (audioRef.current) audioRef.current.volume = value;
  };

  const toggleLauncher = () => {
    if (!isOpen) refreshEffects();
    setIsOpen((current) => !current);
  };

  return createPortal(
    <LauncherStyle ref={launcherRef} className={rouletteMode ? "roulette-mode" : undefined}>
      {isOpen && <section className="sound-popover" aria-label="Efectos de sonido">
        <header><div><span>Efectos rápidos</span><strong>Ambienta la partida</strong></div><button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar efectos"><AppIcon icon="times" /></button></header>
        <div className="quick-list">
          {loading ? <div className="quick-empty"><span className="mini-loader" /> Cargando efectos…</div> : loadError ? <div className="quick-empty"><span><AppIcon icon="warning" /></span><strong>Biblioteca no disponible</strong><small>Comprueba que el servidor esté activo.</small><button type="button" onClick={refreshEffects}>Reintentar</button></div> : effects.length === 0 ? <div className="quick-empty"><span><AppIcon icon="bell" /></span><strong>Sin efectos todavía</strong><small>Crea tu biblioteca desde Personalización.</small><Link to="/customization/sound">Agregar sonidos</Link></div> : effects.map((effect, index) => <button type="button" className={`quick-effect ${playingId === effect.id ? "playing" : ""}`} onClick={() => playEffect(effect)} key={effect.id}><span className="quick-play"><AppIcon icon={playingId === effect.id ? "power-off" : "play"} /></span><span className="quick-copy"><strong>{effect.name}</strong><small>{playingId === effect.id ? "Reproduciendo ahora" : "Tocar efecto"}</small></span><span className="quick-wave">{Array.from({ length: 7 }, (_, bar) => <i style={{ height: `${5 + ((bar * 5 + index * 4) % 13)}px` }} key={bar} />)}</span></button>)}
        </div>
        {effects.length > 0 && <footer><span><AppIcon icon="sliders" /> Volumen</span><input aria-label="Volumen de efectos" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} /><strong>{Math.round(volume * 100)}%</strong></footer>}
      </section>}
      <button className={`sound-trigger ${isOpen ? "active" : ""}`} type="button" onClick={toggleLauncher} aria-label="Abrir efectos de sonido" aria-expanded={isOpen}>
        <span className="trigger-icon"><AppIcon icon={isOpen ? "times" : "bell"} /></span>
        {!isOpen && <span className="trigger-copy"><small>Control rápido</small><strong>Efectos</strong></span>}
        {!isOpen && effects.length > 0 && <span className="effect-count">{effects.length}</span>}
      </button>
    </LauncherStyle>,
    document.body,
  );
};

export default SoundEffectsLauncher;

const LauncherStyle = styled.div`
  position: fixed; right: 22px; bottom: 20px; z-index: 80; display: flex; align-items: flex-end; flex-direction: column; gap: .65rem;
  &.roulette-mode { z-index: 1100; }
  &.roulette-mode .sound-trigger { border-color: rgba(255,190,78,.72); box-shadow: 0 0 0 3px rgba(255,190,78,.09),0 16px 44px rgba(0,0,0,.48); }
  &.roulette-mode .trigger-icon { color: #4a2605; background: linear-gradient(145deg,#ffe385,#ffad3d); box-shadow: 0 8px 22px rgba(255,171,54,.3); }
  .sound-popover { width: min(310px,calc(100vw - 2rem)); overflow: hidden; background: linear-gradient(150deg,rgba(255,255,255,.035),transparent 48%),rgba(18,23,32,.98); border: 1px solid var(--border-strong); border-radius: 18px; box-shadow: 0 24px 70px rgba(0,0,0,.5); animation: sound-menu-in .18s ease-out; backdrop-filter: blur(18px); }
  .sound-popover header { display: flex; align-items: center; justify-content: space-between; padding: .9rem 1rem .8rem; border-bottom: 1px solid var(--border-subtle); }
  .sound-popover header > div { display: flex; flex-direction: column; }
  .sound-popover header span { color: #65dfca; font-size: .48rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .sound-popover header strong { margin-top: .18rem; color: #f4f6fa; font-size: .72rem; }
  .sound-popover header button { display: grid; width: 28px; height: 28px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.035); border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; }
  .quick-list { display: flex; max-height: 330px; overflow-y: auto; flex-direction: column; gap: .35rem; padding: .55rem; }
  .quick-effect { display: grid; width: 100%; grid-template-columns: 34px 1fr auto; align-items: center; gap: .65rem; padding: .55rem; color: var(--text-secondary); text-align: left; background: transparent; border: 1px solid transparent; border-radius: 11px; cursor: pointer; }
  .quick-effect:hover { color: #fff; background: rgba(255,255,255,.035); border-color: var(--border-subtle); }
  .quick-effect.playing { color: #fff; background: linear-gradient(100deg,rgba(124,92,255,.13),rgba(75,221,201,.04)); border-color: rgba(var(--color-primary-rgb),.25); }
  .quick-play { display: grid; width: 34px; height: 34px; place-items: center; color: #b8aaff; background: rgba(var(--color-primary-rgb),.1); border-radius: 10px; }
  .playing .quick-play { color: #16201e; background: #65dfca; }
  .quick-play svg { font-size: .58rem; }
  .quick-copy { display: flex; min-width: 0; flex-direction: column; }
  .quick-copy strong { overflow: hidden; font-size: .65rem; text-overflow: ellipsis; white-space: nowrap; }
  .quick-copy small { margin-top: .15rem; color: var(--text-muted); font-size: .48rem; }
  .playing .quick-copy small { color: #65dfca; }
  .quick-wave { display: flex; height: 19px; align-items: center; gap: 2px; }
  .quick-wave i { width: 2px; background: #424c5b; border-radius: 10px; }
  .playing .quick-wave i { background: #7560df; animation: quick-wave .6s ease-in-out infinite alternate; }
  .playing .quick-wave i:nth-child(2n) { animation-delay: -.25s; }
  .quick-empty { display: flex; min-height: 160px; align-items: center; justify-content: center; flex-direction: column; color: var(--text-muted); font-size: .58rem; text-align: center; }
  .quick-empty > span:not(.mini-loader) { display: grid; width: 38px; height: 38px; margin-bottom: .6rem; place-items: center; color: #8f7ff0; background: rgba(var(--color-primary-rgb),.08); border-radius: 11px; }
  .quick-empty strong { color: var(--text-secondary); font-size: .65rem; }
  .quick-empty small { margin-top: .2rem; }
  .quick-empty a { margin-top: .7rem; padding: .45rem .65rem; color: #c0b5ff; background: rgba(var(--color-primary-rgb),.09); border-radius: 8px; font-size: .54rem; font-weight: 700; text-decoration: none !important; }
  .quick-empty > button { margin-top: .7rem; padding: .45rem .65rem; color: #c0b5ff; background: rgba(var(--color-primary-rgb),.09); border: 0; border-radius: 8px; font-size: .54rem; font-weight: 700; cursor: pointer; }
  .mini-loader { width: 20px; height: 20px; margin-bottom: .5rem; border: 2px solid #303746; border-top-color: #8c75ff; border-radius: 50%; animation: spin .8s linear infinite; }
  .sound-popover footer { display: grid; grid-template-columns: auto 1fr 30px; align-items: center; gap: .6rem; padding: .7rem .9rem; background: rgba(0,0,0,.16); border-top: 1px solid var(--border-subtle); }
  .sound-popover footer span { display: flex; align-items: center; gap: .3rem; color: var(--text-muted); font-size: .5rem; }
  .sound-popover footer input { width: 100%; accent-color: var(--color-primary); cursor: pointer; }
  .sound-popover footer strong { color: #b8aaff; font-size: .5rem; text-align: right; }
  .sound-trigger { display: flex; min-width: 142px; min-height: 52px; align-items: center; gap: .65rem; padding: .48rem .65rem; color: #fff; text-align: left; background: linear-gradient(145deg,#242b37,#171d26); border: 1px solid #394353; border-radius: 16px; cursor: pointer; box-shadow: 0 14px 38px rgba(0,0,0,.36); transition: transform .16s ease,border-color .16s ease; }
  .sound-trigger:hover { border-color: rgba(var(--color-primary-rgb),.55); transform: translateY(-2px); }
  .sound-trigger.active { min-width: 52px; justify-content: center; border-color: rgba(var(--color-primary-rgb),.42); }
  .trigger-icon { display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; color: #f0ecff; background: linear-gradient(145deg,#8269f8,#6748dc); border-radius: 11px; box-shadow: 0 7px 18px rgba(89,61,204,.26); }
  .trigger-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
  .trigger-copy small { color: #7f899b; font-size: .45rem; letter-spacing: .05em; text-transform: uppercase; }
  .trigger-copy strong { margin-top: .12rem; font-size: .66rem; }
  .effect-count { display: grid; width: 20px; height: 20px; place-items: center; color: #17312c; background: #65dfca; border-radius: 7px; font-size: .46rem; font-weight: 800; }
  @keyframes sound-menu-in { from { opacity: 0; transform: translateY(8px) scale(.97); } }
  @keyframes quick-wave { to { height: 4px !important; opacity: .4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 600px) { right: 12px; bottom: 12px; .sound-trigger { min-width: 52px; } .trigger-copy, .effect-count { display: none; } }
`;
