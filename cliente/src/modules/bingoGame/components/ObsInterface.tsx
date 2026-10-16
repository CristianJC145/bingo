import { useCallback, useEffect, useRef, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { listSponsors, SponsorAsset } from "../../bingoCustomization/services/sponsors.service";
import { getObsBranding, ObsBrandingAsset } from "../../bingoCustomization/services/obsBranding.service";
import { SOUND_API_ORIGIN } from "../../bingoCustomization/services/soundEffects.service";
import ObsBroadcastStage from "./ObsBroadcastStage";
import FigureShowcaseOverlay from "./FigureShowcaseOverlay";
import WinnerRoulette from "./WinnerRoulette";
import type { WinnerRouletteState } from "../services/winnerRoulette.service";
import SlotMachine from "../../slotMachine/components/SlotMachine";
import SlotWinnerModal from "../../slotMachine/components/SlotWinnerModal";
import WinnerCelebration from "../../../shared/components/WinnerCelebration";
import { buildWinnerChips } from "../../../shared/utils/winnerChips";
import { useSlotSpin } from "../../slotMachine/utils/useSlotSpin";
import type { SlotResult } from "../../slotMachine/services/slotMachine.service";
import { playFinalWinnerReveal, playTieAnnouncement, primeRouletteAudio } from "../utils/rouletteAudio";

interface BroadcastWinner {
  id: number;
  pattern: number[][] | string;
  patternFigure: boolean[][];
  nombreCompleto?: string | null;
  municipioLabel?: string | null;
  barrio?: string | null;
  discapacidad?: boolean;
  cuidador?: boolean;
  adultoMayor?: boolean;
}

/** La cuadrícula puede llegar como texto JSON desde el servidor. */
const parseWinnerCard = (pattern: number[][] | string): number[][] | null => {
  try { return (typeof pattern === "string" ? JSON.parse(pattern) : pattern) as number[][]; }
  catch { return null; }
};

/** Casillas de la figura ganadora que ya fueron cantadas, en formato por filas. */
const winnerSelectedCells = (winner: BroadcastWinner, drawnNumbers: number[]): boolean[][] | undefined => {
  const columns = parseWinnerCard(winner.pattern);
  if (!columns) return undefined;
  return columns[0].map((_, rowIndex) => columns.map((column, columnIndex) => {
    if (rowIndex === 2 && columnIndex === 2) return true;
    const number = column[rowIndex];
    return Boolean(number && drawnNumbers.includes(number) && winner.patternFigure?.[rowIndex]?.[columnIndex]);
  }));
};

interface Figure { id: number; name: string; pattern: boolean[][]; }
type ConnectionStatus = "connecting" | "connected" | "disconnected";
type SlotScenePhase = "hidden" | "entering" | "visible" | "leaving";

const previewPattern = [[true,false,false,false,true],[false,false,false,false,false],[false,false,true,false,false],[false,false,false,false,false],[true,false,false,false,true]];
const previewCard = [[1,2,3,4,5],[16,17,18,19,20],[31,32,999,34,35],[46,47,48,49,50],[61,62,63,64,65]];

/** Ganadores de mentira para revisar la celebración en `/obs?preview=bingo`. */
const previewWinners: BroadcastWinner[] = [
  // Caso extremo a propósito: municipio y barrio largos, para comprobar que el marco no se estira.
  { id: 63, pattern: previewCard, patternFigure: previewPattern, nombreCompleto: "Mariano Chindoy", municipioLabel: "Puerto Leguízamo", barrio: "Jardines de Babilonia", discapacidad: true, cuidador: false, adultoMayor: true },
  { id: 400, pattern: previewCard, patternFigure: previewPattern, nombreCompleto: "Luz Jamioy", municipioLabel: "Mocoa", barrio: "El Pepino", discapacidad: false, cuidador: true },
];

const previewSlotResult: SlotResult = {
  municipio: "puerto_leguizamo",
  municipioLabel: "Puerto Leguízamo",
  cardNumber: 2636,
  nombreCompleto: "Participante de prueba",
  sector: "URBANO",
  barrio: "Jardines de Babilonia",
  discapacidad: true,
  cuidador: false,
  adultoMayor: true,
  card: null,
  spunAt: Date.now(),
};

const previewRoulette: WinnerRouletteState = {
  active: true,
  phase: "ready",
  candidates: [
    { cardNumber: 102, nombreCompleto: "Ana Martínez", municipioLabel: "Mocoa" },
    { cardNumber: 217, nombreCompleto: "Carlos Gómez", municipioLabel: "Puerto Asís" },
    { cardNumber: 385, nombreCompleto: "Luz Benavides", municipioLabel: "Villagarzón" },
    { cardNumber: 483, nombreCompleto: "Mario Díaz", municipioLabel: "Orito" },
    { cardNumber: 570, nombreCompleto: "Diana López", municipioLabel: "Sibundoy" },
    { cardNumber: 625, nombreCompleto: "José Rodríguez", municipioLabel: "Colón" },
  ],
  winnerIndex: null,
  spunAt: null,
};

const ObsInterface: React.FC = () => {
  const previewMode = new URLSearchParams(window.location.search).get("preview");
  const isBingoPreview = previewMode === "bingo";
  const isLayoutPreview = previewMode === "show";
  const isSlotPreview = previewMode === "slot";
  const isRoulettePreview = previewMode === "roulette";
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>();
  const [ballots, setBallots] = useState<number[]>(isBingoPreview ? [1,5,61,65] : isLayoutPreview ? [3,8,12,17,23,31,40,48,57,66] : []);
  const [figures, setFigures] = useState<Figure[]>(isBingoPreview || isLayoutPreview ? [{ id: 1, name: "Cuatro esquinas", pattern: previewPattern }] : []);
  const [winnerCards, setWinnerCards] = useState<BroadcastWinner[]>(isBingoPreview ? previewWinners : []);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [sponsors, setSponsors] = useState<SponsorAsset[]>([]);
  const [branding, setBranding] = useState<ObsBrandingAsset | null>(null);
  const [figureIndex, setFigureIndex] = useState(0);
  const [slotScenePhase, setSlotScenePhase] = useState<SlotScenePhase>(isSlotPreview ? "visible" : "hidden");
  const [slotWinnerVisible, setSlotWinnerVisible] = useState(!isSlotPreview);
  /** Límite configurado por el administrador para repetir la partida. */
  const [repeatThreshold, setRepeatThreshold] = useState(7);
  /** Presentación grande de la figura; el servidor decide cuándo y por cuánto tiempo. */
  const [showcase, setShowcase] = useState<{ figures: Figure[]; seconds: number; at: number } | null>(null);
  const hideShowcase = useCallback(() => setShowcase(null), []);
  /** Ruleta de desempate: con varios ganadores el premio se sortea antes de celebrar. */
  const [roulette, setRoulette] = useState<WinnerRouletteState | null>(isRoulettePreview ? previewRoulette : null);
  const [rouletteStale, setRouletteStale] = useState(false);
  const [rouletteDuration, setRouletteDuration] = useState(7200);
  const rouletteFinalPendingRef = useRef(false);
  const slot = useSlotSpin({ withSound: false });
  const showSlotPreview = slot.showRevealed;
  const lastSlotSpinRef = useRef<number | null>(null);
  const slotTransitionRef = useRef<number>();
  // El socket se monta una sola vez; sus controles se leen por referencia para no reconectar en cada render.
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const slotPreviewStarted = useRef(false);
  const slotActive = slotScenePhase !== "hidden";

  const showSlotScene = useCallback(() => {
    window.clearTimeout(slotTransitionRef.current);
    setSlotScenePhase((current) => current === "visible" || current === "entering" ? current : "entering");
    slotTransitionRef.current = window.setTimeout(() => setSlotScenePhase("visible"), 850);
  }, []);

  const hideSlotScene = useCallback(() => {
    window.clearTimeout(slotTransitionRef.current);
    setSlotWinnerVisible(false);
    setSlotScenePhase((current) => current === "hidden" ? current : "leaving");
    slotTransitionRef.current = window.setTimeout(() => {
      setSlotScenePhase("hidden");
      slotRef.current.reset();
      lastSlotSpinRef.current = null;
    }, 700);
  }, []);

  useEffect(() => () => window.clearTimeout(slotTransitionRef.current), []);

  useEffect(() => {
    if (!isSlotPreview || slotPreviewStarted.current) return;
    slotPreviewStarted.current = true;
    showSlotPreview(previewSlotResult);
  }, [isSlotPreview, showSlotPreview]);

  useEffect(() => {
    if (isBingoPreview || isLayoutPreview || isSlotPreview || isRoulettePreview) { setConnection("connected"); return; }
    let mounted = true;
    const connect = () => {
      if (!mounted) return;
      setConnection("connecting");
      const socket = new WebSocket("ws://localhost:3000");
      socketRef.current = socket;
      socket.onopen = () => setConnection("connected");
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "game-reset") { setBallots([]); setFigures([]); setWinnerCards([]); setShowcase(null); setRoulette(null); rouletteFinalPendingRef.current = false; }
          if (data.type === "game-update") {
            setBallots(data.balls ?? []);
            setFigures(data.figures ?? []);
            if (data.winner && data.winningCards?.length) {
              setWinnerCards(data.winningCards);
              if (rouletteFinalPendingRef.current) {
                rouletteFinalPendingRef.current = false;
                playFinalWinnerReveal();
              }
            }
          }
          if (data.type === "figures-update") setFigures(data.figures ?? []);
          if (data.type === "figure-showcase" && data.figures?.length) {
            // `at` fuerza el remonte del overlay aunque se presente la misma figura otra vez.
            setShowcase({ figures: data.figures, seconds: Number(data.seconds) || 6, at: Date.now() });
          }
          if (data.type === "winner-close") setWinnerCards([]);
          if (data.type === "winner-roulette-open" && data.roulette) {
            // Empate: la celebración se aparta hasta que la ruleta decida.
            setWinnerCards([]);
            rouletteFinalPendingRef.current = false;
            primeRouletteAudio();
            setRouletteStale(false);
            setRouletteDuration(Number(data.spinDurationMs) || 7200);
            setRoulette(data.roulette);
          }
          if (data.type === "winner-roulette-spin" && data.roulette) {
            setRouletteStale(false);
            setRouletteDuration(Number(data.spinDurationMs) || 7200);
            setRoulette(data.roulette);
          }
          if (data.type === "winner-roulette-announce") void playTieAnnouncement();
          if (data.type === "winner-roulette-close") {
            setRoulette(null);
            rouletteFinalPendingRef.current = data.resolved === true;
          }
          if (data.type === "settings-update" && data.settings?.winnerRepeatThreshold) {
            setRepeatThreshold(Number(data.settings.winnerRepeatThreshold));
          }
          if (data.type === "slot-open") {
            slotRef.current.reset();
            lastSlotSpinRef.current = null;
            setSlotWinnerVisible(false);
            showSlotScene();
          }
          if (data.type === "slot-winner-close") setSlotWinnerVisible(false);
          if (data.type === "slot-spin" && data.result) {
            showSlotScene();
            setSlotWinnerVisible(data.winnerVisible !== false);
            // Un giro nuevo se anima; uno ya pasado (reconexión) aparece revelado, sin repetir la animación.
            const isStale = lastSlotSpinRef.current === data.result.spunAt
              || Date.now() - data.result.spunAt > slotRef.current.totalDurationMs;
            lastSlotSpinRef.current = data.result.spunAt;
            if (isStale) slotRef.current.showRevealed(data.result);
            else slotRef.current.run(data.result);
          }
          if (data.type === "slot-close") hideSlotScene();
        } catch { /* Ignore malformed external messages. */ }
      };
      socket.onerror = () => setConnection("disconnected");
      socket.onclose = () => { setConnection("disconnected"); if (mounted) reconnectRef.current = window.setTimeout(connect, 3000); };
    };
    connect();
    return () => { mounted = false; window.clearTimeout(reconnectRef.current); socketRef.current?.close(); };
  }, [hideSlotScene, isBingoPreview, isLayoutPreview, isRoulettePreview, isSlotPreview, showSlotScene]);

  useEffect(() => {
    const loadSponsors = () => listSponsors().then(setSponsors).catch(() => undefined);
    loadSponsors();
    const refresh = window.setInterval(loadSponsors, 60000);
    return () => window.clearInterval(refresh);
  }, []);

  useEffect(() => {
    const loadBranding = () => getObsBranding().then(setBranding).catch(() => undefined);
    loadBranding();
    const refresh = window.setInterval(loadBranding, 15000);
    return () => window.clearInterval(refresh);
  }, []);

  // El límite para repetir la partida se consulta al abrir y luego llega por WebSocket.
  useEffect(() => {
    fetch(`${SOUND_API_ORIGIN}/api/game/settings`)
      .then((response) => response.json())
      .then((payload) => {
        const threshold = Number(payload?.data?.winnerRepeatThreshold);
        if (Number.isInteger(threshold) && threshold > 0) setRepeatThreshold(threshold);
      })
      .catch(() => undefined);
  }, []);

  /*
   * Si OBS se abre (o reconecta) con un sorteo en marcha, se recupera su estado. Un
   * giro ya vencido se muestra resuelto: repetir la animación desincronizaría el aire.
   */
  useEffect(() => {
    if (isBingoPreview || isLayoutPreview || isRoulettePreview) return;
    fetch(`${SOUND_API_ORIGIN}/api/game/winner-roulette`)
      .then((response) => response.json())
      .then((payload) => {
        const state = payload?.data as WinnerRouletteState | undefined;
        if (!state?.active) return;
        const duration = Number(state.spinDurationMs) || 7200;
        setRouletteDuration(duration);
        setRouletteStale(state.spunAt !== null && Date.now() - state.spunAt > duration);
        setRoulette(state);
      })
      .catch(() => undefined);
  }, [isBingoPreview, isLayoutPreview, isRoulettePreview]);

  useEffect(() => {
    setFigureIndex((current) => figures.length ? current % figures.length : 0);
    if (figures.length < 2) return;
    const rotation = window.setInterval(() => setFigureIndex((current) => (current + 1) % figures.length), 6500);
    return () => window.clearInterval(rotation);
  }, [figures.length]);

  // Se muestran hasta tres cartones; el overlay solo se cierra cuando el administrador lo indica.
  const celebrationWinners = winnerCards.slice(0, 3).map((winner) => ({
    cardNumber: winner.id,
    card: parseWinnerCard(winner.pattern),
    selected: winnerSelectedCells(winner, ballots),
    name: winner.nombreCompleto,
    chips: buildWinnerChips(winner),
  }));

  const showSetupGuide = new URLSearchParams(window.location.search).has("setup");

  return <ObsInterfaceStyle>
    <ObsGlobalStyle />
    <main className="broadcast-canvas broadcast-canvas-v2">
      <ObsBroadcastStage
        ballots={ballots}
        figures={figures}
        figureIndex={figureIndex}
        sponsors={sponsors}
        branding={branding}
        connection={connection}
        showSetupGuide={showSetupGuide}
        slotPhase={slotScenePhase === "hidden" ? undefined : slotScenePhase}
        slotContent={slotActive ? <SlotMachine
          phase={slot.phase}
          reelMunicipio={slot.reelMunicipio}
          reelCard={slot.reelCard}
          municipioSettled={slot.municipioSettled}
          cardSettled={slot.cardSettled}
          result={slot.result}
        /> : undefined}
      />

      {/* La celebración usa todo el ancho a la derecha de la cámara y los patrocinadores. */}
      {slotActive && slotWinnerVisible && slot.showWinner && slot.result && (
        <div className="slot-winner-layer"><SlotWinnerModal result={slot.result} /></div>
      )}

      {/* Ganador de bingo: ocupa toda la pantalla y solo se cierra cuando el administrador lo indica. */}
      {celebrationWinners.length > 0 && (
        <div className="bingo-winner-layer">
          <WinnerCelebration
            eyebrow="Cartón ganador"
            winners={celebrationWinners}
            extraCardNumbers={winnerCards.slice(3).map((winner) => winner.id)}
            totalWinners={winnerCards.length}
            repeatThreshold={repeatThreshold}
            fullscreen
            footerText="¡Bingo!"
          />
        </div>
      )}

      {/* Presentación de la figura: se cierra sola al agotarse el tiempo configurado. */}
      {showcase && (
        <FigureShowcaseOverlay key={showcase.at} figures={showcase.figures} seconds={showcase.seconds} onDone={hideShowcase} />
      )}

      {/* Ruleta de desempate: se superpone a todo mientras se sortea el ganador único. */}
      {roulette?.active && roulette.candidates.length > 1 && (
        <WinnerRoulette
          candidates={roulette.candidates}
          winnerIndex={roulette.winnerIndex}
          spunAt={roulette.spunAt}
          durationMs={rouletteDuration}
          startResolved={rouletteStale}
        />
      )}
    </main>
  </ObsInterfaceStyle>;
};

export default ObsInterface;

const ObsGlobalStyle = createGlobalStyle`html,body,#root{width:100%;min-width:100%;height:100%;min-height:100%;overflow:hidden;background:transparent!important}`;

const ObsInterfaceStyle = styled.div`
  width:100vw;height:100vh;overflow:hidden;color:#fff;font-family:"Poppins",sans-serif;
  .broadcast-canvas{position:relative;display:grid;width:100%;height:100%;grid-template-rows:58px minmax(0,1fr) minmax(235px,25vh);gap:12px;padding:clamp(12px,1.15vw,22px);background:radial-gradient(circle at 12% 15%,rgba(255,79,163,.12),transparent 24%),radial-gradient(circle at 88% 34%,rgba(38,216,208,.1),transparent 25%),radial-gradient(circle at 55% 8%,rgba(124,92,255,.16),transparent 30%)}
  .broadcast-canvas::before{position:absolute;inset:0;z-index:-1;content:"";background-image:radial-gradient(circle,rgba(255,222,104,.28) 0 2px,transparent 2.5px),radial-gradient(circle,rgba(255,102,178,.2) 0 1.5px,transparent 2px);background-position:3% 12%,96% 18%;background-size:92px 92px,68px 68px;opacity:.55;pointer-events:none}
  .broadcast-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 .85rem;background:linear-gradient(100deg,rgba(92,43,207,.97),rgba(204,51,146,.95) 52%,rgba(19,167,169,.95));border:1px solid rgba(255,255,255,.28);border-radius:17px;box-shadow:0 14px 36px rgba(63,17,122,.28),inset 0 1px rgba(255,255,255,.18)}
  .brand-lockup{display:flex;align-items:center;gap:.65rem}.brand-mark{display:grid;width:36px;height:36px;place-items:center;color:#3c205b;background:linear-gradient(145deg,#fff3a8,#ffbc3f);border:2px solid rgba(255,255,255,.7);border-radius:12px;font-size:.85rem;font-weight:800;box-shadow:0 7px 20px rgba(74,21,114,.25)}.brand-lockup>div{display:flex;flex-direction:column;line-height:1}.brand-lockup strong{font-size:.72rem;letter-spacing:.18em}.brand-lockup small{margin-top:.25rem;color:#fff0bc;font-size:.4rem;letter-spacing:.13em}
  .live-title{display:flex;align-items:center;gap:.6rem;color:#fff;font-size:.62rem;font-weight:800;letter-spacing:.16em;text-shadow:0 2px 10px rgba(49,11,85,.25)}.live-title i{width:8px;height:8px;background:#fff16e;border-radius:50%;box-shadow:0 0 0 5px rgba(255,241,110,.17);animation:live-pulse 1.8s infinite}.connection{display:flex;justify-self:end;align-items:center;gap:.4rem;color:#fff;font-size:.52rem;font-weight:700}.connection>span{width:7px;height:7px;background:#ffda65;border:2px solid rgba(255,255,255,.55);border-radius:50%}.connection.connected>span{background:#6dffdd}.connection.disconnected>span{background:#ff7b8e}
  .broadcast-grid{display:grid;min-height:0;grid-template-columns:minmax(330px,.78fr) minmax(570px,1.28fr) minmax(320px,.72fr);gap:12px}
  .camera-card,.machine-card,.sponsor-card,.figure-card,.board-panel{overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,.045),transparent 62%),rgba(16,15,36,.97);border:1px solid rgba(255,255,255,.14);border-radius:22px;box-shadow:0 20px 52px rgba(22,8,57,.34)}
  .camera-card{position:relative;width:100%;aspect-ratio:1;align-self:center;background:linear-gradient(135deg,rgba(89,45,187,.2),rgba(255,79,163,.035));border:2px solid rgba(255,91,177,.48);box-shadow:inset 0 0 60px rgba(10,14,20,.15),0 0 30px rgba(255,79,163,.08)}.camera-card::before{position:absolute;inset:12px;content:"";border:1px dashed rgba(255,227,116,.18);border-radius:15px}.camera-label{position:absolute;top:18px;left:20px;display:flex;align-items:center;gap:.4rem;padding:.45rem .6rem;color:#fff;background:linear-gradient(110deg,rgba(126,54,229,.85),rgba(229,60,149,.78));border:1px solid rgba(255,255,255,.22);border-radius:10px;font-size:.48rem;font-weight:800;letter-spacing:.09em;backdrop-filter:blur(10px)}.camera-label i{width:7px;height:7px;background:#fff36c;border-radius:50%;box-shadow:0 0 8px #fff36c}.camera-guide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;color:rgba(255,255,255,.22)}.camera-guide>svg{font-size:1.5rem}.camera-guide span{margin-top:.6rem;font-size:.72rem;font-weight:700;letter-spacing:.13em}.camera-guide small{margin-top:.25rem;font-size:.46rem}.corner{position:absolute;width:30px;height:30px;border-color:rgba(109,255,225,.78);border-style:solid}.top-left{top:12px;left:12px;border-width:2px 0 0 2px;border-radius:9px 0 0}.top-right{top:12px;right:12px;border-width:2px 2px 0 0;border-radius:0 9px 0 0}.bottom-left{bottom:12px;left:12px;border-width:0 0 2px 2px;border-radius:0 0 0 9px}.bottom-right{right:12px;bottom:12px;border-width:0 2px 2px 0;border-radius:0 0 9px}.camera-lower{position:absolute;right:20px;bottom:20px;left:20px;display:flex;align-items:center;justify-content:space-between;padding:.65rem .75rem;background:linear-gradient(90deg,rgba(100,48,211,.84),rgba(225,57,149,.8));border:1px solid rgba(255,255,255,.18);border-radius:11px;backdrop-filter:blur(10px)}.camera-lower span{color:#fff188;font-size:.45rem;font-weight:800;letter-spacing:.12em}.camera-lower strong{font-size:.56rem}
  .machine-card{position:relative;display:grid;min-height:0;place-items:center;overflow:visible;padding:0 .35rem;background:radial-gradient(ellipse at 48% 50%,rgba(91,65,170,.14),transparent 67%);border:0;border-radius:0;box-shadow:none}
  .visual-rail{display:grid;min-height:0;grid-template-rows:124px minmax(0,1.08fr) minmax(0,.92fr);gap:10px}.current-ball-card{position:relative;display:grid;overflow:visible;place-items:center;background:transparent;border:0;box-shadow:none}.current-ball-card::before{position:absolute;width:170px;height:90px;content:"";background:radial-gradient(ellipse,rgba(255,199,64,.24),rgba(255,88,171,.1) 45%,transparent 72%);filter:blur(7px)}.current-orbit{position:relative;display:flex;width:190px;height:116px;align-items:center;justify-content:center}.current-orbit>i{position:absolute;width:142px;height:72px;border:1px solid rgba(255,219,111,.25);border-radius:50%;transform:rotate(12deg)}.current-orbit>i:last-child{width:164px;height:87px;border-color:rgba(95,239,221,.18);transform:rotate(-13deg)}.current-orbit>strong{position:relative;z-index:2;display:grid;width:108px;height:108px;place-items:center;color:#352343;background:radial-gradient(circle at 34% 24%,#fff 0 7%,#fff2a9 17%,#ffce55 49%,#f28b35 76%,#b84d35);border:5px solid rgba(255,255,255,.92);border-radius:50%;box-shadow:0 0 0 6px rgba(255,199,69,.13),0 16px 34px rgba(255,129,47,.35)}.current-orbit>strong small{position:absolute;top:15px;font-size:.6rem;line-height:1}.current-orbit>strong b{margin-top:13px;font-size:2.2rem;line-height:1}.current-ball-card.has-ball .current-orbit>strong{animation:spotlight-arrival .85s cubic-bezier(.2,.8,.2,1)}
  .sponsor-card,.figure-card{display:grid;min-height:0;grid-template-rows:auto 1fr auto;padding:.75rem}.sponsor-card{background:radial-gradient(circle at 92% 8%,rgba(255,216,82,.17),transparent 24%),linear-gradient(145deg,#221442,#11162d);border-color:rgba(255,203,77,.32)}.figure-card{grid-template-rows:1fr auto;padding:.5rem;background:radial-gradient(circle at 20% 50%,rgba(120,75,255,.2),transparent 40%),radial-gradient(circle at 86% 55%,rgba(38,216,208,.12),transparent 38%),linear-gradient(145deg,#191442,#0e1830);border-color:rgba(144,105,255,.34)}.module-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.55rem}.module-heading>div{display:flex;min-width:0;flex-direction:column}.module-heading>div span{color:#70f4df;font-size:.46rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.module-heading>div strong{margin-top:.18rem;overflow:hidden;font-size:.68rem;text-overflow:ellipsis;white-space:nowrap}.module-heading>small{padding:.25rem .35rem;color:#ffe27a;background:rgba(255,79,163,.16);border:1px solid rgba(255,255,255,.08);border-radius:6px;font-size:.42rem}
  .sponsor-showcase{display:grid;min-height:0;overflow:hidden;place-items:center;background:radial-gradient(circle at 50% 50%,rgba(255,192,73,.11),transparent 70%),rgba(0,0,0,.18);border:1px solid rgba(255,220,111,.12);border-radius:14px;animation:content-in .4s ease}.sponsor-showcase img,.sponsor-showcase video{width:100%;height:100%;object-fit:contain}.sponsor-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;color:#7f7194}.sponsor-placeholder>span{display:grid;width:48px;height:48px;place-items:center;color:#ffe16b;background:linear-gradient(145deg,rgba(255,79,163,.24),rgba(108,60,255,.25));border-radius:15px}.sponsor-placeholder strong{margin-top:.65rem;color:#ded6e9;font-size:.72rem;letter-spacing:.08em}.sponsor-placeholder small{margin-top:.25rem;font-size:.45rem}.sponsor-progress,.figure-pages{display:flex;justify-content:center;gap:4px;margin-top:.5rem}.sponsor-progress i,.figure-pages i{width:18px;height:3px;background:#3b3455;border-radius:9px}.sponsor-progress i.active,.figure-pages i.active{background:linear-gradient(90deg,#ff54aa,#ffdb5e);box-shadow:0 0 8px rgba(255,84,170,.45)}
  .figure-showcase{position:relative;display:grid;min-height:0;grid-template-columns:minmax(155px,.92fr) 1fr;align-items:center;gap:1rem;overflow:hidden;padding:.55rem 1rem;background:linear-gradient(135deg,rgba(255,255,255,.025),transparent);border:1px solid rgba(255,255,255,.075);border-radius:17px;animation:content-in .35s ease}.figure-showcase::before{position:absolute;top:50%;left:24%;width:190px;height:190px;content:"";transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(141,92,255,.19),transparent 68%);border:1px solid rgba(141,106,255,.08);border-radius:50%}.pattern-halo{position:relative;display:grid;width:min(17vh,168px);aspect-ratio:1;place-items:center;justify-self:center;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(91,48,188,.12));border:1px solid rgba(194,171,255,.22);border-radius:24px;box-shadow:0 18px 34px rgba(5,8,24,.26),inset 0 1px rgba(255,255,255,.08)}.large-pattern{display:grid;width:82%;grid-template-columns:repeat(5,1fr);gap:5px}.large-pattern>span{display:grid;aspect-ratio:1;place-items:center;background:rgba(38,49,68,.9);border:1px solid rgba(117,136,161,.26);border-radius:7px}.large-pattern>span.active{background:linear-gradient(145deg,#bc7aff,#7454ed);border-color:#e0c2ff;box-shadow:0 5px 14px rgba(129,66,222,.35),inset 0 1px rgba(255,255,255,.32)}.large-pattern>span.free{color:#ffdf6e;background:rgba(255,184,77,.12);border-color:rgba(255,216,106,.45)}.large-pattern svg{font-size:.48rem}.large-pattern i{width:7px;height:7px;background:#fff;border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.16),0 0 11px rgba(255,255,255,.4)}.figure-name{position:relative;max-width:170px;color:#fff;font-size:clamp(.85rem,1.2vw,1.25rem);line-height:1.18;text-shadow:0 7px 20px rgba(0,0,0,.35)}.figure-name::after{display:block;width:42px;height:4px;margin-top:.65rem;content:"";background:linear-gradient(90deg,#ffcf59,#ff59ae);border-radius:8px;box-shadow:0 0 10px rgba(255,89,174,.3)}.figure-count{position:absolute;top:.6rem;right:.65rem;padding:.25rem .4rem;color:#fff2ad;background:rgba(255,79,163,.14);border:1px solid rgba(255,255,255,.09);border-radius:7px;font-size:.42rem}.figure-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;color:#807696;text-align:center}.figure-empty>span{display:grid;width:52px;height:52px;place-items:center;color:#a993ff;background:rgba(124,92,255,.1);border-radius:16px}.figure-empty strong{margin-top:.55rem;color:#c5bdcf;font-size:.68rem}
  .board-panel{display:grid;min-height:0;grid-template-columns:150px 1fr;gap:.7rem;padding:.72rem;background:radial-gradient(circle at 3% 50%,rgba(255,75,166,.13),transparent 20%),linear-gradient(120deg,#18143c,#10152b);border-color:rgba(137,93,255,.28)}.board-summary{display:flex;justify-content:space-between;flex-direction:column;padding:.62rem;background:linear-gradient(145deg,rgba(112,56,218,.32),rgba(255,79,163,.12));border:1px solid rgba(255,255,255,.11);border-radius:13px}.board-summary>div:first-child{display:flex;flex-direction:column}.board-summary>div:first-child span{color:#ffe06d;font-size:.44rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.board-summary>div:first-child strong{margin-top:.25rem;font-size:.72rem}.board-progress>span{display:block;height:6px;overflow:hidden;background:#2b2549;border-radius:9px}.board-progress>span i{display:block;height:100%;background:linear-gradient(90deg,#ff4fa3,#ffca52,#4bddc9);border-radius:inherit}.board-progress>strong{display:block;margin-top:.4rem;color:#fff;font-size:1.3rem}.board-progress>strong small{color:#9188ac;font-size:.52rem}.ball-board{display:grid;min-width:0;grid-template-rows:repeat(5,1fr);gap:.25rem}.board-row{display:grid;min-height:0;grid-template-columns:38px repeat(15,minmax(0,1fr));gap:.23rem}.letter-badge,.board-ball{display:grid;min-width:0;place-items:center;border-radius:8px;font-weight:700}.letter-badge{color:#fff;background:linear-gradient(145deg,rgba(var(--row-color),.95),rgba(94,48,204,.92));border:1px solid rgba(255,255,255,.26);box-shadow:inset 0 1px rgba(255,255,255,.2),0 5px 12px rgba(28,10,70,.2);font-size:.8rem}.board-ball{color:#827b9c;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.065);font-size:clamp(.64rem,.88vw,.9rem)}.board-ball.drawn{color:#fff;background:linear-gradient(145deg,rgba(var(--row-color),.96),rgba(112,54,218,.92));border-color:rgba(var(--row-color),.72);box-shadow:inset 0 1px rgba(255,255,255,.22),0 4px 11px rgba(var(--row-color),.14)}.board-ball.latest{color:#3e2044;background:linear-gradient(145deg,#fff4a3,#ffae3e);border-color:#fff0a2;box-shadow:0 0 0 3px rgba(255,184,77,.16),0 5px 16px rgba(255,184,77,.28);animation:latest-pop .7s ease}
  @keyframes live-pulse{50%{box-shadow:0 0 0 9px rgba(255,241,110,0)}}@keyframes content-in{from{opacity:0;transform:translateY(5px)}}@keyframes latest-pop{50%{transform:scale(1.14)}}@keyframes spotlight-arrival{0%{opacity:.4;transform:scale(.55) rotate(-18deg)}55%{transform:scale(1.1) rotate(4deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  @media(max-aspect-ratio:4/3){.broadcast-grid{grid-template-columns:minmax(280px,.72fr) minmax(480px,1.28fr) minmax(280px,.7fr)}.broadcast-canvas{grid-template-rows:54px minmax(0,1fr) 225px}.figure-showcase{grid-template-columns:130px 1fr}.pattern-halo{width:130px}}

  /* Escena televisiva con lenguaje pixel-art. */
  .broadcast-canvas{position:relative;display:block;width:100%;height:100%;padding:clamp(12px,1.1vw,21px);background:radial-gradient(circle at 7% 6%,rgba(255,69,174,.18),transparent 28%),radial-gradient(circle at 94% 84%,rgba(39,232,218,.15),transparent 27%),linear-gradient(135deg,rgba(42,8,92,.72),rgba(12,11,49,.58) 48%,rgba(24,8,67,.7));isolation:isolate}
  .broadcast-canvas::before{position:absolute;inset:0;z-index:-2;content:"";background-image:linear-gradient(90deg,rgba(255,255,255,.035) 2px,transparent 2px),linear-gradient(rgba(255,255,255,.035) 2px,transparent 2px),linear-gradient(90deg,transparent 31px,rgba(255,89,176,.09) 32px,transparent 33px),linear-gradient(transparent 31px,rgba(75,235,221,.07) 32px,transparent 33px);background-size:32px 32px,32px 32px,96px 96px,96px 96px;image-rendering:pixelated;opacity:.78}
  .broadcast-canvas::after{position:absolute;right:0;bottom:0;left:0;z-index:-1;height:18%;content:"";background:linear-gradient(135deg,transparent 16px,rgba(115,40,178,.26) 0) 0 0/64px 64px,linear-gradient(225deg,transparent 16px,rgba(239,56,153,.12) 0) 32px 0/64px 64px;clip-path:polygon(0 38%,5% 38%,5% 20%,10% 20%,10% 48%,16% 48%,16% 27%,22% 27%,22% 61%,28% 61%,28% 15%,34% 15%,34% 51%,41% 51%,41% 31%,47% 31%,47% 68%,54% 68%,54% 22%,60% 22%,60% 54%,67% 54%,67% 35%,74% 35%,74% 64%,81% 64%,81% 17%,88% 17%,88% 47%,94% 47%,94% 28%,100% 28%,100% 100%,0 100%);opacity:.55}
  .pixel-sky{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}.pixel-sky i{position:absolute;width:7px;height:7px;background:#ffd75d;box-shadow:12px 0 #ffd75d,0 12px #ffd75d,12px 12px rgba(255,215,93,.35);animation:pixel-twinkle 3.2s steps(2) infinite}.pixel-sky i:nth-child(1){top:7%;left:22%}.pixel-sky i:nth-child(2){top:15%;left:73%;background:#53e9dc;box-shadow:10px 0 #53e9dc,0 10px rgba(83,233,220,.35)}.pixel-sky i:nth-child(3){top:54%;left:3%;animation-delay:.7s}.pixel-sky i:nth-child(4){top:88%;left:48%;background:#ff63b1;box-shadow:10px 0 #ff63b1,0 10px rgba(255,99,177,.35);animation-delay:1.2s}.pixel-sky i:nth-child(5){top:45%;right:2%;animation-delay:1.8s}
  .broadcast-stage{display:grid;width:100%;height:100%;min-height:0;grid-template-columns:minmax(0,36%) minmax(0,15%) minmax(0,36%) minmax(105px,9%);gap:clamp(15px,1.2vw,19px)}
  /* Con el sorteo activo se ocultan el tablero de numeración y la balotera; la máquina ocupa su lugar.
     La cámara y los patrocinadores (columna 1) y la columna de figura quedan intactos. */
  .broadcast-stage.slot-live .board-panel,
  .broadcast-stage.slot-live .tower-column{display:none}
  .slot-overlay{position:relative;z-index:30;display:grid;grid-column:3 / -1;grid-row:1;min-height:0;place-items:center;padding:3rem;background:radial-gradient(circle at 50% 40%,rgba(26,11,58,.92),rgba(7,5,18,.97));border:1px solid rgba(255,207,92,.32);border-radius:22px;box-shadow:0 0 70px rgba(0,0,0,.6),inset 0 0 70px rgba(124,92,255,.1);animation:slot-in .45s cubic-bezier(.2,.85,.25,1)}
  .slot-overlay>div:first-child{width:100%;height:100%;min-height:0}
  @keyframes slot-in{from{opacity:0;transform:scale(.94)}}
  /* Capa del ganador del sorteo: arranca donde termina la columna de cámara/patrocinadores. */
  .slot-winner-layer{position:absolute;z-index:45;top:0;right:0;bottom:0;left:26.8%}
  /* El bingo sí toma la pantalla completa: con tres cartones el área lateral queda corta. */
  .bingo-winner-layer{position:fixed;inset:0;z-index:60}
  .bingo-winner-layer>div{border-radius:0}
  .left-column{display:grid;min-height:0;grid-template-rows:auto minmax(0,1fr);gap:clamp(8px,.72vw,14px)}
  .camera-card,.sponsor-card,.figure-card,.current-ball-card,.board-panel{clip-path:polygon(12px 0,calc(100% - 12px) 0,calc(100% - 12px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 12px,100% 12px,100% calc(100% - 12px),calc(100% - 4px) calc(100% - 12px),calc(100% - 4px) calc(100% - 4px),calc(100% - 12px) calc(100% - 4px),calc(100% - 12px) 100%,12px 100%,12px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 12px),0 calc(100% - 12px),0 12px,4px 12px,4px 4px,12px 4px);border-radius:0}
  .camera-card{position:relative;width:100%;aspect-ratio:1;align-self:start;overflow:hidden;background:linear-gradient(145deg,rgba(76,29,135,.18),rgba(8,11,36,.04));border:4px solid #ffbd42;box-shadow:inset 0 0 0 4px rgba(255,245,167,.34),inset 0 0 50px rgba(92,23,138,.18),0 18px 38px rgba(16,3,49,.34)}.camera-card::before{position:absolute;inset:9px;content:"";border:2px solid rgba(73,239,219,.62);border-radius:0;clip-path:inherit}.camera-card::after{position:absolute;right:16px;bottom:16px;width:18px;height:18px;content:"";background:#ffca4e;box-shadow:-18px 0 #ffca4e,0 -18px #ffca4e;opacity:.55}
  .broadcast-brand{position:absolute;top:17px;left:18px;z-index:3;display:flex;align-items:center;gap:.55rem;padding:.45rem .65rem;color:#fff;background:linear-gradient(90deg,rgba(92,30,192,.92),rgba(221,48,146,.9));border:2px solid rgba(255,238,139,.75);box-shadow:4px 4px 0 rgba(37,11,76,.48)}.brand-mark{display:grid;width:34px;height:34px;place-items:center;color:#51205c;background:#ffd35a;border:2px solid #fff4a1;border-radius:0;font-size:.82rem;font-weight:900}.broadcast-brand>div{display:flex;flex-direction:column;line-height:1}.broadcast-brand strong{font-size:.66rem;letter-spacing:.16em}.broadcast-brand small{margin-top:.23rem;color:#fff0a9;font-size:.34rem;letter-spacing:.11em}
  .camera-label{position:absolute;top:18px;right:18px;left:auto;display:flex;align-items:center;gap:.4rem;padding:.42rem .62rem;color:#fff;background:rgba(19,10,52,.82);border:2px solid rgba(255,255,255,.2);border-radius:0;box-shadow:4px 4px 0 rgba(29,9,65,.42);font-size:.44rem;font-weight:800;letter-spacing:.1em}.camera-label i{width:8px;height:8px;background:#ff4e7e;border-radius:0;box-shadow:0 0 0 3px rgba(255,78,126,.15);animation:live-pulse 1.7s infinite}.connection{position:absolute;right:18px;bottom:18px;display:flex;align-items:center;gap:.4rem;padding:.4rem .55rem;color:#fff;background:rgba(18,10,49,.82);border:1px solid rgba(255,255,255,.14);font-size:.4rem;font-weight:700;letter-spacing:.08em}.connection>span{width:7px;height:7px;background:#ffbd42;border-radius:0}.connection.connected>span{background:#57ead7}.connection.disconnected>span{background:#ff547b}.camera-guide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;color:rgba(255,255,255,.22)}.camera-guide>svg{font-size:1.6rem}.camera-guide span{margin-top:.55rem;font-size:.7rem;font-weight:800;letter-spacing:.12em}.camera-guide small{margin-top:.25rem;font-size:.43rem}.corner{display:none}
  .sponsor-card{display:grid;min-height:0;grid-template-rows:auto 1fr auto;padding:.7rem;background:linear-gradient(135deg,rgba(43,17,91,.96),rgba(14,17,52,.96));border:3px solid #7654df;box-shadow:inset 0 0 0 2px rgba(90,238,220,.14),0 15px 30px rgba(16,3,49,.3)}.module-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.5rem}.module-heading>div{display:flex;min-width:0;flex-direction:column}.module-heading>div span{color:#ffe06a;font-size:.43rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.module-heading>div strong{margin-top:.16rem;overflow:hidden;font-size:.65rem;text-overflow:ellipsis;white-space:nowrap}.module-heading>small{padding:.24rem .34rem;color:#fff1a1;background:#bd3d8c;border:2px solid #f787c6;border-radius:0;font-size:.4rem}.sponsor-showcase{display:grid;min-height:0;overflow:hidden;place-items:center;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(92,41,159,.08)),#111335;border:2px solid rgba(255,255,255,.12);border-radius:0;animation:content-in .4s ease}.sponsor-showcase img,.sponsor-showcase video{width:100%;height:100%;object-fit:contain}.sponsor-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;color:#807296}.sponsor-placeholder>span{display:grid;width:50px;height:50px;place-items:center;color:#ffd85a;background:#40236d;border:2px solid #7654df;border-radius:0;box-shadow:6px 6px 0 rgba(12,7,38,.45)}.sponsor-placeholder strong{margin-top:.62rem;color:#dcd3e8;font-size:.7rem;letter-spacing:.08em}.sponsor-placeholder small{margin-top:.22rem;font-size:.42rem}.sponsor-progress{display:flex;justify-content:center;gap:5px;margin-top:.45rem}.sponsor-progress i{width:22px;height:4px;background:#392d5b;border-radius:0}.sponsor-progress i.active{background:#ffce4d;box-shadow:0 0 8px rgba(255,206,77,.45)}
  .game-column{display:grid;min-height:0;grid-template-rows:minmax(0,58%) minmax(0,42%);gap:clamp(8px,.72vw,14px)}
  .pixel-caption{position:absolute;top:10px;left:10px;z-index:4;padding:.35rem .48rem;color:#38204b;background:#ffd75b;border:2px solid #fff2a2;box-shadow:4px 4px 0 #5c2c85;font-size:.43rem;font-weight:900;letter-spacing:.1em}
  .figure-card{position:relative;display:grid;min-height:0;place-items:center;padding:3rem .65rem .75rem;background:radial-gradient(circle at 50% 45%,rgba(124,78,238,.27),transparent 48%),linear-gradient(165deg,#221157,#101644);border:3px solid #56dacd;box-shadow:inset 0 0 0 2px rgba(255,255,255,.07),0 15px 30px rgba(16,3,49,.3)}.figure-showcase{position:relative;display:flex;width:100%;height:100%;min-height:0;align-items:center;justify-content:center;flex-direction:column;gap:1.1rem;overflow:hidden;padding:.5rem;background:transparent;border:0;border-radius:0}.figure-showcase::before{position:absolute;top:45%;left:50%;width:min(29vh,260px);height:min(29vh,260px);content:"";transform:translate(-50%,-50%);background:repeating-conic-gradient(rgba(255,255,255,.07) 0 7.5deg,transparent 7.5deg 15deg);border:0;border-radius:50%;animation:pixel-spin 20s steps(24) infinite}.pattern-halo{position:relative;display:grid;width:min(23vh,220px);aspect-ratio:1;place-items:center;background:linear-gradient(145deg,#341c77,#15163e);border:3px solid #a98cff;border-radius:0;box-shadow:8px 8px 0 rgba(9,8,38,.45),inset 0 0 0 3px rgba(255,255,255,.05)}.large-pattern{display:grid;width:84%;grid-template-columns:repeat(5,1fr);gap:5px}.large-pattern>span{display:grid;aspect-ratio:1;place-items:center;background:#232c44;border:2px solid #3b4962;border-radius:0}.large-pattern>span.active{background:linear-gradient(145deg,#d16fff,#6c4eff);border-color:#f2c7ff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),0 0 10px rgba(198,91,255,.3)}.large-pattern>span.free{color:#ffda58;background:#4c2866;border-color:#a863a6}.large-pattern svg{font-size:.48rem}.large-pattern i{width:8px;height:8px;background:#fff171;box-shadow:0 0 0 3px rgba(255,255,255,.16)}.figure-name{position:relative;max-width:100%;color:#fff;font-size:clamp(.78rem,1vw,1rem);line-height:1.2;text-align:center;text-shadow:3px 3px 0 rgba(33,12,69,.7)}.figure-name::after,.figure-count{display:none}.figure-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;color:#8c7da5;text-align:center}.figure-empty>span{display:grid;width:54px;height:54px;place-items:center;color:#baa6ff;background:#302260;border:2px solid #7355c7;border-radius:0}.figure-empty strong{margin-top:.55rem;color:#d3c8e0;font-size:.66rem}
  .current-ball-card{position:relative;display:grid;min-height:0;place-items:center;padding:2rem .4rem .35rem;overflow:hidden;background:radial-gradient(circle at 50% 58%,rgba(255,189,54,.28),transparent 44%),linear-gradient(145deg,#42165f,#1a1748);border:3px solid #ffbd3e;box-shadow:inset 0 0 0 2px rgba(255,245,165,.14),0 15px 30px rgba(16,3,49,.3)}.current-ball-card::before{position:absolute;width:190px;height:190px;content:"";background:repeating-conic-gradient(rgba(255,223,96,.15) 0 9deg,transparent 9deg 18deg);border-radius:50%;filter:none;animation:pixel-spin 16s steps(20) infinite}.current-orbit{position:relative;display:flex;width:180px;height:180px;align-items:center;justify-content:center}.current-orbit>i{position:absolute;width:145px;height:145px;border:3px dashed rgba(255,232,128,.35);border-radius:0;transform:rotate(45deg)}.current-orbit>i:last-child{width:118px;height:118px;border-color:rgba(83,238,219,.24);transform:rotate(22deg)}.current-orbit>strong{position:relative;z-index:2;display:grid;width:112px;height:112px;place-items:center;color:#48214d;background:radial-gradient(circle at 34% 24%,#fff 0 7%,#fff0a0 18%,#ffcb47 52%,#ed7141 78%);border:5px solid #fff3b1;border-radius:50%;box-shadow:0 0 0 5px #9b4c36,7px 7px 0 rgba(23,8,48,.45)}.current-orbit>strong small{position:absolute;top:16px;font-size:.58rem;line-height:1}.current-orbit>strong b{margin-top:13px;font-size:2.25rem;line-height:1}.current-ball-card.has-ball .current-orbit>strong{animation:spotlight-arrival .85s steps(7)}
  .board-panel{position:relative;display:grid;min-height:0;grid-template-columns:1fr;grid-template-rows:70px minmax(0,1fr) 48px;gap:8px;padding:13px;background:linear-gradient(160deg,#fff7d0,#d9d6d2 50%,#aaa9af);border:5px solid #ffc842;box-shadow:inset 0 0 0 4px #71341b,inset 0 0 0 7px #fff0a1,10px 10px 0 rgba(34,8,62,.55),0 20px 40px rgba(17,3,45,.35)}.board-panel::before{position:absolute;inset:8px;content:"";border:2px solid rgba(91,48,27,.42);pointer-events:none}.board-marquee{position:relative;z-index:2;display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.board-marquee span{display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#ff425e,#bd1455);border:3px solid #fff6c5;box-shadow:inset 0 -6px rgba(99,12,54,.27),4px 4px 0 #6e263d;font-size:clamp(1.45rem,2.5vw,2.5rem);font-weight:900;line-height:1;text-shadow:3px 3px 0 #791f50}.board-marquee span:nth-child(2){background:linear-gradient(145deg,#ff9e42,#da3f55)}.board-marquee span:nth-child(3){background:linear-gradient(145deg,#ffd24b,#e56938)}.board-marquee span:nth-child(4){background:linear-gradient(145deg,#e765e8,#913ad1)}.board-marquee span:nth-child(5){background:linear-gradient(145deg,#5de1d0,#208bb4)}
  .vertical-board{position:relative;z-index:2;display:grid;min-height:0;grid-template-columns:repeat(5,1fr);gap:5px;padding:4px;background:#817d84;border:3px solid #4f4b53}.board-column{display:grid;min-height:0;grid-template-rows:repeat(15,1fr);gap:3px}.board-ball{display:grid;min-width:0;min-height:0;place-items:center;color:#8b8890;background:linear-gradient(145deg,#f5f3ec,#d9d8d5);border:1px solid #b6b4b1;border-radius:0;font-size:clamp(.55rem,.78vw,.82rem);font-weight:800}.board-ball.drawn{color:#fff;background:linear-gradient(145deg,rgba(var(--row-color),.98),#d92d69);border:2px solid #fff1a3;box-shadow:inset 0 -4px rgba(70,16,84,.2),2px 2px 0 rgba(72,31,42,.32);text-shadow:1px 1px 0 rgba(42,11,58,.55)}.board-ball.latest{color:#532141;background:#ffe05c;border:3px solid #fff7bf;box-shadow:0 0 0 3px #f07a3b,0 0 16px rgba(255,186,58,.65);animation:latest-pop .7s steps(5)}.board-counter{position:relative;z-index:2;display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:.25rem;padding:0 .55rem;color:#fff;background:#411866;border:3px solid #7f55c1;box-shadow:inset 0 0 0 2px rgba(255,255,255,.07)}.board-counter strong{font-size:1.18rem}.board-counter span{color:#b9a9cb;font-size:.48rem}.board-counter>i{height:7px;overflow:hidden;margin-left:.4rem;background:#28113e}.board-counter>i b{display:block;height:100%;background:linear-gradient(90deg,#ff4f9d,#ffd356,#43e0d0)}
  .tower-column{position:relative;min-height:0;padding:8px 0 4px}.tower-column::before{position:absolute;top:14%;right:10%;bottom:10%;left:10%;z-index:-1;content:"";background:radial-gradient(ellipse,rgba(255,189,54,.16),transparent 68%)}
  @keyframes pixel-twinkle{50%{opacity:.25;transform:translate(4px,4px)}}@keyframes pixel-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
  .current-ball-card::before{transform:translate(0,0)}.current-ball-card::before{animation:pixel-spin-card 16s steps(20) infinite}@keyframes pixel-spin-card{to{transform:rotate(360deg)}}
  @media(max-aspect-ratio:4/3){.broadcast-stage{grid-template-columns:minmax(0,34%) minmax(0,17%) minmax(0,36%) minmax(96px,9%)}.game-column{grid-template-rows:minmax(0,1fr) 220px}.pattern-halo{width:min(18vh,155px)}.current-orbit{width:150px;height:150px}.current-orbit>strong{width:96px;height:96px}.current-orbit>strong b{font-size:1.85rem}}

  /* Dirección moderna de televisión: fluida, brillante y sin pixel art. */
  .broadcast-canvas{background:radial-gradient(circle at 9% 12%,rgba(255,83,171,.28),transparent 28%),radial-gradient(circle at 91% 78%,rgba(35,221,211,.2),transparent 27%),radial-gradient(circle at 52% 4%,rgba(137,77,255,.28),transparent 34%),linear-gradient(135deg,rgba(52,12,105,.88),rgba(12,13,48,.82) 48%,rgba(34,7,79,.9))}
  .broadcast-canvas::before{background:linear-gradient(112deg,transparent 0 18%,rgba(255,255,255,.035) 18% 18.3%,transparent 18.3% 58%,rgba(255,255,255,.025) 58% 58.25%,transparent 58.25%),radial-gradient(circle at 78% 16%,rgba(255,205,77,.12),transparent 22%);background-size:auto;opacity:1}
  .broadcast-canvas::after{right:-8%;bottom:-26%;left:auto;width:48%;height:66%;background:linear-gradient(145deg,rgba(255,77,168,.44),rgba(121,49,230,.28));border-radius:50% 50% 0 0;clip-path:none;filter:blur(1px);opacity:.72}.pixel-sky{display:none}
  .camera-card,.sponsor-card,.figure-card,.current-ball-card,.board-panel{clip-path:none;border-radius:22px}
  .camera-card{background:linear-gradient(145deg,rgba(85,42,151,.14),rgba(8,12,35,.025));border:3px solid rgba(255,188,64,.9);border-radius:24px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.23),inset 0 0 55px rgba(74,25,133,.14),0 22px 46px rgba(17,3,48,.34)}.camera-card::before{inset:9px;border:2px solid rgba(71,229,215,.6);border-radius:17px;clip-path:none}.camera-card::after{right:20px;bottom:20px;width:58px;height:3px;background:linear-gradient(90deg,#ffca4d,#ff62ac);border-radius:9px;box-shadow:none}
  .broadcast-brand{top:18px;left:18px;gap:.6rem;padding:.45rem .7rem;background:linear-gradient(105deg,rgba(101,49,210,.94),rgba(225,56,149,.91));border:1px solid rgba(255,255,255,.28);border-radius:13px;box-shadow:0 10px 25px rgba(34,8,79,.3),inset 0 1px rgba(255,255,255,.2)}.brand-mark{width:35px;height:35px;color:#48214e;background:linear-gradient(145deg,#fff39c,#ffbc44);border:2px solid rgba(255,255,255,.82);border-radius:11px;box-shadow:0 7px 14px rgba(64,15,77,.22)}
  .camera-label{top:19px;right:19px;padding:.42rem .65rem;background:rgba(18,12,49,.76);border:1px solid rgba(255,255,255,.2);border-radius:10px;box-shadow:0 8px 20px rgba(15,3,43,.25);backdrop-filter:blur(10px)}.camera-label i{border-radius:50%}.connection{right:19px;bottom:19px;padding:.42rem .6rem;background:rgba(18,12,49,.74);border:1px solid rgba(255,255,255,.15);border-radius:10px;backdrop-filter:blur(10px)}.connection>span{border-radius:50%}
  .sponsor-card{padding:.72rem;background:radial-gradient(circle at 92% 6%,rgba(255,206,76,.14),transparent 24%),linear-gradient(145deg,rgba(45,22,91,.98),rgba(14,18,51,.98));border:1px solid rgba(255,203,81,.35);border-radius:22px;box-shadow:inset 0 1px rgba(255,255,255,.07),0 18px 38px rgba(15,3,45,.3)}.module-heading>div span{color:#62ead8}.module-heading>small{color:#ffe88b;background:rgba(221,65,151,.2);border:1px solid rgba(255,125,193,.25);border-radius:7px}.sponsor-showcase{background:radial-gradient(circle at 50% 45%,rgba(122,78,208,.15),transparent 72%),rgba(8,12,38,.44);border:1px solid rgba(255,255,255,.1);border-radius:14px}.sponsor-placeholder>span{background:linear-gradient(145deg,rgba(114,69,220,.32),rgba(224,65,154,.22));border:1px solid rgba(255,255,255,.13);border-radius:14px;box-shadow:0 12px 25px rgba(7,5,30,.28)}.sponsor-progress i{border-radius:9px}.sponsor-progress i.active{background:linear-gradient(90deg,#ff5da8,#ffd053)}
  .pixel-caption{top:12px;left:12px;padding:.35rem .55rem;color:#fff;background:linear-gradient(105deg,#744ee3,#e44996);border:1px solid rgba(255,255,255,.28);border-radius:9px;box-shadow:0 8px 18px rgba(25,7,66,.27);letter-spacing:.11em}
  .figure-card{background:radial-gradient(circle at 50% 45%,rgba(130,80,239,.25),transparent 49%),linear-gradient(160deg,#241655,#101744);border:1px solid rgba(88,224,209,.38);border-radius:22px;box-shadow:inset 0 1px rgba(255,255,255,.08),0 18px 38px rgba(15,3,45,.3)}.figure-showcase::before{background:radial-gradient(circle,rgba(158,111,255,.19),transparent 65%);border:1px solid rgba(175,137,255,.14);animation:modern-breathe 3.8s ease-in-out infinite}.pattern-halo{background:linear-gradient(145deg,rgba(72,43,150,.92),rgba(19,22,61,.95));border:1px solid rgba(203,180,255,.36);border-radius:22px;box-shadow:0 20px 38px rgba(7,5,30,.32),inset 0 1px rgba(255,255,255,.12)}.large-pattern>span{border:1px solid rgba(112,135,162,.32);border-radius:7px}.large-pattern>span.active{background:linear-gradient(145deg,#c775ff,#7652ef);border-color:#e6c8ff;border-radius:7px;box-shadow:0 5px 12px rgba(138,70,226,.35),inset 0 1px rgba(255,255,255,.25)}.large-pattern>span.free{border-radius:7px}.large-pattern i{border-radius:50%}.figure-name{text-shadow:0 8px 20px rgba(9,4,34,.55)}
  .current-ball-card{background:radial-gradient(circle at 50% 60%,rgba(255,195,56,.27),transparent 43%),linear-gradient(145deg,#421a64,#171846);border:1px solid rgba(255,194,69,.48);border-radius:22px;box-shadow:inset 0 1px rgba(255,255,255,.09),0 18px 38px rgba(15,3,45,.3)}.current-ball-card::before{width:210px;height:210px;background:radial-gradient(circle,transparent 42%,rgba(255,215,93,.18) 43% 44%,transparent 45% 56%,rgba(72,229,213,.1) 57% 58%,transparent 59%);animation:modern-orbit 12s linear infinite}.current-orbit>i{width:150px;height:82px;border:1px solid rgba(255,228,116,.3);border-radius:50%;transform:rotate(16deg)}.current-orbit>i:last-child{width:170px;height:96px;border:1px solid rgba(70,229,213,.18);border-radius:50%;transform:rotate(-15deg)}.current-orbit>strong{background:radial-gradient(circle at 34% 24%,#fff 0 7%,#fff3b2 18%,#ffd15b 50%,#ef7d45 78%);border:5px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:0 0 0 6px rgba(255,196,60,.15),0 17px 34px rgba(255,112,54,.32)}.current-ball-card.has-ball .current-orbit>strong{animation:spotlight-arrival .85s cubic-bezier(.2,.8,.2,1)}
  .board-panel{padding:14px;background:linear-gradient(155deg,#fff8dc,#e8e5df 64%,#c7c6c8);border:4px solid #efb63c;border-radius:24px;box-shadow:inset 0 0 0 3px rgba(255,247,194,.9),inset 0 0 0 5px rgba(113,58,27,.35),0 24px 48px rgba(17,3,45,.38)}.board-panel::before{inset:9px;border:1px solid rgba(102,57,31,.25);border-radius:16px}.board-marquee{gap:7px}.board-marquee span{background:linear-gradient(145deg,#ff536c,#bd1859);border:2px solid rgba(255,255,255,.86);border-radius:12px;box-shadow:inset 0 -8px rgba(105,13,57,.18),0 7px 14px rgba(88,25,58,.24);text-shadow:0 3px 6px rgba(74,13,57,.35)}.board-marquee span:nth-child(2){background:linear-gradient(145deg,#ff9f4b,#e24d5d)}.board-marquee span:nth-child(3){background:linear-gradient(145deg,#ffd450,#e97938)}.board-marquee span:nth-child(4){background:linear-gradient(145deg,#df67ed,#8f42d4)}.board-marquee span:nth-child(5){background:linear-gradient(145deg,#5ce1d1,#248fb7)}.vertical-board{gap:5px;padding:5px;background:rgba(102,99,108,.68);border:0;border-radius:12px}.board-column{gap:3px}.board-ball{color:#85828b;background:linear-gradient(145deg,#fbfaf6,#dfdeda);border:1px solid #c5c3c0;border-radius:5px}.board-ball.drawn{background:linear-gradient(145deg,rgba(var(--row-color),.96),#d92f72);border:1px solid rgba(255,255,255,.82);border-radius:5px;box-shadow:inset 0 -4px rgba(70,16,84,.14),0 3px 7px rgba(72,31,42,.2);text-shadow:0 2px 4px rgba(42,11,58,.4)}.board-ball.latest{border:2px solid #fff7c2;border-radius:6px;box-shadow:0 0 0 3px rgba(240,122,59,.55),0 0 17px rgba(255,186,58,.55);animation:latest-pop .7s ease}.board-counter{background:linear-gradient(90deg,#3c1c62,#241744);border:1px solid rgba(147,112,215,.45);border-radius:10px;box-shadow:inset 0 1px rgba(255,255,255,.08)}.board-counter>i{border-radius:9px}.board-counter>i b{border-radius:inherit}
  .tower-column::before{background:radial-gradient(ellipse,rgba(255,194,62,.2),transparent 68%)}
  @keyframes modern-breathe{50%{opacity:.65;transform:translate(-50%,-50%) scale(1.06)}}@keyframes modern-orbit{to{transform:rotate(360deg)}}

  /* Tablero show: marco escénico y balotas con volumen. */
  .board-panel{grid-template-rows:84px minmax(0,1fr) 52px;padding:15px;background:linear-gradient(145deg,#fff7d6 0%,#e7e1d9 57%,#b8b5bd 100%);border:5px solid #f5bd43;border-radius:28px;box-shadow:inset 0 0 0 3px #fff4ae,inset 0 0 0 7px rgba(91,44,37,.4),0 0 0 2px rgba(255,218,93,.3),0 26px 55px rgba(15,2,45,.44),0 0 34px rgba(255,186,57,.14)}.board-panel::before{inset:10px;border:1px solid rgba(91,45,32,.25);border-radius:19px;box-shadow:inset 0 0 30px rgba(255,255,255,.2)}
  .board-marquee{padding:7px;gap:8px;background:linear-gradient(180deg,#331656,#160f38);border:2px solid rgba(255,216,96,.82);border-radius:17px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.07),0 8px 18px rgba(42,9,69,.25)}.board-marquee::before,.board-marquee::after{position:absolute;right:16px;left:16px;height:3px;content:"";background:repeating-linear-gradient(90deg,#fff2a0 0 8px,transparent 8px 26px);filter:drop-shadow(0 0 5px rgba(255,218,86,.72));opacity:.8}.board-marquee::before{top:1px}.board-marquee::after{bottom:1px}.board-marquee span{position:relative;overflow:hidden;border:2px solid rgba(255,255,255,.9);border-radius:13px;box-shadow:inset 0 -10px rgba(86,8,54,.16),0 7px 14px rgba(18,5,48,.28)}.board-marquee span::before{position:absolute;top:-22%;left:-18%;width:58%;height:75%;content:"";background:linear-gradient(135deg,rgba(255,255,255,.48),transparent 70%);border-radius:50%;transform:rotate(-14deg)}
  .vertical-board{gap:7px;padding:7px;background:linear-gradient(145deg,#4d4757,#817b85 48%,#4b4650);border:2px solid rgba(50,38,58,.72);border-radius:15px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.12),inset 0 12px 24px rgba(0,0,0,.16)}.board-column{gap:4px}.board-ball{position:relative;isolation:isolate;overflow:visible;color:#8a8790;background:linear-gradient(145deg,#fffef9,#e4e1dc);border:1px solid #c7c3c0;border-radius:7px;box-shadow:inset 0 1px rgba(255,255,255,.8);font-weight:700}.board-ball.drawn{color:transparent;background:linear-gradient(145deg,#fffdf5,#e3e0dc);border:1px solid #c9c5c1;border-radius:7px;box-shadow:inset 0 1px rgba(255,255,255,.8);text-shadow:none}.board-ball.drawn::before{position:absolute;width:min(46px,70%);aspect-ratio:1;content:"";background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.95) 0 7%,rgba(var(--row-color),1) 28%,rgba(var(--row-color),.92) 58%,#8d2b86 100%);border:2px solid rgba(255,255,255,.9);border-radius:50%;box-shadow:inset -5px -7px 10px rgba(41,8,73,.22),0 5px 10px rgba(var(--row-color),.28)}.board-ball.drawn::after{position:absolute;z-index:2;content:attr(data-number);color:#fff;font-size:inherit;font-weight:800;text-shadow:0 2px 5px rgba(25,7,46,.62)}.board-ball.latest{color:transparent;background:linear-gradient(145deg,#fffdf5,#e3e0dc);border:1px solid #c9c5c1;box-shadow:inset 0 1px rgba(255,255,255,.8);animation:latest-pop .75s cubic-bezier(.2,.8,.2,1)}.board-ball.latest::before{width:min(51px,78%);background:radial-gradient(circle at 34% 24%,#fff 0 8%,#fff4a5 24%,#ffd052 55%,#ed7545 82%);border:3px solid #fff8cf;box-shadow:0 0 0 4px rgba(255,177,50,.24),0 0 18px rgba(255,170,44,.7),inset -5px -7px 10px rgba(137,49,33,.2)}.board-ball.latest::after{color:#481d48;text-shadow:0 1px 2px rgba(255,255,255,.45)}
  .board-counter{padding:0 .75rem;background:linear-gradient(90deg,#39145c,#6d2489 48%,#241341);border:1px solid rgba(255,205,77,.48);border-radius:12px;box-shadow:inset 0 1px rgba(255,255,255,.12),0 6px 14px rgba(29,8,54,.2)}.board-counter strong{color:#fff3a1;font-size:1.28rem;text-shadow:0 0 12px rgba(255,215,76,.25)}.board-counter>i{height:9px;background:rgba(12,7,31,.6);border:1px solid rgba(255,255,255,.08)}.board-counter>i b{background:linear-gradient(90deg,#ff55aa,#ffd65b 54%,#4ce1d4);box-shadow:0 0 11px rgba(255,89,168,.35)}

  /* Carriles de vidrio oscuro: sin cuadrícula ni fondo blanco. */
  .board-panel{background:radial-gradient(circle at 50% 7%,rgba(145,84,255,.2),transparent 26%),radial-gradient(circle at 92% 75%,rgba(46,224,211,.09),transparent 28%),linear-gradient(155deg,#171334,#0d132d 56%,#171038);border:2px solid rgba(255,198,72,.74);box-shadow:inset 0 0 0 2px rgba(255,255,255,.07),inset 0 0 0 5px rgba(107,68,174,.22),0 26px 55px rgba(8,2,32,.48),0 0 35px rgba(118,78,232,.16)}.board-panel::before{inset:8px;border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 0 34px rgba(93,63,176,.1)}
  .vertical-board{gap:9px;padding:3px;background:transparent;border:0;border-radius:0;box-shadow:none}.board-column{gap:0;padding:5px 6px;background:linear-gradient(180deg,rgba(var(--row-color),.105),rgba(var(--row-color),.025) 44%,rgba(255,255,255,.018));border:1px solid rgba(var(--row-color),.18);border-radius:15px;box-shadow:inset 0 1px rgba(255,255,255,.055),inset 0 -18px 28px rgba(3,5,22,.14)}.board-ball{color:#7f849d;background:transparent;border:0;border-bottom:1px solid rgba(var(--row-color),.105);border-radius:0;box-shadow:none;font-weight:600}.board-ball:last-child{border-bottom:0}.board-ball.drawn,.board-ball.latest{background:transparent;border:0;border-bottom:1px solid rgba(var(--row-color),.105);border-radius:0;box-shadow:none}.board-ball.drawn::before{box-shadow:inset -5px -7px 10px rgba(41,8,73,.24),0 6px 13px rgba(var(--row-color),.34),0 0 15px rgba(var(--row-color),.12)}.board-ball.latest::before{box-shadow:0 0 0 4px rgba(255,177,50,.2),0 0 21px rgba(255,170,44,.76),inset -5px -7px 10px rgba(137,49,33,.2)}
  .board-counter{background:linear-gradient(90deg,rgba(69,34,112,.88),rgba(111,38,139,.76) 48%,rgba(30,25,73,.9));border-color:rgba(170,125,255,.32)}

  /* Historial útil para espectadores: cuatro balotas anteriores. */
  .game-column{grid-template-rows:minmax(0,36%) minmax(0,27%) minmax(0,37%)}
  .recent-balls-card{position:relative;display:grid;min-height:0;grid-template-rows:auto 1fr;gap:.55rem;overflow:hidden;padding:.8rem;background:radial-gradient(circle at 86% 8%,rgba(68,225,212,.15),transparent 30%),linear-gradient(145deg,#191846,#2f175d);border:1px solid rgba(91,227,213,.3);border-radius:22px;box-shadow:inset 0 1px rgba(255,255,255,.08),0 18px 38px rgba(15,3,45,.3)}.recent-balls-card::before{position:absolute;right:-32px;bottom:-45px;width:130px;height:130px;content:"";background:radial-gradient(circle,rgba(216,77,173,.16),transparent 68%);pointer-events:none}.recent-heading{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between}.recent-heading span{color:#70eadc;font-size:.46rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.recent-heading i{width:28px;height:3px;background:linear-gradient(90deg,#ff5ba9,#ffd15b);border-radius:8px;box-shadow:0 0 9px rgba(255,91,169,.3)}
  .recent-grid{position:relative;z-index:2;display:grid;min-height:0;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);gap:.45rem}.recent-slot{display:grid;min-height:0;place-items:center;background:linear-gradient(145deg,rgba(var(--recent-color),.11),rgba(255,255,255,.025));border:1px solid rgba(var(--recent-color),.2);border-radius:13px;box-shadow:inset 0 1px rgba(255,255,255,.05)}.recent-slot>span{display:flex;width:min(7vh,64px);aspect-ratio:1;align-items:center;justify-content:center;flex-direction:column;color:#fff;background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.96) 0 7%,rgba(var(--recent-color),1) 28%,rgba(var(--recent-color),.9) 61%,#713078);border:2px solid rgba(255,255,255,.86);border-radius:50%;box-shadow:inset -4px -6px 9px rgba(31,7,60,.22),0 7px 15px rgba(var(--recent-color),.24)}.recent-slot small{font-size:.3rem;line-height:1}.recent-slot strong{font-size:.76rem;line-height:1.08}.recent-slot.empty{opacity:.42}.recent-slot.empty>span{background:rgba(255,255,255,.035);border:1px dashed rgba(255,255,255,.18);box-shadow:none;color:#8c84a4}.recent-slot.empty strong{font-size:.64rem}

  /* ---- Patrocinadores: rótulo de marquesina y nombre bajo la marca ---- */
  .sponsor-card { grid-template-rows: auto minmax(0, 1fr) auto; gap: .5rem; }

  .sponsor-banner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    padding: .3rem .1rem;
  }
  /* Filetes con brillante en el extremo, a ambos lados del rótulo. */
  .sponsor-banner .banner-rule { display: flex; min-width: 0; flex: 1; align-items: center; gap: .3rem; }
  .sponsor-banner .banner-rule i { min-width: 0; flex: 1; height: 2px; border-radius: 2px; }
  .sponsor-banner .banner-rule.left i { background: linear-gradient(90deg, transparent, #ffcf5c); }
  .sponsor-banner .banner-rule.right i { background: linear-gradient(90deg, #ffcf5c, transparent); }
  .sponsor-banner .banner-rule b {
    width: 6px;
    height: 6px;
    flex: 0 0 6px;
    background: #ffe08a;
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(255, 203, 84, .9);
    transform: rotate(45deg);
    animation: banner-gem 1.7s ease-in-out infinite;
  }
  @keyframes banner-gem { 50% { opacity: .35; } }

  .sponsor-banner .banner-title {
    position: relative;
    flex: 0 0 auto;
    background: linear-gradient(180deg, #fff8dc 0%, #ffd85e 46%, #ef9f1c 100%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-family: "Poppins", sans-serif;
    font-size: clamp(.42rem, .62vw, .68rem);
    font-weight: 800;
    letter-spacing: .17em;
    white-space: nowrap;
    filter: drop-shadow(0 2px 7px rgba(255, 190, 60, .5));
  }
  /* Brillo que recorre el rótulo, igual que en la ruleta. */
  .sponsor-banner .banner-title::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, .95) 50%, transparent 60%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    content: attr(data-text);
    animation: banner-title-shine 4.4s ease-in-out infinite;
  }
  @keyframes banner-title-shine { 0%, 100% { background-position: -210% 0; } 55% { background-position: 210% 0; } }

  .sponsor-banner .banner-count {
    position: absolute;
    top: -.1rem;
    right: 0;
    padding: .16rem .3rem;
    color: #1d1206;
    background: linear-gradient(145deg, #ffe9a8, #ffc93c);
    border-radius: 5px;
    font-size: .38rem;
    font-weight: 800;
  }

  .sponsor-footer { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: .35rem; }
  .sponsor-footer .sponsor-name {
    max-width: 100%;
    overflow: hidden;
    color: #fff;
    font-size: clamp(.6rem, .95vw, .95rem);
    font-weight: 700;
    letter-spacing: .01em;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 2px 10px rgba(0, 0, 0, .45);
  }
  .sponsor-footer .sponsor-progress { margin-top: 0; }

  /* ================================================================
     FESTIVAL AURORA — escena principal de transmisión
     Esta capa redefine únicamente el panel base; las capas de ganador,
     ruleta, sorteo y presentación conservan su composición y z-index.
     ================================================================ */
  .broadcast-canvas {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: clamp(14px, 1.15vw, 22px);
    overflow: hidden;
    background: transparent;
    isolation: isolate;
  }
  .broadcast-canvas::before {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 35.8%;
    z-index: -3;
    content: "";
    background:
      radial-gradient(circle at 12% 18%, rgba(255, 78, 165, .28), transparent 29%),
      radial-gradient(circle at 89% 23%, rgba(255, 205, 72, .18), transparent 25%),
      radial-gradient(circle at 61% 83%, rgba(52, 229, 216, .2), transparent 32%),
      linear-gradient(142deg, rgba(50, 16, 105, .97), rgba(10, 13, 47, .98) 48%, rgba(34, 9, 74, .98));
    opacity: 1;
  }
  .broadcast-canvas::after {
    position: absolute;
    right: -10%;
    bottom: -31%;
    z-index: -2;
    width: 60%;
    height: 70%;
    content: "";
    background: conic-gradient(from 210deg, rgba(255, 77, 166, .52), rgba(255, 196, 68, .22), rgba(56, 227, 213, .26), rgba(129, 74, 236, .4), rgba(255, 77, 166, .52));
    border-radius: 50%;
    clip-path: none;
    filter: blur(38px);
    opacity: .68;
    animation: aurora-drift 12s ease-in-out infinite alternate;
  }
  .pixel-sky {
    position: absolute;
    inset: 0;
    z-index: -1;
    display: block;
    overflow: hidden;
    pointer-events: none;
  }
  .pixel-sky i {
    position: absolute;
    width: clamp(150px, 15vw, 280px);
    height: clamp(150px, 15vw, 280px);
    background: radial-gradient(circle, rgba(255, 89, 174, .19), transparent 68%);
    border: 1px solid rgba(255, 255, 255, .07);
    border-radius: 50%;
    box-shadow: none;
    filter: blur(.2px);
    animation: aurora-float 8s ease-in-out infinite alternate;
  }
  .pixel-sky i:nth-child(1) { top: -7%; left: 38%; }
  .pixel-sky i:nth-child(2) { top: 12%; left: auto; right: -5%; background: radial-gradient(circle, rgba(255, 207, 70, .14), transparent 68%); animation-delay: -2s; }
  .pixel-sky i:nth-child(3) { top: auto; bottom: -9%; left: 50%; background: radial-gradient(circle, rgba(47, 229, 215, .17), transparent 68%); animation-delay: -4s; }
  .pixel-sky i:nth-child(4) { top: 38%; right: 22%; left: auto; width: 90px; height: 90px; background: radial-gradient(circle, rgba(255,255,255,.14), transparent 65%); animation-delay: -1s; }
  .pixel-sky i:nth-child(5) { top: 4%; right: 37%; left: auto; width: 60px; height: 60px; background: radial-gradient(circle, rgba(85,242,224,.2), transparent 65%); animation-delay: -6s; }

  .broadcast-stage {
    position: relative;
    display: grid;
    width: 100%;
    height: 100%;
    min-height: 0;
    grid-template-columns: minmax(0, 35%) minmax(0, 18%) minmax(0, 34.5%) minmax(126px, 8.5%);
    gap: clamp(13px, 1vw, 19px);
  }
  .left-column {
    display: grid;
    min-height: 0;
    grid-template-rows: minmax(0, 63%) minmax(0, 37%);
    gap: clamp(13px, 1vw, 19px);
  }
  .game-column {
    display: grid;
    min-height: 0;
    grid-template-rows: minmax(0, 43%) minmax(0, 20%) minmax(0, 37%);
    gap: clamp(13px, 1vw, 19px);
  }

  .camera-card, .sponsor-card, .figure-card, .recent-balls-card, .current-ball-card, .board-panel {
    clip-path: none;
    border-radius: 28px;
  }

  /* Cámara: una ventana transparente real para ubicar la fuente debajo en OBS. */
  .camera-card {
    position: relative;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    align-self: stretch;
    overflow: hidden;
    background:
      linear-gradient(140deg, rgba(255,255,255,.055), transparent 28%),
      linear-gradient(180deg, rgba(52, 20, 96, .12), rgba(9, 11, 39, .06));
    border: 3px solid transparent;
    border-radius: 30px;
    box-shadow: 0 0 0 2px rgba(255, 203, 75, .9), 0 0 0 6px rgba(255, 86, 165, .38), 0 24px 48px rgba(10, 3, 37, .36);
  }
  .camera-card::before {
    position: absolute;
    inset: 10px;
    content: "";
    border: 2px solid rgba(71, 229, 215, .78);
    border-radius: 20px;
    box-shadow: inset 0 0 28px rgba(65, 235, 220, .08), 0 0 18px rgba(65, 235, 220, .1);
    pointer-events: none;
  }
  .camera-card::after {
    position: absolute;
    top: 0;
    right: 15%;
    width: 30%;
    height: 5px;
    content: "";
    background: linear-gradient(90deg, transparent, #fff2a2 30%, #ff5da9 70%, transparent);
    border-radius: 0 0 10px 10px;
    box-shadow: 0 0 16px rgba(255, 92, 169, .65);
  }
  .broadcast-brand {
    top: 22px;
    left: 22px;
    gap: .65rem;
    padding: .5rem .78rem;
    background: linear-gradient(108deg, rgba(104, 46, 211, .94), rgba(225, 55, 148, .92));
    border: 1px solid rgba(255,255,255,.32);
    border-radius: 15px;
    box-shadow: 0 12px 26px rgba(31, 7, 74, .32), inset 0 1px rgba(255,255,255,.22);
    backdrop-filter: blur(12px);
  }
  .brand-mark { width: 38px; height: 38px; color: #4d1c51; background: linear-gradient(145deg,#fff6b5,#ffc13f 62%,#ff8a56); border: 2px solid #fff8d2; border-radius: 13px; box-shadow: 0 8px 16px rgba(42,8,66,.25); }
  .camera-label { top: 22px; right: 22px; padding: .48rem .72rem; background: rgba(18, 11, 48, .78); border: 1px solid rgba(255,255,255,.24); border-radius: 12px; box-shadow: 0 9px 20px rgba(14,3,42,.3); backdrop-filter: blur(12px); }
  .camera-label i { background: #ff5c91; box-shadow: 0 0 0 5px rgba(255,92,145,.14), 0 0 12px #ff5c91; }
  .connection { right: 22px; bottom: 22px; padding: .48rem .68rem; background: rgba(18,11,48,.76); border: 1px solid rgba(255,255,255,.18); border-radius: 12px; backdrop-filter: blur(12px); }
  .corner { width: 40px; height: 40px; border-color: rgba(255, 220, 98, .92); }
  .top-left, .top-right { top: 10px; } .bottom-left, .bottom-right { bottom: 10px; } .top-left, .bottom-left { left: 10px; } .top-right, .bottom-right { right: 10px; }

  /* Patrocinadores: escenario amplio y neutro que admite imagen o video. */
  .sponsor-card {
    gap: .5rem;
    padding: .8rem;
    background:
      radial-gradient(circle at 86% 10%, rgba(255, 206, 69, .18), transparent 28%),
      radial-gradient(circle at 8% 88%, rgba(255, 78, 164, .16), transparent 32%),
      linear-gradient(145deg, rgba(48, 21, 91, .97), rgba(10, 16, 47, .98));
    border: 1px solid rgba(255, 210, 89, .43);
    border-radius: 28px;
    box-shadow: inset 0 1px rgba(255,255,255,.1), 0 20px 42px rgba(9, 3, 35, .36);
  }
  .sponsor-card > div { border-color: rgba(255, 221, 126, .2); border-radius: 18px; background: radial-gradient(circle at 50% 44%, rgba(255,213,102,.14), transparent 68%), rgba(7, 11, 35, .48); }
  .sponsor-banner .banner-title { font-size: clamp(.46rem,.7vw,.74rem); letter-spacing: .2em; }
  .sponsor-footer .sponsor-name { color: #fff6d6; font-size: clamp(.66rem, .9vw, .96rem); }
  .sponsor-progress i { height: 4px; background: rgba(255,255,255,.12); border-radius: 10px; }
  .sponsor-progress i.active { background: linear-gradient(90deg,#ff5aa8,#ffd45d,#4de5d5); box-shadow: 0 0 12px rgba(255,90,168,.44); }

  /* Figura: una pieza visual protagonista, sin sensación de formulario. */
  .figure-card {
    position: relative;
    display: grid;
    min-height: 0;
    grid-template-rows: 1fr;
    padding: .75rem;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 39%, rgba(175, 105, 255, .32), transparent 43%),
      radial-gradient(circle at 90% 90%, rgba(51, 229, 216, .15), transparent 35%),
      linear-gradient(155deg, #311766, #111743 70%);
    border: 1px solid rgba(121, 236, 221, .46);
    border-radius: 28px;
    box-shadow: inset 0 1px rgba(255,255,255,.1), 0 20px 42px rgba(9,3,35,.36);
  }
  .figure-card::after { position:absolute; top:-28%; right:-24%; width:150px; height:150px; content:""; border:1px solid rgba(255,211,92,.2); border-radius:50%; box-shadow:0 0 0 18px rgba(255,83,165,.04),0 0 0 38px rgba(69,229,214,.025); }
  .pixel-caption { top: 14px; left: 14px; z-index: 4; padding: .38rem .62rem; color:#fff7c3; background:linear-gradient(105deg,rgba(115,70,224,.94),rgba(226,61,152,.92)); border:1px solid rgba(255,255,255,.27); border-radius:10px; box-shadow:0 9px 20px rgba(20,5,56,.3); font-size:.43rem; letter-spacing:.13em; }
  .figure-showcase { grid-template-columns: 1fr; grid-template-rows: minmax(0,1fr) auto; gap: .45rem; padding: 2.5rem .45rem .65rem; background: transparent; border: 0; border-radius: 0; }
  .figure-showcase::before { top:47%; left:50%; width:210px; height:210px; background:radial-gradient(circle,rgba(172,111,255,.23),transparent 66%); border:1px solid rgba(194,157,255,.13); animation:aurora-breathe 4s ease-in-out infinite; }
  .pattern-halo { width:min(22vh,188px); max-width:86%; background:linear-gradient(145deg,rgba(94,52,186,.96),rgba(15,20,59,.98)); border:1px solid rgba(220,196,255,.42); border-radius:28px; box-shadow:0 22px 42px rgba(7,4,31,.38),inset 0 1px rgba(255,255,255,.15),0 0 30px rgba(141,80,238,.13); }
  .large-pattern { gap: 6px; }
  .large-pattern > span { background:rgba(28,37,67,.92); border:1px solid rgba(125,149,178,.28); border-radius:9px; }
  .large-pattern > span.active { background:linear-gradient(145deg,#f385ff,#8159f0 58%,#5348d6); border-color:#f0d0ff; border-radius:9px; box-shadow:inset 0 1px rgba(255,255,255,.3),0 6px 14px rgba(145,73,227,.44),0 0 12px rgba(229,118,255,.17); }
  .figure-name { justify-self:center; max-width:94%; color:#fff; font-size:clamp(.78rem,1.05vw,1.12rem); text-align:center; }
  .figure-name::after { width:54px; height:4px; margin:.55rem auto 0; background:linear-gradient(90deg,#ff5ca9,#ffd55c,#48e3d4); }
  .figure-count { top: .95rem; right: .95rem; }

  /* Historial compacto: información útil sin competir con la balota actual. */
  .recent-balls-card { gap:.35rem; padding:.72rem; background:radial-gradient(circle at 90% 0,rgba(69,228,214,.14),transparent 34%),linear-gradient(145deg,#171844,#32175f); border:1px solid rgba(88,230,215,.34); border-radius:24px; box-shadow:inset 0 1px rgba(255,255,255,.08),0 18px 36px rgba(9,3,35,.32); }
  .recent-heading span { color:#73f1df; font-size:.43rem; letter-spacing:.12em; }
  .recent-grid { grid-template-columns:repeat(4,1fr); grid-template-rows:1fr; gap:.35rem; }
  .recent-slot { border-radius:12px; }
  .recent-slot > span { width:min(5vh,48px); }
  .recent-slot small { font-size:.27rem; }
  .recent-slot strong { font-size:.65rem; }

  /* Balota actual: lectura inmediata incluso en pantallas pequeñas. */
  .current-ball-card {
    position: relative;
    display: grid;
    min-height: 0;
    place-items: center;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 56%, rgba(255, 201, 59, .32), transparent 42%),
      radial-gradient(circle at 12% 10%, rgba(255, 82, 166, .17), transparent 30%),
      linear-gradient(150deg, #4b1b68, #171849 68%);
    border: 1px solid rgba(255, 205, 79, .52);
    border-radius: 28px;
    box-shadow: inset 0 1px rgba(255,255,255,.1), 0 20px 42px rgba(9,3,35,.36);
  }
  .current-ball-card::before { width:260px; height:260px; background:conic-gradient(from 0deg,transparent 0 14%,rgba(255,211,81,.32) 14% 16%,transparent 16% 45%,rgba(68,230,215,.22) 45% 47%,transparent 47% 73%,rgba(255,83,166,.27) 73% 75%,transparent 75%); border:1px solid rgba(255,255,255,.05); border-radius:50%; animation:modern-orbit 14s linear infinite; }
  .current-orbit { width:100%; height:100%; }
  .current-orbit > i { width:205px; height:112px; border:1px solid rgba(255,230,129,.34); border-radius:50%; transform:rotate(17deg); }
  .current-orbit > i:last-child { width:235px; height:130px; border-color:rgba(69,232,216,.21); transform:rotate(-16deg); }
  .current-orbit > strong { width:min(16vh,156px); height:min(16vh,156px); background:radial-gradient(circle at 32% 21%,#fff 0 7%,#fff6bd 17%,#ffd85c 48%,#f37a55 78%,#bf3a72); border:6px solid #fff9db; border-radius:50%; box-shadow:0 0 0 7px rgba(255,199,62,.16),0 0 34px rgba(255,174,43,.45),0 20px 38px rgba(49,8,65,.36),inset -8px -11px 15px rgba(112,30,71,.18); }
  .current-orbit > strong small { top:20px; font-size:.72rem; }
  .current-orbit > strong b { margin-top:16px; font-size:clamp(2.5rem,3.6vw,4rem); }

  /* Tablero vertical: cinco carriles de color, sin cuadrícula blanca. */
  .board-panel {
    position: relative;
    display: grid;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: 92px minmax(0, 1fr) 56px;
    gap: 10px;
    padding: 16px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 0, rgba(154, 87, 255, .26), transparent 28%),
      radial-gradient(circle at 96% 78%, rgba(47, 226, 214, .11), transparent 31%),
      linear-gradient(155deg, #201449, #0d142f 56%, #20103f);
    border: 2px solid rgba(255, 205, 77, .82);
    border-radius: 30px;
    box-shadow: inset 0 0 0 3px rgba(255,255,255,.06), inset 0 0 55px rgba(103,65,189,.12), 0 25px 52px rgba(7,2,31,.47), 0 0 35px rgba(118,77,232,.14);
  }
  .board-panel::before { inset:8px; border:1px solid rgba(255,255,255,.1); border-radius:22px; box-shadow:inset 0 0 35px rgba(88,62,173,.1); }
  .board-marquee { position:relative; z-index:2; display:grid; grid-template-columns:repeat(5,1fr); gap:8px; padding:8px; background:linear-gradient(180deg,rgba(51,21,91,.92),rgba(16,15,52,.94)); border:1px solid rgba(255,218,101,.42); border-radius:18px; box-shadow:inset 0 1px rgba(255,255,255,.09),0 10px 22px rgba(20,5,53,.3); }
  .board-marquee::before, .board-marquee::after { display:none; }
  .board-marquee span { position:relative; display:grid; overflow:hidden; place-items:center; color:#fff; border:2px solid rgba(255,255,255,.82); border-radius:15px; box-shadow:inset 0 -10px rgba(71,13,76,.15),0 7px 15px rgba(18,5,48,.29); font-size:clamp(1.55rem,2.6vw,2.65rem); font-weight:900; text-shadow:0 4px 9px rgba(54,10,71,.38); }
  .board-marquee span::before { top:-28%; left:-12%; width:55%; height:85%; background:linear-gradient(135deg,rgba(255,255,255,.5),transparent 70%); border-radius:50%; transform:rotate(-14deg); }
  .board-marquee span:nth-child(1) { background:linear-gradient(145deg,#48e1ce,#168ea5); }
  .board-marquee span:nth-child(2) { background:linear-gradient(145deg,#79a7ff,#4f50d7); }
  .board-marquee span:nth-child(3) { background:linear-gradient(145deg,#b785ff,#7249df); }
  .board-marquee span:nth-child(4) { background:linear-gradient(145deg,#ec80f5,#a238c6); }
  .board-marquee span:nth-child(5) { background:linear-gradient(145deg,#ffc85b,#ed744d); }
  .vertical-board { position:relative; z-index:2; display:grid; min-height:0; grid-template-columns:repeat(5,1fr); gap:9px; padding:0; background:transparent; border:0; border-radius:0; box-shadow:none; }
  .board-column { display:grid; min-height:0; grid-template-rows:repeat(15,1fr); gap:0; padding:6px 7px; background:linear-gradient(180deg,rgba(var(--row-color),.14),rgba(var(--row-color),.035) 46%,rgba(255,255,255,.015)); border:1px solid rgba(var(--row-color),.27); border-radius:17px; box-shadow:inset 0 1px rgba(255,255,255,.07),inset 0 -24px 34px rgba(3,5,22,.16),0 8px 20px rgba(5,4,28,.18); }
  .board-ball { position:relative; isolation:isolate; display:grid; min-width:0; min-height:0; place-items:center; overflow:visible; color:#8e94ad; background:transparent; border:0; border-bottom:1px solid rgba(var(--row-color),.12); border-radius:0; box-shadow:none; font-size:clamp(.62rem,.82vw,.9rem); font-weight:700; }
  .board-ball:last-child { border-bottom:0; }
  .board-ball.drawn, .board-ball.latest { color:transparent; background:transparent; border:0; border-bottom:1px solid rgba(var(--row-color),.12); border-radius:0; box-shadow:none; text-shadow:none; }
  .board-ball.drawn::before { position:absolute; width:min(45px,73%); aspect-ratio:1; content:""; background:radial-gradient(circle at 32% 22%,#fff 0 7%,rgba(var(--row-color),1) 27%,rgba(var(--row-color),.92) 58%,#782a85 100%); border:2px solid rgba(255,255,255,.9); border-radius:50%; box-shadow:inset -5px -7px 10px rgba(41,8,73,.22),0 6px 13px rgba(var(--row-color),.35),0 0 16px rgba(var(--row-color),.13); }
  .board-ball.drawn::after { position:absolute; z-index:2; content:attr(data-number); color:#fff; font-size:inherit; font-weight:900; text-shadow:0 2px 5px rgba(25,7,46,.62); }
  .board-ball.latest { animation:latest-pop .75s cubic-bezier(.2,.8,.2,1); }
  .board-ball.latest::before { width:min(51px,82%); background:radial-gradient(circle at 32% 21%,#fff 0 8%,#fff5ac 23%,#ffd151 55%,#ef6f55 82%); border:3px solid #fff8d0; box-shadow:0 0 0 4px rgba(255,177,50,.21),0 0 23px rgba(255,170,44,.82),inset -5px -7px 10px rgba(137,49,33,.2); }
  .board-ball.latest::after { color:#4b1b4d; text-shadow:0 1px 2px rgba(255,255,255,.45); }
  .board-counter { position:relative; z-index:2; display:grid; grid-template-columns:auto auto 1fr; align-items:center; gap:.3rem; padding:0 .85rem; color:#fff; background:linear-gradient(90deg,rgba(82,35,130,.94),rgba(137,45,140,.82) 48%,rgba(30,26,78,.95)); border:1px solid rgba(188,146,255,.38); border-radius:14px; box-shadow:inset 0 1px rgba(255,255,255,.1),0 7px 16px rgba(17,5,45,.24); }
  .board-counter strong { color:#fff2a6; font-size:1.35rem; text-shadow:0 0 13px rgba(255,215,76,.28); }
  .board-counter span { color:#c0b2d5; font-size:.52rem; }
  .board-counter > i { height:9px; overflow:hidden; margin-left:.45rem; background:rgba(9,7,29,.62); border:1px solid rgba(255,255,255,.08); border-radius:10px; }
  .board-counter > i b { display:block; height:100%; background:linear-gradient(90deg,#ff56aa,#ffd65a 54%,#4ce4d5); border-radius:inherit; box-shadow:0 0 12px rgba(255,89,168,.38); }

  .tower-column { position:relative; min-height:0; padding:30px 0 5px; }
  .tower-column::before { position:absolute; inset:11% -12% 6%; z-index:-1; content:""; background:radial-gradient(ellipse,rgba(255,82,164,.18),rgba(56,228,215,.1) 44%,transparent 70%); filter:blur(5px); }

  @keyframes aurora-drift { to { transform:translate(5%,-4%) rotate(8deg) scale(1.08); } }
  @keyframes aurora-float { to { transform:translate(18px,-20px) scale(1.08); opacity:.6; } }
  @keyframes aurora-breathe { 50% { opacity:.62; transform:translate(-50%,-50%) scale(1.08); } }

  @media (max-aspect-ratio: 4/3) {
    .broadcast-stage { grid-template-columns:minmax(0,33%) minmax(0,19%) minmax(0,34%) minmax(112px,9%); }
    .left-column { grid-template-rows:minmax(0,56%) minmax(0,44%); }
    .game-column { grid-template-rows:minmax(0,42%) minmax(0,22%) minmax(0,36%); }
    .pattern-halo { width:min(18vh,155px); }
    .current-orbit > strong { width:112px; height:112px; }
    .current-orbit > strong b { font-size:2.15rem; }
  }

  .broadcast-canvas.broadcast-canvas-v2 { padding: 0; background: transparent; }
  .broadcast-canvas.broadcast-canvas-v2::before,
  .broadcast-canvas.broadcast-canvas-v2::after { display: none; }
`;
