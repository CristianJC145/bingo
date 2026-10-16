import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import BallPanel from "../components/BallPanel";
import GameStats from "../components/GameStats";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";
import { DEFAULT_VOICE, playBallAudio } from "../logic/ballAudio";
import { ACTIVE_VOICE_KEY, BallVoice, DEFAULT_VOICE_ID, listBallVoices, REPEAT_VOICE_KEY } from "../../bingoCustomization/services/ballVoices.service";
import { getGameSettings } from "../services/gameSettings.service";

const STORAGE_KEY = "bingo-free-game";
const TOTAL_BALLS = 75;

interface FreeGameState { balls: number[]; random: boolean; startedAt: number | null; }

/** El juego libre vive solo en este navegador: no hay base de datos ni sesión en el servidor. */
const loadState = (): FreeGameState => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && Array.isArray(saved.balls)) {
      return { balls: saved.balls, random: saved.random !== false, startedAt: saved.startedAt ?? null };
    }
  } catch { /* Estado ilegible: se empieza de cero. */ }
  return { balls: [], random: true, startedAt: null };
};

const FreeGamePage: React.FC = () => {
  const [initial] = useState(loadState);
  const [balls, setBalls] = useState<number[]>(initial.balls);
  const [isRandom, setIsRandom] = useState(initial.random);
  const [startedAt, setStartedAt] = useState<number | null>(initial.startedAt);
  /** Solo la última balota sorteada: el panel la marca y la canta. */
  const [lastDraw, setLastDraw] = useState<number[]>([]);
  const [gameReset, setGameReset] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [automaticBallRepeat, setAutomaticBallRepeat] = useState(false);
  const [voices, setVoices] = useState<BallVoice[]>([]);
  const [activeVoiceId] = useState<string>(() => localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID);
  const [repeatVoiceId] = useState<string>(() => localStorage.getItem(REPEAT_VOICE_KEY) ?? localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID);

  const availableVoices = [DEFAULT_VOICE, ...voices.filter((voice) => voice.ballCount >= 75)];
  const resolveVoice = (voiceId: string): BallVoice => availableVoices.find((voice) => voice.id === voiceId) ?? DEFAULT_VOICE;
  const currentBall = balls.length > 0 ? balls[balls.length - 1] : null;

  useEffect(() => {
    listBallVoices().then(setVoices).catch(() => undefined);
    getGameSettings().then((settings) => setAutomaticBallRepeat(settings.automaticBallRepeat)).catch(() => undefined);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ balls, random: isRandom, startedAt })); } catch { /* Sin almacenamiento no se persiste. */ }
  }, [balls, isRandom, startedAt]);

  /** Lo único que necesita la transmisión de OBS son las balotas. */
  const isFirstSync = useRef(true);
  useEffect(() => {
    if (isFirstSync.current) { isFirstSync.current = false; return; }
    configureApi().post(`${services.game}/free/balls`, { balls }).catch(() => undefined);
  }, [balls]);

  const markStarted = useCallback(() => setStartedAt((current) => current ?? Date.now()), []);

  const drawNumber = () => {
    const available = Array.from({ length: TOTAL_BALLS }, (_, index) => index + 1).filter((number) => !balls.includes(number));
    if (available.length === 0) {
      toast.info("Ya salieron las 75 balotas.");
      return;
    }
    const next = available[Math.floor(Math.random() * available.length)];
    markStarted();
    setGameReset(false);
    setBalls((current) => [...current, next]);
    setLastDraw([next]);
  };

  const handleManualSelect = (selected: number[]) => {
    markStarted();
    setGameReset(false);
    setBalls(selected);
  };

  const handleRepeatBall = () => {
    if (currentBall !== null) playBallAudio(currentBall, resolveVoice(repeatVoiceId));
  };

  const handleReset = async () => {
    setIsConfirmOpen(false);
    setBalls([]);
    setLastDraw([]);
    setStartedAt(null);
    setGameReset(true);
    isFirstSync.current = true;
    await configureApi().post(`${services.game}/free/reset`).catch(() => undefined);
    toast.success("Juego libre reiniciado.");
  };

  const modeLabel = isRandom ? "Aleatorio" : "Manual";

  return (
    <FreeGamePageStyle>
      <GameStats isGameStarted={startedAt !== null} balls={balls} startedAt={startedAt} />

      <section className="free-dock">
        <div className="free-header">
          <div>
            <h2>Juego libre</h2>
            <p>Solo balotas: sin cartones, figuras ni ganadores.</p>
          </div>
          <span className="free-badge"><AppIcon icon="play" /> {modeLabel}</span>
        </div>

        <div className="mode-row">
          <div>
            <span>Modo</span>
            <strong>{modeLabel}</strong>
            <small>{isRandom ? "El sistema escoge la siguiente balota" : "Marca las balotas directamente en el tablero"}</small>
          </div>
          <button type="button" className={`toggle ${isRandom ? "active" : ""}`} onClick={() => setIsRandom(!isRandom)} aria-label={`Cambiar a modo ${isRandom ? "manual" : "aleatorio"}`}><span /></button>
        </div>

        <div className="free-actions">
          <AppButton id="btn-game-random" className="draw-button" icon="plus" label="Nueva balota" onClick={drawNumber} disabled={!isRandom || balls.length >= TOTAL_BALLS} />
          <AppButton
            className="repeat-button"
            variant="light"
            icon="rotate"
            label={currentBall !== null ? String(currentBall) : "—"}
            onClick={handleRepeatBall}
            disabled={currentBall === null}
            ariaLabel={currentBall !== null ? `Repetir balota ${currentBall}` : "Repetir balota"}
          />
          <AppButton className="reset-button" variant="light" icon="rotate" label="Reiniciar" onClick={() => setIsConfirmOpen(true)} disabled={balls.length === 0} />
        </div>
      </section>

      <section className="ball-board surface-card" aria-label="Tablero de balotas BINGO">
        <BallPanel
          gameReset={gameReset}
          isActivePanel={isRandom}
          onSelectBall={handleManualSelect}
          onRandomBall={lastDraw}
          initialBalls={initial.balls}
          voice={resolveVoice(activeVoiceId)}
          repeatVoice={resolveVoice(repeatVoiceId)}
          automaticRepeat={automaticBallRepeat}
        />
      </section>

      <AppModal title="Reiniciar juego libre" isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <div className="free-confirm">
          <p><AppIcon icon="triangle-exclamation" /> Se borrarán las {balls.length} balotas cantadas. ¿Continuar?</p>
          <div>
            <AppButton outlined variant="transparent" className="text-light" onClick={() => setIsConfirmOpen(false)}>Cancelar</AppButton>
            <AppButton variant="danger" onClick={handleReset}>Reiniciar</AppButton>
          </div>
        </div>
      </AppModal>
    </FreeGamePageStyle>
  );
};

export default FreeGamePage;

const FreeGamePageStyle = styled.div`
  .free-dock { margin-bottom: 1rem; padding: 1rem 1.15rem; background: linear-gradient(145deg, rgba(255,255,255,.024), transparent 70%), var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 18px; box-shadow: var(--shadow-panel); }
  .free-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .7rem; }
  .free-header h2 { margin: 0; color: var(--text-primary); font-size: .92rem; font-weight: 600; }
  .free-header p { margin: .22rem 0 0; color: var(--text-muted); font-size: .68rem; }
  .free-badge { display: flex; align-items: center; gap: .4rem; height: 28px; padding: 0 .65rem; color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.08); border: 1px solid rgba(var(--color-secondary-rgb),.22); border-radius: 9px; font-size: .62rem; font-weight: 600; white-space: nowrap; }
  .mode-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .7rem; padding: .55rem 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
  .mode-row > div { display: flex; flex-direction: column; }
  .mode-row span { font-size: .75rem; font-weight: 600; }
  .mode-row strong { margin-top: .12rem; color: #b5a6ff; font-size: .66rem; font-weight: 700; }
  .mode-row small { margin-top: .25rem; color: var(--text-muted); font-size: .62rem; }
  .toggle { position: relative; width: 42px; height: 24px; flex: 0 0 42px; padding: 0; background: #303746; border: 0; border-radius: 99px; cursor: pointer; transition: background .2s ease; }
  .toggle span { position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #8992a5; border-radius: 50%; transition: transform .2s ease, background .2s ease; }
  .toggle.active { background: rgba(var(--color-primary-rgb),.35); }
  .toggle.active span { background: #a996ff; transform: translateX(18px); }
  .free-actions { display: grid; grid-template-columns: 1.6fr 46px 1fr; gap: .4rem; max-width: 520px; }
  .free-actions .vs-btn { width: 100%; min-height: 38px; padding: .55rem .5rem; font-size: .64rem; }
  .draw-button .vs-btn { color: #17130b; background: linear-gradient(135deg, #ffd27d, #ffb13f); box-shadow: 0 10px 28px rgba(255,184,77,.12); }
  .draw-button .vs-btn:hover:not(:disabled) { color: #17130b; background: linear-gradient(135deg, #ffda91, #ffbc56); }
  .repeat-button .vs-btn { gap: .3rem; padding: .55rem 0; color: var(--color-accent); background: rgba(255,184,77,.08); border-color: rgba(255,184,77,.22); font-size: .7rem; font-weight: 700; }
  .repeat-button .vs-btn:hover:not(:disabled) { color: #17130b; background: linear-gradient(135deg, #ffd27d, #ffb13f); }
  .ball-board { padding: 1rem 1.2rem; }
  .free-confirm { display: flex; flex-direction: column; gap: 1.2rem; color: var(--text-primary); font-size: .8rem; }
  .free-confirm p { margin: 0; display: flex; align-items: center; gap: .6rem; }
  .free-confirm > div { display: flex; justify-content: flex-end; gap: .6rem; }
`;
