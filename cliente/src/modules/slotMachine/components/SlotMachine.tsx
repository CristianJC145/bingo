import React, { type CSSProperties } from "react";
import styled from "styled-components";
import { SlotResult } from "../services/slotMachine.service";

export type SlotPhase = "idle" | "spinning" | "revealed";

interface SlotMachineProps {
  phase: SlotPhase;
  reelMunicipio: string;
  reelCard: string;
  municipioSettled: boolean;
  cardSettled: boolean;
  result: SlotResult | null;
  compact?: boolean;
}

const BINGO_BALLS = [
  { letter: "B", color: "#39dfd0" },
  { letter: "I", color: "#6b8dff" },
  { letter: "N", color: "#a96cff" },
  { letter: "G", color: "#ff60b3" },
  { letter: "O", color: "#ffb84e" },
];

const WHEEL_MARKS = 36;

const formatCardNumber = (value: string | number): string => {
  const text = String(value);
  return /^\d+$/.test(text) ? text.padStart(4, "0") : text;
};

const SlotMachine: React.FC<SlotMachineProps> = ({
  phase,
  reelMunicipio,
  reelCard,
  municipioSettled,
  cardSettled,
  result,
  compact,
}) => {
  const isSpinning = phase === "spinning";
  const revealed = phase === "revealed" && result !== null;
  const municipioValue = municipioSettled && result ? result.municipioLabel : reelMunicipio;
  const cardValue = formatCardNumber(cardSettled && result ? result.cardNumber : reelCard);
  const municipioLong = municipioValue.length > 17;

  const municipioStatus = municipioSettled ? "SELECCIONADO" : isSpinning ? "BUSCANDO" : "EN ESPERA";
  const cardStatus = cardSettled ? "SELECCIONADO" : municipioSettled && isSpinning ? "BUSCANDO" : "EN ESPERA";

  return (
    <SlotMachineStyle className={`${compact ? "compact" : ""} ${isSpinning ? "is-spinning" : ""} ${revealed ? "is-win" : ""}`.trim()}>
      <section className="draw-stage">
        <div className="stage-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <div className="stage-balls" aria-hidden="true"><i>B</i><i>27</i><i>G</i><i>63</i></div>

        <header className="draw-header">
          <div className="header-art" aria-hidden="true">
            <span className="header-orbit orbit-one" /><span className="header-orbit orbit-two" />
            <span className="header-ball ball-one">18</span><span className="header-ball ball-two">G</span>
            <div className="header-sparkles"><i /><i /><i /><i /><i /></div>
          </div>
          <div className="draw-emblem" aria-hidden="true">
            {BINGO_BALLS.map((ball) => <span style={{ "--ball-color": ball.color } as CSSProperties} key={ball.letter}>{ball.letter}</span>)}
          </div>
          <div className="draw-title">
            <small>SORTEO ESPECIAL · EN VIVO</small>
            <h1>RULETA DE LA SUERTE</h1>
            <span>ASODIFI</span>
          </div>
          <div className={`draw-live ${isSpinning ? "active" : ""} ${revealed ? "winner" : ""}`}>
            <i />
            <div><small>ESTADO</small><strong>{isSpinning ? "SORTEANDO" : revealed ? "GANADOR" : "PREPARADA"}</strong></div>
          </div>
          <div className="header-steps" aria-hidden="true"><span>01 · MUNICIPIO</span><i /><span>02 · CARTÓN</span><i /><span>GANADOR</span></div>
        </header>

        <main className="draw-content">
          <section className="wheel-zone" aria-label="Ruleta de selección">
            <div className="wheel-shell">
              <div className="wheel-shadow" aria-hidden="true" />
              <div className="wheel-marks" aria-hidden="true">
                {Array.from({ length: WHEEL_MARKS }, (_, index) => <i style={{ "--mark": index } as CSSProperties} key={index} />)}
              </div>
              <div className="wheel-face">
                <span className="wheel-rays" aria-hidden="true" />
                <span className="wheel-ring outer" aria-hidden="true" />
                <span className="wheel-ring inner" aria-hidden="true" />
                <div className="orbit-balls" aria-hidden="true">
                  {BINGO_BALLS.map((ball, index) => (
                    <span style={{ "--ball-color": ball.color, "--ball-index": index } as CSSProperties} key={ball.letter}>{ball.letter}</span>
                  ))}
                </div>
                <div className="wheel-core">
                  <small>SUERTE</small>
                  <strong>BINGO</strong>
                  <span>ASODIFI</span>
                </div>
              </div>
              <span className="wheel-pointer" aria-hidden="true"><i /></span>
            </div>

            <div className="selection-route">
              <div className={`${!municipioSettled && isSpinning ? "active" : ""} ${municipioSettled ? "done" : ""}`}>
                <span>1</span><p><small>PRIMERA SELECCIÓN</small><strong>MUNICIPIO</strong></p><i />
              </div>
              <b aria-hidden="true" />
              <div className={`${municipioSettled && isSpinning && !cardSettled ? "active" : ""} ${cardSettled ? "done" : ""}`}>
                <span>2</span><p><small>SELECCIÓN FINAL</small><strong>NÚMERO</strong></p><i />
              </div>
            </div>
          </section>

          <section className="results-zone" aria-live="polite">
            <article className={`result-panel municipality ${municipioSettled ? "settled" : ""} ${isSpinning && !municipioSettled ? "rolling" : ""}`}>
              <header><span>01</span><div><small>PRIMERA FASE</small><strong>MUNICIPIO</strong></div><em>{municipioStatus}</em></header>
              <div className="result-screen">
                <span className="screen-grid" aria-hidden="true" />
                <span className="screen-scan" aria-hidden="true" />
                <small>UBICACIÓN SELECCIONADA</small>
                <strong className={municipioLong ? "long" : ""}>{municipioValue}</strong>
              </div>
            </article>

            <div className={`phase-connector ${municipioSettled ? "ready" : ""}`} aria-hidden="true">
              <span /><i /><i /><i /><span />
            </div>

            <article className={`result-panel card ${cardSettled ? "settled" : ""} ${isSpinning && municipioSettled && !cardSettled ? "rolling" : ""}`}>
              <header><span>02</span><div><small>SEGUNDA FASE</small><strong>NÚMERO GANADOR</strong></div><em>{cardStatus}</em></header>
              <div className="result-screen number-screen">
                <span className="screen-grid" aria-hidden="true" />
                <span className="screen-scan" aria-hidden="true" />
                <small>CARTÓN SELECCIONADO</small>
                <div className="number-digits">
                  {Array.from(cardValue).map((digit, index) => <b className={digit === "—" ? "empty" : ""} key={`${digit}-${index}`}>{digit}</b>)}
                </div>
              </div>
            </article>
          </section>
        </main>

        <footer className="draw-footer">
          <div className="footer-state"><i /><span>{isSpinning ? "El sistema está seleccionando un ganador" : revealed ? "Selección completada" : "Lista para iniciar el sorteo"}</span></div>
          <div className="phase-progress" aria-hidden="true"><i className={municipioSettled ? "done" : isSpinning ? "active" : ""} /><i className={cardSettled ? "done" : municipioSettled && isSpinning ? "active" : ""} /></div>
          <div className="signal-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </footer>
      </section>
    </SlotMachineStyle>
  );
};

export default SlotMachine;

const SlotMachineStyle = styled.div`
  width:100%;
  height:100%;
  min-height:0;
  color:#fff;

  .draw-stage{position:relative;display:grid;width:100%;height:100%;min-height:480px;grid-template-rows:clamp(120px,19vh,220px) minmax(0,1fr); max-content;gap:clamp(9px,1vh,14px);padding:clamp(16px,1.5vw,26px);overflow:hidden;background:radial-gradient(circle at 20% 42%,rgba(122,72,239,.24),transparent 35%),radial-gradient(circle at 85% 18%,rgba(255,75,169,.17),transparent 30%),radial-gradient(circle at 70% 90%,rgba(52,226,210,.12),transparent 32%),linear-gradient(145deg,#241052,#0e1235 54%,#201047);border:2px solid rgba(255,210,84,.72);border-radius:32px;box-shadow:inset 0 0 0 4px rgba(255,255,255,.035),inset 0 0 80px rgba(128,72,232,.08),0 28px 65px rgba(5,2,24,.55);isolation:isolate}
  .draw-stage::before{position:absolute;inset:8px;z-index:-1;content:"";border:1px solid rgba(255,255,255,.1);border-radius:24px;pointer-events:none}
  .draw-stage::after{position:absolute;right:-12%;bottom:-42%;z-index:-2;width:72%;aspect-ratio:1;content:"";background:repeating-conic-gradient(rgba(255,208,76,.055) 0 4deg,transparent 4deg 13deg);border-radius:50%;animation:slow-turn 38s linear infinite}
  .stage-atmosphere{position:absolute;inset:0;z-index:-2;overflow:hidden}.stage-atmosphere i{position:absolute;border:1px solid rgba(255,255,255,.06);border-radius:50%}.stage-atmosphere i:nth-child(1){top:-32%;left:-10%;width:58%;aspect-ratio:1;box-shadow:0 0 0 34px rgba(255,77,168,.025),0 0 0 70px rgba(60,226,213,.018)}.stage-atmosphere i:nth-child(2){top:28%;right:19%;width:210px;aspect-ratio:1;background:radial-gradient(circle,rgba(57,224,208,.07),transparent 67%)}.stage-atmosphere i:nth-child(3){right:-8%;bottom:-10%;width:38%;aspect-ratio:1;box-shadow:0 0 0 28px rgba(165,93,255,.03)}
  .stage-balls{position:absolute;inset:0;z-index:0;pointer-events:none}.stage-balls i{position:absolute;z-index:0;display:grid;width:34px;aspect-ratio:1;place-items:center;color:#fff;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ff73b6 24%,#bd3f98 63%,#482769);border:2px solid rgba(255,255,255,.8);border-radius:50%;box-shadow:0 8px 18px rgba(4,2,24,.35),0 0 15px rgba(255,89,169,.2);font-size:.48rem;font-style:normal;font-weight:900;animation:ball-float 3.4s ease-in-out infinite alternate}.stage-balls i:nth-child(1){top:18%;left:2%}.stage-balls i:nth-child(2){top:8%;right:29%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ffdf75 24%,#e87e4c 63%,#74315c);animation-delay:-.8s}.stage-balls i:nth-child(3){right:1.4%;bottom:20%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#70ecdc 24%,#289ba7 63%,#2d3f72);animation-delay:-1.6s}.stage-balls i:nth-child(4){bottom:5%;left:41%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ab95ff 24%,#6f52d2 63%,#372969);animation-delay:-2.3s}

  .draw-header{position:relative;z-index:3;display:grid;height:100%;grid-template-columns:auto 1fr auto;align-items:center;gap:clamp(12px,1.25vw,20px);overflow:hidden;padding:8px clamp(13px,1.15vw,19px);background:linear-gradient(100deg,rgba(29,22,77,.97),rgba(72,30,124,.92) 42%,rgba(96,32,124,.86) 58%,rgba(24,21,70,.97));border:1px solid rgba(117,233,221,.38);border-radius:18px;box-shadow:inset 0 1px rgba(255,255,255,.11),0 10px 22px rgba(7,2,30,.28);isolation:isolate}
  .draw-header::before{position:absolute;top:-120%;left:27%;z-index:-1;width:46%;height:340%;content:"";background:radial-gradient(ellipse,rgba(255,91,177,.21),rgba(142,73,233,.08) 48%,transparent 72%);transform:rotate(-5deg)}.draw-header::after{position:absolute;right:9%;bottom:0;left:9%;height:3px;content:"";background:linear-gradient(90deg,transparent,#ff5cac,#ffd45a,#48dfd2,transparent);box-shadow:0 0 10px rgba(255,196,70,.38)}
  .header-art{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}.header-art::before{position:absolute;top:50%;left:50%;content:"ASODIFI";color:rgba(255,255,255,.032);font-size:clamp(4rem,8vw,9rem);font-weight:1000;letter-spacing:.12em;transform:translate(-48%,-50%)}.header-orbit{position:absolute;border:1px solid rgba(255,219,102,.13);border-radius:50%;box-shadow:0 0 0 18px rgba(73,227,213,.018)}.orbit-one{top:-54%;left:17%;width:31%;height:190%;transform:rotate(-13deg)}.orbit-two{right:15%;bottom:-72%;width:30%;height:190%;border-color:rgba(255,87,173,.12);transform:rotate(16deg)}.header-ball{position:absolute;display:grid;width:27px;aspect-ratio:1;place-items:center;color:#fff;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ffdd72 24%,#ed8650 62%,#74305d);border:2px solid rgba(255,255,255,.8);border-radius:50%;box-shadow:0 6px 13px rgba(5,2,25,.32),0 0 11px rgba(255,194,53,.22);font-size:.42rem;font-weight:900;animation:header-ball-float 3s ease-in-out infinite alternate}.header-ball.ball-one{top:13%;left:21%}.header-ball.ball-two{right:20%;bottom:15%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#72ecde 24%,#279ea9 62%,#303c72);animation-delay:-1.4s}.header-sparkles i{position:absolute;width:5px;aspect-ratio:1;background:#ffe071;box-shadow:0 0 8px #ffd456;transform:rotate(45deg);animation:header-spark 2s steps(2) infinite}.header-sparkles i:nth-child(1){top:18%;left:37%}.header-sparkles i:nth-child(2){top:25%;right:35%;background:#55e4d7;box-shadow:0 0 8px #55e4d7;animation-delay:-.4s}.header-sparkles i:nth-child(3){bottom:18%;left:31%;background:#ff62ae;box-shadow:0 0 8px #ff62ae;animation-delay:-.8s}.header-sparkles i:nth-child(4){right:29%;bottom:24%;animation-delay:-1.2s}.header-sparkles i:nth-child(5){top:50%;right:12%;background:#8e77ff;box-shadow:0 0 8px #8e77ff;animation-delay:-1.6s}
  .header-steps{display:none}
  .draw-emblem,.draw-title,.draw-live{position:relative;z-index:1}.draw-emblem{display:flex;gap:4px;padding-right:14px;border-right:1px solid rgba(255,255,255,.1)}.draw-emblem span{display:grid;width:clamp(23px,1.75vw,32px);aspect-ratio:1;place-items:center;color:#fff;background:radial-gradient(circle at 32% 25%,#fff 0 6%,var(--ball-color) 27%,#4d2d84 92%);border:2px solid rgba(255,255,255,.72);border-radius:50%;box-shadow:0 4px 10px rgba(7,2,29,.3);font-size:clamp(.48rem,.58vw,.66rem);font-weight:900}.draw-emblem span:nth-child(2),.draw-emblem span:nth-child(4){transform:translateY(3px)}
  .draw-title{display:flex;min-width:0;align-items:center;justify-content:center;flex-direction:column;text-align:center}.draw-title>small{color:#67eadb;font-size:clamp(.34rem,.42vw,.5rem);font-weight:900;letter-spacing:.18em}.draw-title h1{margin:.12rem 0 0;color:#fff2a5;font-size:clamp(1.08rem,1.62vw,1.85rem);font-weight:1000;line-height:1;letter-spacing:.055em;text-shadow:0 0 18px rgba(255,199,61,.3),0 4px 10px rgba(30,5,49,.46)}.draw-title>span{margin-top:.15rem;color:#fff;font-size:clamp(.4rem,.48vw,.56rem);font-weight:900;letter-spacing:.32em}
  .draw-live{display:flex;min-width:122px;align-items:center;gap:9px;padding:.5rem .65rem;background:rgba(8,9,36,.42);border:1px solid rgba(255,255,255,.09);border-radius:12px}.draw-live>i{width:9px;aspect-ratio:1;background:#81799d;border-radius:50%;box-shadow:0 0 0 4px rgba(129,121,157,.1)}.draw-live>div{display:flex;flex-direction:column}.draw-live small{color:#9188ab;font-size:.32rem;font-weight:800;letter-spacing:.14em}.draw-live strong{margin-top:2px;color:#d8d3e2;font-size:.54rem;letter-spacing:.07em}.draw-live.active>i{background:#ffce54;box-shadow:0 0 0 4px rgba(255,206,84,.12),0 0 11px #ffce54;animation:status-pulse .7s ease-in-out infinite alternate}.draw-live.active strong{color:#fff0a5}.draw-live.winner>i{background:#4ce1cf;box-shadow:0 0 0 4px rgba(76,225,207,.12),0 0 11px #4ce1cf}.draw-live.winner strong{color:#7df3e6}

  .draw-content{position:relative;z-index:2;display:grid;min-height:0;grid-template-columns:minmax(285px,.82fr) minmax(420px,1.18fr);gap:clamp(16px,1.6vw,26px)}
  .wheel-zone{display:grid;min-height:0;grid-template-rows:minmax(0,1fr) auto;align-items:center;gap:12px;padding:clamp(12px,1vw,18px);background:linear-gradient(155deg,rgba(75,39,144,.34),rgba(12,15,49,.66));border:1px solid rgba(151,113,255,.25);border-radius:25px;box-shadow:inset 0 1px rgba(255,255,255,.07)}
  .wheel-shell{position:relative;width:min(100%,440px);max-height:100%;aspect-ratio:1;place-self:center;border-radius:50%;filter:drop-shadow(0 20px 22px rgba(5,2,25,.4))}
  .wheel-shadow{position:absolute;inset:7%;background:#120b38;border-radius:50%;box-shadow:0 0 0 9px rgba(249,186,57,.22),0 0 42px rgba(151,81,255,.35)}
  .wheel-marks{position:absolute;inset:0;animation:slow-turn 34s linear infinite}.wheel-marks i{position:absolute;inset:0;transform:rotate(calc(var(--mark) * 10deg))}.wheel-marks i::before{position:absolute;top:1%;left:calc(50% - 2px);width:4px;height:12px;content:"";background:#ffe47f;border-radius:4px;box-shadow:0 0 7px rgba(255,212,82,.72)}
  .wheel-face{position:absolute;inset:7%;overflow:hidden;background:radial-gradient(circle at 50% 50%,#35196d 0 17%,#1a124d 18% 48%,#30145f 49% 70%,#120a35 71%);border:4px solid #ffd45c;border-radius:50%;box-shadow:inset 0 0 0 5px rgba(255,255,255,.12),inset 0 0 42px rgba(6,3,30,.82),0 0 0 5px rgba(197,84,217,.55),0 0 26px rgba(255,91,176,.28)}
  .wheel-rays{position:absolute;inset:-16%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.075) 0 4deg,transparent 4deg 15deg);animation:reverse-turn 26s linear infinite}.wheel-ring{position:absolute;border:1px solid rgba(255,255,255,.12);border-radius:50%}.wheel-ring.outer{inset:14%;box-shadow:0 0 0 15px rgba(89,223,215,.025)}.wheel-ring.inner{inset:32%;border-color:rgba(255,211,85,.24);border-style:dashed}
  .orbit-balls{position:absolute;inset:0;animation:slow-turn 12s linear infinite}.orbit-balls span{position:absolute;top:8%;left:calc(50% - 20px);display:grid;width:clamp(34px,4vw,54px);aspect-ratio:1;place-items:center;color:#fff;background:radial-gradient(circle at 32% 22%,#fff 0 7%,var(--ball-color) 25%,#563078 92%);border:3px solid rgba(255,255,255,.86);border-radius:50%;box-shadow:inset -4px -5px 8px rgba(31,7,58,.22),0 8px 15px rgba(5,2,25,.36),0 0 11px var(--ball-color);font-size:clamp(.65rem,1vw,1rem);font-weight:900;transform:rotate(calc(var(--ball-index) * 72deg));transform-origin:20px clamp(120px,14vw,170px)}
  .wheel-core{position:absolute;top:50%;left:50%;display:flex;width:40%;aspect-ratio:1;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(circle at 35% 25%,#fff9c6,#ffd351 38%,#e66e58 72%,#7b2d7e);border:5px solid #fff3ae;border-radius:50%;box-shadow:0 0 0 7px rgba(255,183,50,.18),0 12px 25px rgba(8,3,31,.48),0 0 35px rgba(255,183,55,.28);transform:translate(-50%,-50%)}.wheel-core small{color:#7d2b59;font-size:clamp(.38rem,.5vw,.58rem);font-weight:900;letter-spacing:.18em}.wheel-core strong{color:#51204f;font-size:clamp(1.2rem,2.25vw,2.6rem);line-height:1;text-shadow:0 2px rgba(255,255,255,.35)}.wheel-core span{margin-top:3px;color:#7d2b59;font-size:clamp(.33rem,.43vw,.5rem);font-weight:900;letter-spacing:.12em}
  .wheel-pointer{position:absolute;top:1%;left:50%;z-index:4;width:48px;height:54px;transform:translateX(-50%);filter:drop-shadow(0 6px 8px rgba(6,2,28,.45))}.wheel-pointer::before{position:absolute;inset:0;content:"";background:linear-gradient(145deg,#fff5ab,#ffbd38 55%,#d85965);clip-path:polygon(0 0,100% 0,50% 100%)}.wheel-pointer i{position:absolute;top:8px;left:18px;width:12px;aspect-ratio:1;background:#fff7ca;border-radius:50%;box-shadow:0 0 8px #fff}
  .is-spinning .wheel-face{animation:wheel-kick .8s ease-in-out infinite alternate}.is-spinning .orbit-balls{animation-duration:1.45s}.is-spinning .wheel-rays{animation-duration:4s}.is-spinning .wheel-marks{animation-duration:5s}

  .selection-route{display:grid;grid-template-columns:1fr 34px 1fr;align-items:center;gap:7px}.selection-route>div{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:9px 10px;background:rgba(13,13,48,.55);border:1px solid rgba(255,255,255,.09);border-radius:13px}.selection-route>div>span{display:grid;width:28px;aspect-ratio:1;place-items:center;color:#bbb3cc;background:#31265b;border-radius:9px;font-size:.64rem;font-weight:900}.selection-route p{display:flex;min-width:0;flex-direction:column;margin:0}.selection-route p small{color:#837a9d;font-size:.28rem;font-weight:800;letter-spacing:.08em}.selection-route p strong{margin-top:2px;color:#d8d2e2;font-size:.53rem;letter-spacing:.06em}.selection-route div>i{width:7px;aspect-ratio:1;background:#6c6485;border-radius:50%}.selection-route>b{height:3px;background:linear-gradient(90deg,#58458c,#ffcb4e,#58458c);border-radius:4px}.selection-route>div.active{border-color:rgba(255,205,76,.5);box-shadow:0 0 18px rgba(255,194,52,.1)}.selection-route>div.active>span{color:#51204d;background:linear-gradient(145deg,#fff4a7,#ffbd3e)}.selection-route>div.active>i{background:#ffd055;box-shadow:0 0 9px #ffd055;animation:status-pulse .6s infinite alternate}.selection-route>div.done{border-color:rgba(67,226,208,.36)}.selection-route>div.done>span{color:#113f45;background:linear-gradient(145deg,#8affed,#34c9c1)}.selection-route>div.done>i{background:#4ce1cf;box-shadow:0 0 8px #4ce1cf}

  .results-zone{display:grid;min-height:0;grid-template-rows:minmax(0,1fr) 38px minmax(0,1.08fr);gap:5px}
  .result-panel{position:relative;display:grid;min-height:0;grid-template-rows:auto minmax(0,1fr);padding:10px;background:linear-gradient(145deg,rgba(61,30,116,.88),rgba(15,18,55,.94));border:1px solid rgba(145,105,238,.34);border-radius:23px;box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 28px rgba(6,2,27,.28);transition:border-color .35s,box-shadow .35s}.result-panel>header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:2px 5px 9px}.result-panel>header>span{display:grid;width:34px;aspect-ratio:1;place-items:center;color:#d5cbe6;background:#31245f;border:1px solid rgba(255,255,255,.1);border-radius:10px;font-size:.62rem;font-weight:900}.result-panel>header>div{display:flex;flex-direction:column}.result-panel>header small{color:#81789b;font-size:.32rem;font-weight:800;letter-spacing:.12em}.result-panel>header strong{margin-top:2px;color:#f2edf7;font-size:clamp(.62rem,.85vw,.92rem);letter-spacing:.075em}.result-panel>header em{padding:.35rem .48rem;color:#8f87a8;background:rgba(5,6,27,.3);border:1px solid rgba(255,255,255,.07);border-radius:8px;font-size:.34rem;font-style:normal;font-weight:900;letter-spacing:.08em}
  .result-screen{position:relative;display:flex;min-height:0;align-items:center;justify-content:center;flex-direction:column;gap:clamp(5px,.7vh,9px);overflow:hidden;padding:clamp(12px,1.4vw,22px);background:radial-gradient(circle at 50% 50%,rgba(111,74,214,.2),transparent 62%),linear-gradient(145deg,#0f173d,#121039 70%,#27104b);border:2px solid rgba(128,101,221,.45);border-radius:16px;box-shadow:inset 0 0 0 3px rgba(4,5,25,.4),inset 0 0 34px rgba(4,3,27,.52)}.screen-grid{position:absolute;inset:0;background:linear-gradient(rgba(117,234,220,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(117,234,220,.04) 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(90deg,transparent,#000 25% 75%,transparent)}.screen-scan{position:absolute;right:0;left:0;height:30%;background:linear-gradient(transparent,rgba(94,236,218,.08),transparent);animation:screen-scan 3.6s linear infinite}.result-screen>small{position:relative;color:#6fe8dc;font-size:clamp(.38rem,.5vw,.58rem);font-weight:900;letter-spacing:.16em}.result-screen>strong{position:relative;max-width:96%;color:#fff3aa;font-size:clamp(1.55rem,3.3vw,3.9rem);font-weight:1000;line-height:1;text-align:center;text-shadow:0 0 22px rgba(255,202,62,.25),0 6px 13px rgba(6,2,28,.48);text-wrap:balance}.result-screen>strong.long{font-size:clamp(1.25rem,2.65vw,3.05rem)}
  .number-screen{background:radial-gradient(circle at 50% 52%,rgba(255,185,54,.13),transparent 55%),linear-gradient(145deg,#17123e,#26104c)}.number-digits{position:relative;display:flex;max-width:100%;align-items:center;justify-content:center;gap:clamp(7px,.9vw,13px)}.number-digits b{display:grid;min-width:clamp(52px,5.5vw,78px);height:clamp(74px,8.4vh,106px);place-items:center;color:#4f1e4c;background:linear-gradient(160deg,#fff9c8,#ffd34f 55%,#f28452);border:3px solid #fff5b1;border-radius:17px;box-shadow:inset 0 -12px rgba(173,63,81,.12),0 8px 16px rgba(5,2,25,.34),0 0 18px rgba(255,188,47,.16);font-size:clamp(2.3rem,5.2vw,5.9rem);line-height:1;text-shadow:0 2px rgba(255,255,255,.35)}.number-digits b.empty{min-width:120px;color:#8d83a6;background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.12);box-shadow:none}
  .result-panel.rolling{border-color:rgba(255,205,71,.5);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 28px rgba(6,2,27,.28),0 0 24px rgba(255,187,49,.1)}.result-panel.rolling header em{color:#fff0a0;border-color:rgba(255,205,70,.22)}.result-panel.rolling .result-screen>strong,.result-panel.rolling .number-digits{animation:reel-roll .12s linear infinite}.result-panel.settled{border-color:rgba(70,226,208,.62);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 28px rgba(6,2,27,.28),0 0 27px rgba(63,225,207,.12)}.result-panel.settled>header>span{color:#123e44;background:linear-gradient(145deg,#8bffee,#3bcac2)}.result-panel.settled header em{color:#79eddf;border-color:rgba(67,224,207,.25)}.result-panel.settled .result-screen{border-color:rgba(73,229,211,.58);animation:settle .48s cubic-bezier(.2,.85,.25,1)}
  .phase-connector{display:flex;align-items:center;justify-content:center;gap:7px}.phase-connector span{width:28%;height:2px;background:linear-gradient(90deg,transparent,#7663aa)}.phase-connector span:last-child{background:linear-gradient(90deg,#7663aa,transparent)}.phase-connector i{width:9px;aspect-ratio:1;background:#4a3e70;border:1px solid rgba(255,255,255,.15);border-radius:50%}.phase-connector.ready i{background:#50dfcf;box-shadow:0 0 8px rgba(75,225,208,.68)}.phase-connector.ready i:nth-of-type(2){animation:connector-pulse .8s infinite alternate}

  .draw-footer{position:relative;z-index:3;display:grid;grid-template-columns:1fr minmax(160px,32%) auto;align-items:center;gap:16px;padding:10px 14px;background:rgba(10,9,38,.58);border:1px solid rgba(255,255,255,.09);border-radius:15px}.footer-state{display:flex;align-items:center;gap:9px}.footer-state>i{width:8px;aspect-ratio:1;background:#756d8e;border-radius:50%}.footer-state span{color:#bcb5ca;font-size:clamp(.45rem,.58vw,.66rem);font-weight:700;letter-spacing:.04em}.is-spinning .footer-state>i{background:#ffd051;box-shadow:0 0 9px #ffd051;animation:status-pulse .65s infinite alternate}.is-win .footer-state>i{background:#4be1cf;box-shadow:0 0 9px #4be1cf}.is-win .footer-state span{color:#7cf1e4}.phase-progress{display:grid;grid-template-columns:1fr 1fr;gap:6px}.phase-progress i{height:6px;background:#302852;border-radius:8px}.phase-progress i.active{background:linear-gradient(90deg,#6d4bcb,#ffd052);box-shadow:0 0 9px rgba(255,203,68,.3);animation:progress-live .8s infinite alternate}.phase-progress i.done{background:linear-gradient(90deg,#43d3c8,#78f2df)}.signal-bars{display:flex;height:22px;align-items:flex-end;gap:3px}.signal-bars i{width:4px;height:30%;background:#776b96;border-radius:3px}.signal-bars i:nth-child(2){height:48%}.signal-bars i:nth-child(3){height:68%}.signal-bars i:nth-child(4){height:86%}.signal-bars i:nth-child(5){height:100%}.is-spinning .signal-bars i{background:#ffd15a;animation:bar-live .7s ease-in-out infinite alternate}.is-spinning .signal-bars i:nth-child(2){animation-delay:-.2s}.is-spinning .signal-bars i:nth-child(3){animation-delay:-.4s}.is-spinning .signal-bars i:nth-child(4){animation-delay:-.1s}.is-spinning .signal-bars i:nth-child(5){animation-delay:-.3s}

  &.is-win .draw-stage{border-color:#65ead9;box-shadow:inset 0 0 0 4px rgba(255,255,255,.035),inset 0 0 80px rgba(67,225,208,.09),0 28px 65px rgba(5,2,24,.55),0 0 32px rgba(70,226,209,.18)}
  &.is-win .wheel-core{animation:winner-core .75s ease-in-out infinite alternate}
  @keyframes slow-turn{to{transform:rotate(360deg)}}
  @keyframes reverse-turn{to{transform:rotate(-360deg)}}
  @keyframes ball-float{to{transform:translate(8px,-14px) rotate(12deg)}}
  @keyframes status-pulse{to{opacity:.45;transform:scale(.8)}}
  @keyframes wheel-kick{to{filter:brightness(1.16) saturate(1.2)}}
  @keyframes screen-scan{from{transform:translateY(-160%)}to{transform:translateY(360%)}}
  @keyframes reel-roll{0%{opacity:.3;transform:translateY(-15px);filter:blur(2px)}50%{opacity:1;transform:translateY(0);filter:blur(0)}100%{opacity:.3;transform:translateY(15px);filter:blur(2px)}}
  @keyframes settle{0%{transform:scale(1.04)}65%{transform:scale(.99)}100%{transform:scale(1)}}
  @keyframes connector-pulse{to{opacity:.35;transform:scale(.7)}}
  @keyframes progress-live{to{filter:brightness(1.5)}}
  @keyframes bar-live{to{height:25%;opacity:.45}}
  @keyframes winner-core{to{transform:translate(-50%,-50%) scale(1.045);filter:brightness(1.14)}}
  @keyframes header-ball-float{to{transform:translateY(-10px) rotate(12deg)}}
  @keyframes header-spark{50%{opacity:.3;transform:rotate(135deg) scale(.7)}}

  /* Escala tipográfica de la fuente OBS; no modifica alturas ni la cuadrícula. */
  @media(min-width:1600px) and (min-height:900px){
    .draw-emblem{position:relative;width:225px;height:100%;align-items:center;justify-content:center;gap:7px;padding-right:22px}.draw-emblem::before{position:absolute;width:168px;height:92px;content:"";border:1px solid rgba(255,219,98,.18);border-radius:50%;box-shadow:0 0 0 14px rgba(65,226,213,.025),0 0 27px rgba(255,79,169,.1);transform:rotate(-7deg)}.draw-emblem span{z-index:1;width:40px;font-size:.8rem;box-shadow:0 6px 13px rgba(5,2,25,.34),0 0 10px var(--ball-color)}.draw-emblem span:nth-child(2),.draw-emblem span:nth-child(4){transform:translateY(9px)}
    .draw-title{padding-bottom:29px}.draw-title>small{font-size:.8rem;letter-spacing:.2em}.draw-title h1{margin-top:.38rem;font-size:3.25rem;letter-spacing:.04em;text-shadow:0 0 28px rgba(255,199,61,.43),0 7px 16px rgba(30,5,49,.5)}.draw-title>span{margin-top:.38rem;color:#fff3b3;font-size:.96rem;letter-spacing:.4em}
    .draw-live{min-width:210px;padding:.9rem 1.05rem;border-color:rgba(76,226,211,.2)}.draw-live>i{width:12px}.draw-live small{font-size:.6rem}.draw-live strong{font-size:.94rem}
    .header-ball{width:39px;font-size:.56rem}.header-ball.ball-one{top:10%;left:24%}.header-ball.ball-two{right:23%;bottom:12%}.header-sparkles i{width:7px}
    .header-steps{position:absolute;bottom:14px;left:50%;z-index:2;display:flex;align-items:center;justify-content:center;gap:12px;transform:translateX(-50%)}.header-steps span{padding:.42rem .7rem;color:#e8e2f0;background:rgba(9,9,38,.48);border:1px solid rgba(255,255,255,.11);border-radius:9px;font-size:.72rem;font-weight:900;letter-spacing:.07em;white-space:nowrap}.header-steps span:first-child{color:#76eee1;border-color:rgba(71,225,210,.25)}.header-steps span:last-child{color:#fff0a0;border-color:rgba(255,207,76,.25)}.header-steps>i{width:38px;height:3px;background:linear-gradient(90deg,#ff5baa,#ffd255,#49dfd2);border-radius:4px;box-shadow:0 0 7px rgba(255,198,62,.28)}
    .result-panel>header>span{width:42px;font-size:.82rem}.result-panel>header small{font-size:.58rem}.result-panel>header strong{font-size:1.2rem}.result-panel>header em{font-size:.58rem}.result-screen>small{font-size:.78rem}.result-screen>strong{font-size:4.4rem}.result-screen>strong.long{font-size:3.6rem}.number-digits b{font-size:6.35rem}.selection-route>div>span{width:34px;font-size:.82rem}.selection-route p small{font-size:.5rem}.selection-route p strong{font-size:.78rem}.wheel-core small{font-size:.62rem}.wheel-core strong{font-size:2.75rem}.wheel-core span{font-size:.56rem}.footer-state span{font-size:.8rem}
  }

  /* Vista previa del administrador: aislada de las proporciones de OBS. */
  &.compact{height:auto;min-height:520px}
  &.compact .draw-stage{height:520px;min-height:520px;grid-template-rows:86px minmax(0,1fr) 36px;gap:8px;padding:11px;border-radius:22px}
  &.compact .draw-stage::before{inset:6px;border-radius:17px}
  &.compact .draw-header{grid-template-columns:auto minmax(0,1fr) auto;gap:8px;padding:6px 9px;border-radius:14px}
  &.compact .header-art::before{font-size:4.5rem}
  &.compact .header-orbit{opacity:.55}
  &.compact .header-ball{width:21px;font-size:.32rem}
  &.compact .header-ball.ball-one{top:8%;left:22%}
  &.compact .header-ball.ball-two{right:21%;bottom:8%}
  &.compact .header-sparkles i{width:4px}
  &.compact .draw-emblem{width:auto;height:auto;gap:3px;padding-right:8px}
  &.compact .draw-emblem::before{display:none}
  &.compact .draw-emblem span{width:23px;border-width:1px;font-size:.43rem;box-shadow:0 3px 7px rgba(5,2,25,.3)}
  &.compact .draw-emblem span:nth-child(2),
  &.compact .draw-emblem span:nth-child(4){transform:translateY(3px)}
  &.compact .draw-title{padding:0}
  &.compact .draw-title>small{font-size:.3rem;letter-spacing:.12em}
  &.compact .draw-title h1{margin-top:.15rem;font-size:1.08rem;letter-spacing:.025em;text-shadow:0 0 12px rgba(255,199,61,.3)}
  &.compact .draw-title>span{margin-top:.16rem;font-size:.38rem;letter-spacing:.24em}
  &.compact .draw-live{min-width:84px;gap:6px;padding:.38rem .46rem;border-radius:9px}
  &.compact .draw-live>i{width:7px}
  &.compact .draw-live small{font-size:.24rem}
  &.compact .draw-live strong{font-size:.42rem}
  &.compact .header-steps{display:none}
  &.compact .draw-content{grid-template-columns:minmax(165px,.82fr) minmax(245px,1.18fr);gap:8px}
  &.compact .wheel-zone{gap:6px;padding:7px;border-radius:16px}
  &.compact .wheel-shell{width:min(100%,268px)}
  &.compact .wheel-pointer{width:34px;height:39px}
  &.compact .orbit-balls span{width:30px;border-width:2px;font-size:.52rem}
  &.compact .wheel-core{border-width:3px}
  &.compact .wheel-core small{font-size:.27rem}
  &.compact .wheel-core strong{font-size:1.25rem}
  &.compact .wheel-core span{font-size:.25rem}
  &.compact .selection-route{grid-template-columns:1fr 18px 1fr;gap:4px}
  &.compact .selection-route>div{gap:4px;padding:5px 6px;border-radius:8px}
  &.compact .selection-route>div>span{width:20px;border-radius:6px;font-size:.42rem}
  &.compact .selection-route p small{font-size:.2rem}
  &.compact .selection-route p strong{font-size:.36rem}
  &.compact .selection-route div>i{width:5px}
  &.compact .results-zone{grid-template-rows:minmax(0,1fr) 22px minmax(0,1.08fr);gap:3px}
  &.compact .result-panel{padding:5px;border-radius:15px}
  &.compact .result-panel>header{gap:5px;padding:1px 3px 5px}
  &.compact .result-panel>header>span{width:25px;border-radius:7px;font-size:.46rem}
  &.compact .result-panel>header small{font-size:.22rem}
  &.compact .result-panel>header strong{font-size:.52rem}
  &.compact .result-panel>header em{padding:.22rem .3rem;font-size:.22rem}
  &.compact .result-screen{gap:3px;padding:7px;border-radius:10px}
  &.compact .result-screen>small{font-size:.3rem}
  &.compact .result-screen>strong,
  &.compact .result-screen>strong.long{font-size:1.55rem}
  &.compact .number-digits{gap:5px}
  &.compact .number-digits b{min-width:34px;height:48px;border-width:2px;border-radius:9px;font-size:2rem}
  &.compact .number-digits b.empty{min-width:70px}
  &.compact .phase-connector{gap:4px}
  &.compact .phase-connector span{width:24%}
  &.compact .phase-connector i{width:6px}
  &.compact .draw-footer{grid-template-columns:1fr minmax(110px,30%) auto;gap:8px;padding:6px 9px;border-radius:10px}
  &.compact .footer-state{gap:6px}
  &.compact .footer-state>i{width:6px}
  &.compact .footer-state span{font-size:.38rem}
  &.compact .phase-progress i{height:4px}
  &.compact .signal-bars{height:16px}

  @media(max-width:760px){
    .draw-stage{height:auto;min-height:760px}.draw-header{grid-template-columns:1fr}.draw-emblem,.draw-live{display:none}.draw-content{grid-template-columns:1fr}.wheel-zone{min-height:310px}.wheel-shell{width:min(270px,80vw)}.results-zone{min-height:430px}.draw-footer{grid-template-columns:1fr}.phase-progress,.signal-bars{display:none}
  }
`;
