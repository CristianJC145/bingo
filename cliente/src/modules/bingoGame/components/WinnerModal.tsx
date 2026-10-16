import { useEffect } from "react";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import { settings } from "../../../shared/constant/settings.constants";
import { waitForCurrentBallAudio } from "../logic/ballAudio";

interface Card { id: number; pattern: number[][]; }
interface WinnerModalProps { onClose: () => void; winnerCards: Card[]; isOpen: boolean; }

const WinnerModal: React.FC<WinnerModalProps> = ({ winnerCards, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const playWinnerSound = async () => {
      await waitForCurrentBallAudio();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 320));
      if (cancelled) return;
      const audio = new Audio(`${settings.appSounds}/sounds/ball/bingo.mp3`);
      audio.play().catch(() => undefined);
    };
    playWinnerSound();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen || winnerCards.length === 0) return null;
  const primaryWinner = winnerCards[0];

  return (
    <WinnerModalStyle>
      <div className="winner-overlay">
        <section className="winner-modal" role="dialog" aria-modal="true" aria-label="Ganador confirmado">
          <div className="celebration-mark"><span><AppIcon icon="trophy" /></span></div>
          <span className="winner-kicker">Resultado confirmado</span>
          <h2>¡Tenemos {winnerCards.length === 1 ? "ganador" : "ganadores"}!</h2>
          <p>{winnerCards.length === 1 ? "El cartón ha completado la figura activa." : `${winnerCards.length} cartones completaron una figura activa.`}</p>
          <div className="winner-number"><small>Cartón principal</small><strong>#{String(primaryWinner.id).padStart(4, "0")}</strong></div>
          {winnerCards.length > 1 && <div className="additional-winners">También ganan: {winnerCards.slice(1).map((card) => `#${String(card.id).padStart(4, "0")}`).join(" · ")}</div>}
          <AppButton icon="check" label="Confirmar resultado" onClick={onClose} />
        </section>
      </div>
    </WinnerModalStyle>
  );
};

export default WinnerModal;

const WinnerModalStyle = styled.div`
  .winner-overlay { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 1rem; background: rgba(3,5,9,.84); backdrop-filter: blur(10px); }
  .winner-modal { position: relative; width: min(100%, 450px); overflow: hidden; padding: 2rem; color: var(--text-primary); text-align: center; background: radial-gradient(circle at 50% 0, rgba(255,184,77,.14), transparent 44%), var(--bg-panel-raised); border: 1px solid rgba(255,184,77,.25); border-radius: 24px; box-shadow: 0 32px 90px rgba(0,0,0,.55); animation: winner-in .35s cubic-bezier(.2,.8,.2,1); }
  .winner-modal::before, .winner-modal::after { position: absolute; width: 90px; height: 90px; content: ""; border: 1px solid rgba(255,184,77,.15); border-radius: 50%; }
  .winner-modal::before { top: -50px; left: -35px; } .winner-modal::after { right: -40px; bottom: -60px; }
  .celebration-mark { display: grid; width: 76px; height: 76px; margin: 0 auto 1.2rem; place-items: center; background: rgba(255,184,77,.08); border: 1px solid rgba(255,184,77,.22); border-radius: 50%; }
  .celebration-mark span { display: grid; width: 52px; height: 52px; place-items: center; color: #1a1409; background: linear-gradient(145deg,#ffd780,#f0a435); border-radius: 17px; box-shadow: 0 12px 30px rgba(255,184,77,.18); }
  .celebration-mark svg { font-size: 1.25rem; }
  .winner-kicker { color: var(--color-accent); font-size: .64rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  h2 { margin: .55rem 0 .4rem; font-size: 1.65rem; font-weight: 700; }
  p { margin: 0 auto; max-width: 330px; color: var(--text-secondary); font-size: .75rem; line-height: 1.6; }
  .winner-number { display: flex; flex-direction: column; margin: 1.5rem 0 1rem; padding: 1rem; background: rgba(0,0,0,.2); border: 1px solid var(--border-subtle); border-radius: 15px; }
  .winner-number small { color: var(--text-muted); font-size: .6rem; letter-spacing: .08em; text-transform: uppercase; }
  .winner-number strong { margin-top: .3rem; color: #fff; font-family: "Poppins", sans-serif; font-size: 1.7rem; letter-spacing: .08em; }
  .additional-winners { margin: -.25rem 0 1rem; color: var(--text-secondary); font-size: .65rem; }
  .winner-modal > div:last-child .vs-btn { width: 100%; }
  @keyframes winner-in { from { opacity: 0; transform: translateY(14px) scale(.96); } }
`;
