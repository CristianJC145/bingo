import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import BallPanel from "../components/BallPanel";
import FigureSelector from "../components/FigureSelector";
import CartonRangeSelector from "../components/CartonRangeSelector";
import GameStats from "../components/GameStats";
import WinnerModal from "../components/WinnerModal";
import ListWinnerModal from "../components/ListWinnersModal";
import ConfirmFinish from "../components/ConfirmDelete";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import configureApi from "../../../shared/utils/axios";
import { CheckWinnerService } from "../services/checkWinner.service";
import { GameSessionService } from "../services/gameSession.service";
import { ALL_CAREGIVER_VALUES, ALL_DISABILITY_VALUES, ALL_MUNICIPALITY_VALUES, getGameSettings } from "../services/gameSettings.service";
import { getValidNumbers } from "../logic/getValidNumers";
import { DEFAULT_VOICE, playBallAudio, waitForCurrentBallAudio } from "../logic/ballAudio";
import { ACTIVE_VOICE_KEY, BallVoice, DEFAULT_VOICE_ID, listBallVoices, REPEAT_VOICE_KEY } from "../../bingoCustomization/services/ballVoices.service";
import SoundEffectsLauncher from "../components/SoundEffectsLauncher";
import WinnerRouletteControl from "../components/WinnerRouletteControl";
import { announceWinnerRoulette, getWinnerRoulette } from "../services/winnerRoulette.service";

const checkWinnerService = new CheckWinnerService();
const gameSessionService = new GameSessionService();

interface Figure { id: number; name: string; pattern: boolean[][]; }
interface Card { id: number; pattern: number[][]; patternFigure: boolean[][]; }
interface CartonRange { start?: number; end?: number; specific?: number[]; }

const BingoGamePage: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedFigures, setSelectedFigures] = useState<Figure[]>([]);
  const [cartonRange, setCartonRange] = useState<CartonRange>({ start: 0, end: 0, specific: [] });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [balls, setBalls] = useState<number[]>([]);
  const [gameRandom, setGameRandom] = useState(true);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [cardsRangue, setCardsRangue] = useState(false);
  const [gameReset, setGameReset] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [winner, setWinner] = useState<Card[]>([]);
  const [isOpenWinnerModal, setIsOpenWinnerModal] = useState(false);
  const [previousWinners, setPreviousWinners] = useState<Card[]>([]);
  /** Espejo de los ganadores ya conocidos, para decidir fuera de un actualizador de estado. */
  const previousWinnersRef = useRef<Card[]>([]);
  /** Cartones empatados a la espera del sorteo. */
  const [rouletteCards, setRouletteCards] = useState<Card[]>([]);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [isOpenConfirmModal, setIsOpenConfirmModal] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isWinnerOnObs, setIsWinnerOnObs] = useState(false);
  /** Aviso del filtro configurado: sin él no se entendería por qué un cartón no gana. */
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const [activeMunicipalityCount, setActiveMunicipalityCount] = useState(ALL_MUNICIPALITY_VALUES.length);
  const [activeDisabilityCount, setActiveDisabilityCount] = useState(ALL_DISABILITY_VALUES.length);
  const [activeCaregiverCount, setActiveCaregiverCount] = useState(ALL_CAREGIVER_VALUES.length);
  const [automaticBallRepeat, setAutomaticBallRepeat] = useState(false);
  const [voices, setVoices] = useState<BallVoice[]>([]);
  const [activeVoiceId] = useState<string>(() => localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID);
  const [repeatVoiceId] = useState<string>(() => localStorage.getItem(REPEAT_VOICE_KEY) ?? localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID);

  const availableVoices = [DEFAULT_VOICE, ...voices.filter((voice) => voice.ballCount >= 75)];
  const resolveVoice = (voiceId: string): BallVoice => availableVoices.find((voice) => voice.id === voiceId) ?? DEFAULT_VOICE;
  const activeVoice = resolveVoice(activeVoiceId);
  const currentBall = balls.length > 0 ? balls[balls.length - 1] : null;

  /** El estado real de la celebración vive en el servidor, no en esta pantalla. */
  const syncWinnerOverlay = useCallback(async () => {
    try {
      const response = await configureApi().get("http://localhost:3000/api/game/winner-overlay");
      setIsWinnerOnObs(Boolean(response.data?.data?.visible));
    } catch { /* Un fallo puntual no debe interrumpir la partida. */ }
  }, []);

  useEffect(() => {
    listBallVoices().then((data) => setVoices(data)).catch(() => undefined);
    syncWinnerOverlay();
    getGameSettings()
      .then((settings) => {
        setRegisteredOnly(settings.registeredCardsOnly);
        setActiveMunicipalityCount(settings.activeMunicipalities.length);
        setActiveDisabilityCount(settings.activeDisabilities.length);
        setActiveCaregiverCount(settings.activeCaregiverStatuses.length);
        setAutomaticBallRepeat(settings.automaticBallRepeat);
      })
      .catch(() => undefined);
    // Si se recarga el panel con un sorteo pendiente, el mando debe volver a aparecer.
    getWinnerRoulette()
      .then((state) => { if (state.active) setIsRouletteOpen(true); })
      .catch(() => undefined);
  }, [syncWinnerOverlay]);

  /** Repite la presentación grande de las figuras sobre la transmisión. */
  const handleShowcaseFigures = async () => {
    try {
      await configureApi().post("http://localhost:3000/api/game/showcase-figure", { figures: selectedFigures });
      toast.success("Figura presentada en la transmisión.");
    } catch (error) {
      console.error("Error presentando las figuras:", error);
      toast.error("No fue posible presentar la figura.");
    }
  };

  const handleRepeatBall = () => {
    if (currentBall === null) return;
    playBallAudio(currentBall, resolveVoice(repeatVoiceId));
  };

  /** La celebración se muestra u oculta a voluntad del administrador. */
  const handleToggleWinnerOnObs = async () => {
    const nextVisible = !isWinnerOnObs;
    try {
      await configureApi().post("http://localhost:3000/api/game/winner-overlay", { visible: nextVisible });
      setIsWinnerOnObs(nextVisible);
    } catch (error) {
      console.error("Error cambiando la visibilidad del ganador:", error);
      toast.error("No fue posible cambiar la visibilidad del ganador.");
    }
  };

  useEffect(() => {
    gameSessionService.get().then((session) => {
      setCartonRange(session.cartonRange ?? { start: 0, end: 0, specific: [] });
      setCardsRangue(Boolean(session.cardsRangue));
      setSelectedFigures(session.selectedFigures ?? []);
      setIsGameStarted(Boolean(session.isGameStarted));
      setGameRandom(session.gameRandom ?? true);
      setBalls(session.balls ?? []);
      setDrawnNumbers(session.drawnNumbers ?? []);
      previousWinnersRef.current = session.previousWinners ?? [];
      setPreviousWinners(previousWinnersRef.current);
      setStartedAt(session.startedAt ?? null);
      if (session.isGameStarted) {
        toast.info(
          <div className="app-toast-copy">
            <strong>Partida reanudada</strong>
            <span>Se restauró el progreso guardado.</span>
          </div>,
          { icon: <AppIcon icon="rotate" /> }
        );
      }
    }).catch(() => undefined).finally(() => setIsHydrated(true));
    // Solo se ejecuta una vez al montar, para restaurar la sesión guardada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const timeoutId = window.setTimeout(() => {
      gameSessionService.save({
        cartonRange,
        cardsRangue,
        selectedFigures,
        isGameStarted,
        gameRandom,
        balls,
        drawnNumbers,
        previousWinners,
        startedAt,
      });
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [isHydrated, cartonRange, cardsRangue, selectedFigures, isGameStarted, gameRandom, balls, drawnNumbers, previousWinners, startedAt]);

  const hasCartonRangeData = useCallback(() => {
    const { start, end, specific } = cartonRange;
    return (typeof start === "number" && start !== 0 && typeof end === "number" && end !== 0)
      || (Array.isArray(specific) && specific.length > 0);
  }, [cartonRange]);

  const checkForWinner = async (selectedBalls: number[]) => {
    if (!isGameStarted) return;
    const response = await checkWinnerService.run({ balls: selectedBalls, figures: selectedFigures, range: cartonRange });
    const { winner: hasWinner, winningCards } = response;
    if (!hasWinner) return;

    const known = previousWinnersRef.current;
    const newWinningCards: Card[] = winningCards.filter((card: Card) => !known.some((item) => item.id === card.id));
    if (newWinningCards.length === 0) return;

    previousWinnersRef.current = [...known, ...newWinningCards];
    setPreviousWinners(previousWinnersRef.current);

    /*
     * Con un solo ganador la celebración sigue su curso. Con varios el premio se
     * sortea: el servidor ya abrió la ruleta, aquí solo se levanta su panel de mando.
     */
    if (newWinningCards.length > 1) {
      setRouletteCards(newWinningCards);
      setIsRouletteOpen(true);
      // La escena puede entrar de inmediato, pero su anuncio espera a que la voz
      // termine de cantar por completo la balota que produjo el empate.
      void (async () => {
        await waitForCurrentBallAudio();
        await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
        await announceWinnerRoulette().catch(() => undefined);
      })();
    } else {
      setWinner(newWinningCards);
      setIsWinner(true);
    }
    // El servidor decide qué se ve en la transmisión: el botón debe reflejarlo.
    syncWinnerOverlay();
  };

  /** La ruleta ya eligió: la celebración continúa con ese único cartón. */
  const handleRouletteResolved = (cardNumber: number) => {
    const chosen = rouletteCards.find((card) => card.id === cardNumber);
    setIsRouletteOpen(false);
    setRouletteCards([]);
    if (chosen) { setWinner([chosen]); setIsWinner(true); }
    syncWinnerOverlay();
  };

  const handleRouletteCancelled = () => {
    setIsRouletteOpen(false);
    setRouletteCards([]);
    syncWinnerOverlay();
  };

  useEffect(() => {
    if (!isHydrated) return;
    setAllReady(selectedFigures.length > 0 && hasCartonRangeData());
  }, [isHydrated, selectedFigures, cartonRange, hasCartonRangeData]);

  const isFirstDrawnNumbersRender = useRef(true);
  useEffect(() => {
    if (!isHydrated) return;
    if (isFirstDrawnNumbersRender.current) { isFirstDrawnNumbersRender.current = false; return; }
    if (gameRandom && drawnNumbers.length > 0) {
      const updatedBalls = Array.from(new Set([...balls, ...drawnNumbers]));
      setBalls(updatedBalls);
      checkForWinner(updatedBalls);
    }
    // The draw list is cumulative and is the source of truth for random mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, drawnNumbers]);

  const handleSelectBall = (selectedBalls: number[]) => {
    setBalls(selectedBalls);
    checkForWinner(selectedBalls);
    setDrawnNumbers(selectedBalls);
  };

  const handleSelectFigure = async (figures: Figure[]) => {
    try {
      await configureApi().post("http://localhost:3000/api/game/update-figure", { figures });
      setSelectedFigures(figures);
    } catch (error) {
      console.error("Error obteniendo las figuras:", error);
    }
  };

  const handleSelectRange = (range: CartonRange) => {
    setCartonRange(range);
    setGameReset(false);
  };

  const handleCardsModeChange = (specific: boolean) => {
    if (specific === cardsRangue) return;
    setCardsRangue(specific);
    handleSelectRange({ start: 0, end: 0, specific: [] });
  };

  const handleFinishGame = async () => {
    try {
      await configureApi().post("http://localhost:3000/api/game/reset-game");
    } catch (error) {
      console.error("Error resetting game:", error);
    }
    setAllReady(false);
    setBalls([]);
    setCardsRangue(false);
    setDrawnNumbers([]);
    setGameRandom(true);
    setCartonRange({ start: 0, end: 0, specific: [] });
    setSelectedFigures([]);
    setIsGameStarted(false);
    setGameReset(true);
    setWinner([]);
    previousWinnersRef.current = [];
    setPreviousWinners([]);
    setStartedAt(null);
    // `reset-game` apaga la celebración y cierra cualquier sorteo en el servidor.
    setIsWinnerOnObs(false);
    setIsRouletteOpen(false);
    setRouletteCards([]);
  };

  const handleStartOrFinishGame = () => {
    if (allReady && !isGameStarted) {
      setIsGameStarted(true);
      setStartedAt(Date.now());
      toast.success(
        <div className="app-toast-copy">
          <strong>Partida iniciada</strong>
          <span>El tablero está activo y el cronómetro comenzó.</span>
        </div>,
        { icon: <AppIcon icon="play" /> }
      );
    } else if (isGameStarted) {
      setIsOpenConfirmModal(true);
    }
  };

  const drawNumber = () => {
    const validNumbers = getValidNumbers(selectedFigures);
    const availableNumbers = validNumbers.filter((number) => !drawnNumbers.includes(number));
    if (availableNumbers.length === 0) {
      toast.info("Ya se cantaron todas las balotas disponibles para estas figuras.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    setDrawnNumbers([...drawnNumbers, availableNumbers[randomIndex]]);
  };

  const rangeLabel = cartonRange.specific?.length
    ? `${cartonRange.specific.length} específicos`
    : cartonRange.start && cartonRange.end
      ? `${cartonRange.start} — ${cartonRange.end}`
      : "Sin definir";
  const hasValidRange = hasCartonRangeData();

  if (!isHydrated) {
    return (
      <BingoGamePageStyle>
        <div className="hydrating-state"><AppIcon icon="rotate" /><span>Restaurando la partida guardada…</span></div>
      </BingoGamePageStyle>
    );
  }

  return (
    <BingoGamePageStyle>
      <GameStats isGameStarted={isGameStarted} balls={balls} startedAt={startedAt} />

      <section className="control-dock">
          <div className={`dock-card range-card ${isGameStarted ? "is-disabled" : ""}`} aria-disabled={isGameStarted}>
            <div className="control-header">
              <div><h2>Cartones</h2><p>{rangeLabel}</p></div>
              {/* El filtro se avisa en la cabecera para no robar altura a la tarjeta. */}
              {(registeredOnly || activeMunicipalityCount < ALL_MUNICIPALITY_VALUES.length || activeDisabilityCount < ALL_DISABILITY_VALUES.length || activeCaregiverCount < ALL_CAREGIVER_VALUES.length) && (
                <span
                  className="filter-note"
                  title="Solo compiten cartones que cumplen los filtros configurados en Juego › Configuración"
                >
                  <AppIcon icon="list" />
                  {activeDisabilityCount < ALL_DISABILITY_VALUES.length || activeCaregiverCount < ALL_CAREGIVER_VALUES.length
                    ? "Filtros activos"
                    : activeMunicipalityCount < ALL_MUNICIPALITY_VALUES.length
                      ? `${activeMunicipalityCount} municipios`
                      : "Solo registrados"}
                </span>
              )}
              <span className={`step-state ${hasValidRange ? "complete" : ""}`}><AppIcon icon={hasValidRange ? "check" : "clone"} /></span>
            </div>
            <div className="segment-control">
              <button className={!cardsRangue ? "active" : ""} onClick={() => handleCardsModeChange(false)} disabled={isGameStarted}>Por rango</button>
              <button className={cardsRangue ? "active" : ""} onClick={() => handleCardsModeChange(true)} disabled={isGameStarted}>Específicos</button>
            </div>
            <CartonRangeSelector disabled={isGameStarted} gameReset={gameReset} onCardsRangue={cardsRangue} onSelectRange={handleSelectRange} initialRange={cartonRange} />
          </div>

          <FigureSelector disabled={!hasValidRange || isGameStarted} gameReset={gameReset} onSelectFigure={handleSelectFigure} onShowcase={handleShowcaseFigures} initialSelectedIds={selectedFigures.map((figure) => figure.id)} />

          <div className={`dock-card session-card ${!allReady ? "is-disabled" : ""} ${isGameStarted ? "is-live" : ""}`} aria-disabled={!allReady}>
            <div className="control-header"><div><h2>Partida</h2><p>{isGameStarted ? "Partida en curso" : allReady ? "Lista para iniciar" : "Selecciona una figura para continuar"}</p></div><span className={`step-state ${isGameStarted ? "live" : allReady ? "complete" : "locked"}`}><AppIcon icon={isGameStarted ? "play" : allReady ? "check" : "lock"} /></span></div>
            <div className="mode-row"><div><span>Modo de juego</span><strong>{gameRandom ? "Automático" : "Manual"}</strong><small>{gameRandom ? "El sistema escoge la siguiente balota" : "Marca las balotas directamente en el tablero"}</small></div><button className={`toggle ${gameRandom ? "active" : ""}`} onClick={() => setGameRandom(!gameRandom)} disabled={!isGameStarted} aria-label={`Cambiar a modo ${gameRandom ? "manual" : "automático"}`}><span /></button></div>
            <div className="session-actions">
              <AppButton className={`start-button ${isGameStarted ? "finish" : ""}`} variant={isGameStarted ? "light" : "primary"} icon={isGameStarted ? "rotate" : "play"} label={isGameStarted ? "Finalizar" : "Iniciar partida"} onClick={handleStartOrFinishGame} disabled={!allReady} />
              <AppButton id="btn-game-random" className="draw-button" icon="plus" label="Nueva balota" onClick={drawNumber} disabled={!isGameStarted || !gameRandom} />
              <AppButton
                className="repeat-button"
                variant="light"
                icon="rotate"
                label={currentBall !== null ? String(currentBall) : "—"}
                onClick={handleRepeatBall}
                disabled={currentBall === null}
                ariaLabel={currentBall !== null ? `Repetir balota ${currentBall}` : "Repetir balota"}
              />
            </div>
            {previousWinners.length > 0 && (
              <div className="winner-row">
                <button className="winner-inline" onClick={() => setIsOpenWinnerModal(true)}><AppIcon icon="trophy" /><span>{previousWinners.length} {previousWinners.length === 1 ? "ganador" : "ganadores"}</span><b>Ver →</b></button>
                <button
                  type="button"
                  className={`obs-toggle ${isWinnerOnObs ? "on" : ""}`}
                  onClick={handleToggleWinnerOnObs}
                  title={isWinnerOnObs ? "Ocultar la celebración en OBS" : "Mostrar la celebración en OBS"}
                  aria-label={isWinnerOnObs ? "Ocultar ganador en OBS" : "Mostrar ganador en OBS"}
                  aria-pressed={isWinnerOnObs}
                >
                  <AppIcon icon={isWinnerOnObs ? "ad" : "power-off"} />
                </button>
              </div>
            )}

          </div>
      </section>

      <section className="ball-board surface-card" aria-label="Tablero de balotas BINGO">
        <BallPanel gameReset={gameReset} isActivePanel={!isGameStarted || gameRandom} onSelectBall={handleSelectBall} onRandomBall={drawnNumbers} initialBalls={balls} voice={activeVoice} repeatVoice={resolveVoice(repeatVoiceId)} automaticRepeat={automaticBallRepeat} />
      </section>

      <WinnerModal onClose={() => setIsWinner(false)} winnerCards={winner} isOpen={isWinner} />

      {/* Empate: el sorteo se controla desde aquí y no se puede cerrar por descuido. */}
      <AppModal title="Sorteo entre ganadores" size="md" isOpen={isRouletteOpen} onClose={() => undefined}>
        <WinnerRouletteControl onResolved={handleRouletteResolved} onCancelled={handleRouletteCancelled} />
      </AppModal>
      {isOpenWinnerModal && <ListWinnerModal isOpen={isOpenWinnerModal} onClose={() => setIsOpenWinnerModal(false)} winner={previousWinners} drawNumbers={drawnNumbers} />}
      <AppModal title="Finalizar partida" isOpen={isOpenConfirmModal} onClose={() => setIsOpenConfirmModal(false)}><ConfirmFinish onClose={() => setIsOpenConfirmModal(false)} onSave={handleFinishGame} /></AppModal>
      <SoundEffectsLauncher rouletteMode={isRouletteOpen} />
    </BingoGamePageStyle>
  );
};

export default BingoGamePage;

const BingoGamePageStyle = styled.div`
  .hydrating-state { display: flex; min-height: 320px; align-items: center; justify-content: center; flex-direction: column; gap: .8rem; color: var(--text-muted); font-size: .78rem; }
  .hydrating-state svg { font-size: 1.4rem; animation: spin 1.1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .page-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; }
  .game-state { display: flex; min-width: 190px; align-items: center; gap: .75rem; padding: .8rem 1rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .game-state > span { width: 9px; height: 9px; background: var(--color-accent); border-radius: 50%; box-shadow: 0 0 0 6px rgba(255,184,77,.08); }
  .game-state.live > span { background: var(--color-secondary); box-shadow: 0 0 0 6px rgba(var(--color-secondary-rgb),.08); animation: pulse 2s infinite; }
  .game-state div { display: flex; flex-direction: column; line-height: 1.2; }
  .game-state small { color: var(--text-muted); font-size: .64rem; text-transform: uppercase; letter-spacing: .08em; }
  .game-state strong { margin-top: .3rem; font-size: .76rem; font-weight: 600; }
  .game-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 1.25rem; align-items: start; }
  .ball-board { min-width: 0; padding: clamp(1rem, 2vw, 1.5rem); }
  .panel-heading, .panel-heading > div, .control-header { display: flex; align-items: center; }
  .panel-heading { justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
  .panel-heading > div, .control-header { gap: .8rem; }
  .panel-heading h2, .control-header h2 { margin: 0; color: var(--text-primary); font-size: .92rem; font-weight: 600; }
  .panel-heading p, .control-header p { margin: .22rem 0 0; color: var(--text-muted); font-size: .68rem; }
  .panel-index { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.035); border: 1px solid var(--border-subtle); border-radius: 10px; font-family: "Poppins", sans-serif; font-size: .62rem; font-weight: 700; }
  .played-strip { display: flex; align-items: center; gap: 1.2rem; margin-top: 1.4rem; padding-top: 1.1rem; border-top: 1px solid var(--border-subtle); }
  .played-label { display: flex; min-width: 130px; flex-direction: column; }
  .played-label span { color: var(--text-muted); font-size: .62rem; text-transform: uppercase; letter-spacing: .1em; }
  .played-label strong { margin-top: .2rem; font-size: .7rem; font-weight: 600; }
  .played-list { display: flex; min-width: 0; gap: .38rem; overflow-x: auto; padding: .2rem 0; }
  .history-ball { display: grid; width: 29px; height: 29px; flex: 0 0 29px; place-items: center; color: var(--text-secondary); background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 9px; font-size: .68rem; font-weight: 700; }
  .empty-history { color: var(--text-muted); font-size: .7rem; }
  .control-rail { display: flex; flex-direction: column; gap: 1rem; }
  .control-card { padding: 1.1rem; }
  .control-header { margin-bottom: 1rem; }
  .segment-control { display: grid; grid-template-columns: 1fr 1fr; gap: .25rem; margin-bottom: .8rem; padding: .25rem; background: rgba(0,0,0,.22); border-radius: 11px; }
  .segment-control button { padding: .58rem .5rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 8px; font-size: .68rem; font-weight: 600; cursor: pointer; }
  .segment-control button.active { color: #fff; background: var(--bg-soft); box-shadow: 0 2px 8px rgba(0,0,0,.16); }
  .segment-control button:disabled { cursor: not-allowed; opacity: .55; }
  .mode-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding: .85rem 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
  .mode-row > div { display: flex; flex-direction: column; }
  .mode-row span { font-size: .75rem; font-weight: 600; }
  .mode-row strong { margin-top: .12rem; color: #b5a6ff; font-size: .66rem; font-weight: 700; }
  .mode-row small { margin-top: .25rem; color: var(--text-muted); font-size: .62rem; }
  .toggle { position: relative; width: 42px; height: 24px; flex: 0 0 42px; padding: 0; background: #303746; border: 0; border-radius: 99px; cursor: pointer; transition: background .2s ease; }
  .toggle span { position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #8992a5; border-radius: 50%; transition: transform .2s ease, background .2s ease; }
  .toggle.active { background: rgba(var(--color-primary-rgb),.35); }
  .toggle.active span { background: #a996ff; transform: translateX(18px); }
  .toggle:disabled { cursor: not-allowed; opacity: .45; }
  .draw-button, .start-button { width: 100%; }
  .draw-button .vs-btn, .start-button .vs-btn { width: 100%; }
  .draw-button { margin-bottom: .55rem; }
  .draw-button .vs-btn { color: #17130b; background: linear-gradient(135deg, #ffd27d, #ffb13f); box-shadow: 0 10px 28px rgba(255,184,77,.12); }
  .draw-button .vs-btn:hover:not(:disabled) { color: #17130b; background: linear-gradient(135deg, #ffda91, #ffbc56); }
  .readiness-note { display: flex; align-items: center; justify-content: center; gap: .4rem; margin: .75rem 0 0; color: var(--text-muted); font-size: .62rem; }
  .winner-summary { display: flex; width: 100%; align-items: center; gap: .75rem; padding: 1rem; color: #fff; text-align: left; background: linear-gradient(125deg, rgba(255,184,77,.16), rgba(124,92,255,.13)), var(--bg-panel); border: 1px solid rgba(255,184,77,.25); border-radius: 16px; cursor: pointer; }
  .trophy { display: grid; width: 38px; height: 38px; place-items: center; color: var(--color-accent); background: rgba(255,184,77,.1); border-radius: 12px; }
  .winner-summary > span:nth-child(2) { display: flex; flex: 1; flex-direction: column; }
  .winner-summary small { color: var(--text-secondary); font-size: .62rem; }
  .winner-summary strong { margin-top: .2rem; font-size: .78rem; }
  .winner-summary b { color: var(--color-accent); font-size: .65rem; }
  @keyframes pulse { 50% { box-shadow: 0 0 0 9px rgba(var(--color-secondary-rgb),0); } }
  @keyframes live-sweep { 0%, 100% { opacity: .35; transform: translateX(-35%); } 50% { opacity: 1; transform: translateX(35%); } }
  .control-dock { display: grid; grid-template-columns: .9fr 1.05fr 1.15fr; margin-bottom: 1rem; overflow: hidden; background: linear-gradient(145deg, rgba(255,255,255,.024), transparent 70%), var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 18px; box-shadow: var(--shadow-panel); }
  .dock-card { min-width: 0; padding: 1rem 1.15rem; border-right: 1px solid var(--border-subtle); }
  .control-dock > section { min-width: 0; background: transparent !important; border: 0 !important; border-right: 1px solid var(--border-subtle) !important; border-radius: 0 !important; box-shadow: none !important; }
  .control-dock > :last-child { border-right: 0 !important; }
  .control-dock .control-header { margin-bottom: .7rem; }
  .control-dock .control-header { justify-content: space-between; }
  .control-dock .is-disabled { opacity: .48; filter: saturate(.72); pointer-events: none; }
  .control-dock .is-disabled::after { pointer-events: none; }
  .step-state { display: grid; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.035); border: 1px solid var(--border-subtle); border-radius: 9px; font-size: .62rem; }
  .step-state.complete { color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.08); border-color: rgba(var(--color-secondary-rgb),.18); }
  .step-state.locked { color: #596173; background: rgba(0,0,0,.12); }
  .step-state.live { color: var(--color-accent); background: rgba(255,184,77,.08); border-color: rgba(255,184,77,.2); animation: pulse 2s infinite; }
  .control-dock .figure-preview { min-height: 70px; margin-bottom: 0; }
  .control-dock .figure-chips { max-height: 24px; margin: .45rem 0 0; overflow: hidden; }
  .session-card .control-header { position: relative; padding-right: 1rem; }
  .session-card { position: relative; overflow: hidden; transition: background .25s ease, box-shadow .25s ease; }
  .session-card::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; content: ""; background: transparent; transition: background .25s ease; }
  .session-card.is-live { background: linear-gradient(145deg, rgba(var(--color-secondary-rgb),.075), transparent 52%); box-shadow: inset 0 0 0 1px rgba(var(--color-secondary-rgb),.08); }
  .session-card.is-live::before { background: linear-gradient(90deg, transparent, var(--color-secondary), transparent); animation: live-sweep 2.8s ease-in-out infinite; }
  .session-status { position: absolute; right: 0; width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; box-shadow: 0 0 0 5px rgba(104,113,132,.08); }
  .session-status.ready { background: var(--color-accent); box-shadow: 0 0 0 5px rgba(255,184,77,.08); }
  .session-status.live { background: var(--color-secondary); box-shadow: 0 0 0 5px rgba(var(--color-secondary-rgb),.08); animation: pulse 2s infinite; }
  .session-card .mode-row { margin-bottom: .7rem; padding: .55rem 0; }
  /* Acción principal ancha, secundaria a la izquierda y repetir compacto: el botón cuadrado
     de cada fila queda alineado a la derecha, dando ritmo sin ocupar más alto. */
  .session-actions { display: grid; grid-template-columns: 1fr 1.35fr 46px; gap: .4rem; }
  .session-actions .draw-button { margin-bottom: 0; }
  .session-actions .vs-btn { min-height: 38px; padding: .55rem .5rem; font-size: .64rem; }
  .repeat-button .vs-btn { gap: .3rem; padding: .55rem 0; color: var(--color-accent); background: rgba(255,184,77,.08); border-color: rgba(255,184,77,.22); font-size: .7rem; font-weight: 700; }
  .repeat-button .vs-btn svg { font-size: .62rem; }
  .repeat-button .vs-btn:hover:not(:disabled) { color: #17130b; background: linear-gradient(135deg, #ffd27d, #ffb13f); }
  .ball-board { padding: 1rem 1.2rem; }
  .ball-board .panel-heading { margin-bottom: .85rem; }
  .winner-inline { display: flex; width: 100%; align-items: center; gap: .45rem; padding: .48rem .7rem; color: var(--color-accent); background: rgba(255,184,77,.07); border: 1px solid rgba(255,184,77,.18); border-radius: 9px; font-size: .64rem; font-weight: 600; cursor: pointer; transition: background .16s ease, border-color .16s ease; }
  .winner-inline:hover { background: rgba(255,184,77,.12); border-color: rgba(255,184,77,.3); }
  .winner-inline > span { flex: 1; text-align: left; }
  .winner-inline b { color: var(--text-secondary); font-size: .58rem; font-weight: 600; }
  /* Misma rejilla que la fila de acciones: el toggle cae bajo el botón de repetir. */
  /* Aviso del filtro: comparte la fila del indicador, sin sumar alto a la tarjeta. */
  .range-card .control-header { gap: .5rem; }
  .range-card .control-header > div:first-child { min-width: 0; flex: 1; }
  .range-card .control-header > div:first-child p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .filter-note { display: flex; flex: 0 0 auto; align-items: center; gap: .35rem; height: 28px; padding: 0 .55rem; color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.08); border: 1px solid rgba(var(--color-secondary-rgb),.22); border-radius: 9px; font-size: .58rem; font-weight: 600; white-space: nowrap; }
  .filter-note svg { font-size: .62rem; }

  .winner-row { display: grid; grid-template-columns: 1fr 46px; gap: .4rem; align-items: stretch; margin-top: .4rem; }
  .winner-row .winner-inline { margin-top: 0; }
  /* Apagado cuando la celebración no está al aire; encendido cuando sí. */
  .obs-toggle { display: grid; place-items: center; padding: 0; color: var(--text-muted); background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); border-radius: 9px; font-size: .72rem; cursor: pointer; transition: color .16s ease, background .16s ease, border-color .16s ease; }
  .obs-toggle:hover { color: var(--text-primary); background: rgba(255,255,255,.08); }
  .obs-toggle.on { color: #ff8e99; background: rgba(var(--color-danger-rgb),.12); border-color: rgba(var(--color-danger-rgb),.35); box-shadow: 0 0 0 3px rgba(var(--color-danger-rgb),.08); }
  .obs-toggle.on svg { animation: pulse 1.6s infinite; }
  @media (max-width: 1100px) { .control-dock { grid-template-columns: 1fr 1fr; } .session-card { grid-column: span 2; border-top: 1px solid var(--border-subtle); } .session-actions { max-width: 430px; } }
  @media (max-width: 680px) { .control-dock { display: flex; flex-direction: column; } .dock-card, .control-dock > section { border-right: 0 !important; border-bottom: 1px solid var(--border-subtle) !important; } .session-card { border-bottom: 0 !important; } .winner-inline { margin-left: 0; } }
`;
