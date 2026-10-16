import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { playBallAudio, DEFAULT_VOICE, isCurrentBallAudioPlayback } from "../logic/ballAudio";
import { BallVoice } from "../../bingoCustomization/services/ballVoices.service";

interface BallPanelProps {
  onSelectBall: (balls: number[]) => void;
  onRandomBall?: number[];
  isActivePanel: boolean;
  gameReset: boolean;
  initialBalls?: number[];
  voice?: BallVoice;
  repeatVoice?: BallVoice;
  automaticRepeat?: boolean;
}

const BallPanel: React.FC<BallPanelProps> = ({ onSelectBall, isActivePanel, onRandomBall, gameReset, initialBalls, voice, repeatVoice, automaticRepeat = false }) => {
  const [selectedBalls, setSelectedBalls] = useState<number[]>(initialBalls ?? []);
  const [userInteracted, setUserInteracted] = useState(false);
  const voiceRef = useRef<BallVoice>(voice ?? DEFAULT_VOICE);
  const repeatVoiceRef = useRef<BallVoice>(repeatVoice ?? voice ?? DEFAULT_VOICE);
  const automaticRepeatRef = useRef(automaticRepeat);
  const playbackSequenceRef = useRef(0);
  voiceRef.current = voice ?? DEFAULT_VOICE;
  repeatVoiceRef.current = repeatVoice ?? voice ?? DEFAULT_VOICE;
  automaticRepeatRef.current = automaticRepeat;

  const playSound = useCallback(async (ballNumber: number) => {
    const sequence = ++playbackSequenceRef.current;
    const primaryPlayback = playBallAudio(ballNumber, voiceRef.current);
    await primaryPlayback;
    // Una balota nueva invalida la repetición pendiente de la anterior.
    if (automaticRepeatRef.current && sequence === playbackSequenceRef.current && isCurrentBallAudioPlayback(primaryPlayback)) {
      await playBallAudio(ballNumber, repeatVoiceRef.current);
    }
  }, []);

  useEffect(() => {
    if (gameReset) {
      setSelectedBalls([]);
      setUserInteracted(false);
    }
  }, [gameReset]);

  useEffect(() => {
    if (onRandomBall && onRandomBall.length > 0 && userInteracted && !gameReset) {
      setSelectedBalls((current) => Array.from(new Set([...current, ...onRandomBall])));
      playSound(onRandomBall[onRandomBall.length - 1]);
    }
  }, [gameReset, onRandomBall, playSound, userInteracted]);

  useEffect(() => {
    const handleUserInteraction = () => setUserInteracted(true);
    const randomBallButton = document.getElementById("btn-game-random");
    randomBallButton?.addEventListener("click", handleUserInteraction, { once: true });
    return () => randomBallButton?.removeEventListener("click", handleUserInteraction);
  }, [userInteracted]);

  const handleBallClick = (ball: number) => {
    setUserInteracted(true);
    setSelectedBalls((current) => {
      const updated = current.includes(ball) ? current.filter((item) => item !== ball) : [...current, ball];
      onSelectBall(updated);
      playSound(ball);
      return updated;
    });
  };

  const bingoRows = [
    { letter: "B", start: 1, end: 15 },
    { letter: "I", start: 16, end: 30 },
    { letter: "N", start: 31, end: 45 },
    { letter: "G", start: 46, end: 60 },
    { letter: "O", start: 61, end: 75 },
  ];

  return (
    <BallPanelStyle>
      <div className="ball-panel">
        {bingoRows.map(({ letter, start, end }) => (
          <div className={`bingo-row row-${letter.toLowerCase()}`} key={letter}>
            <div className="letter-badge" aria-label={`Letra ${letter}, números del ${start} al ${end}`}>
              <span>{letter}</span>
              <small>{start}–{end}</small>
            </div>
            <div className="number-row">
              {Array.from({ length: 15 }, (_, index) => start + index).map((ball) => (
                <div className={`ball-container ${selectedBalls.includes(ball) ? "selected" : ""}`} key={ball}>
                  <button
                    type="button"
                    onClick={() => handleBallClick(ball)}
                    disabled={isActivePanel}
                    aria-pressed={selectedBalls.includes(ball)}
                    aria-label={`Balota ${letter} ${ball}`}
                    className={`ball ${selectedBalls.includes(ball) ? "selected" : ""}`}
                  >{ball}</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BallPanelStyle>
  );
};

export default BallPanel;

const BallPanelStyle = styled.div`
  width: 100%;
  overflow-x: auto;
  padding-bottom: .25rem;
  .ball-panel { display: flex; min-width: 760px; flex-direction: column; gap: .48rem; padding: .15rem; }
  .bingo-row { --row-rgb: 124, 92, 255; --row-color: #7c5cff; display: grid; grid-template-columns: 62px minmax(0, 1fr); align-items: center; gap: .7rem; }
  .row-i { --row-rgb: 39, 211, 178; --row-color: #27d3b2; }
  .row-n { --row-rgb: 255, 184, 77; --row-color: #ffb84d; }
  .row-g { --row-rgb: 239, 113, 128; --row-color: #ef7180; }
  .row-o { --row-rgb: 77, 163, 255; --row-color: #4da3ff; }
  .letter-badge { position: relative; display: flex; height: 42px; align-items: center; justify-content: center; gap: .35rem; overflow: hidden; color: var(--row-color); background: linear-gradient(135deg, rgba(var(--row-rgb),.16), rgba(var(--row-rgb),.035)); border: 1px solid rgba(var(--row-rgb),.25); border-radius: 12px; box-shadow: inset 3px 0 0 rgba(var(--row-rgb),.72); }
  .letter-badge::after { position: absolute; right: -8px; width: 22px; height: 22px; content: ""; background: rgba(var(--row-rgb),.11); border-radius: 50%; }
  .letter-badge span { font-family: "Poppins", sans-serif; font-size: 1rem; font-weight: 700; }
  .letter-badge small { color: rgba(var(--row-rgb),.72); font-size: .46rem; font-weight: 700; letter-spacing: .02em; }
  .number-row { display: grid; grid-template-columns: repeat(15, minmax(30px, 1fr)); gap: .48rem; }
  .ball-container { display: grid; width: 100%; max-width: 42px; aspect-ratio: 1; justify-self: center; place-items: center; background: rgba(255,255,255,.018); border: 1px solid var(--border-subtle); border-radius: 12px; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
  .ball-container.selected { background: rgba(var(--row-rgb), .11); border-color: rgba(var(--row-rgb), .4); box-shadow: 0 8px 20px rgba(0,0,0,.18); transform: translateY(-1px); }
  .ball { width: 100%; height: 100%; padding: 0; color: #7b8496; background: transparent; border: 0; border-radius: 13px; font-family: "Poppins", sans-serif; font-size: clamp(.68rem, 1vw, .82rem); font-weight: 700; cursor: pointer; transition: color .16s ease, background .16s ease; }
  .ball:not(:disabled):hover { color: #fff; background: rgba(255,255,255,.05); }
  .ball:disabled { cursor: default; }
  .ball.selected { color: #fff; background: var(--row-color); box-shadow: inset 0 1px rgba(255,255,255,.18), 0 5px 12px rgba(var(--row-rgb),.14); }
  .row-n .ball.selected { color: #19140b; }
`;
