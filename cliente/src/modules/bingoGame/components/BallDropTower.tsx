import type { CSSProperties } from "react";
import styled from "styled-components";

interface BallDropTowerProps {
  drawnNumbers: number[];
  latestBall?: number;
}

const ballColors = ["54,224,207", "93,143,255", "151,98,255", "235,82,204", "255,174,70"];
const positions = [
  [18, 62], [31, 70], [44, 58], [58, 72], [70, 57], [77, 72],
  [23, 78], [38, 83], [53, 81], [68, 86], [30, 51], [61, 48],
];

const letterFor = (number?: number) => number
  ? ["B", "I", "N", "G", "O"][Math.min(4, Math.floor((number - 1) / 15))]
  : "—";

const BallDropTower: React.FC<BallDropTowerProps> = ({ drawnNumbers, latestBall }) => {
  const remaining = Array.from({ length: 75 }, (_, index) => index + 1)
    .filter((number) => !drawnNumbers.includes(number));
  const visibleBalls = remaining.slice(-12);

  return <MachineStyle>
    <div className="machine-glow" aria-hidden="true" />
    <div className="drum-frame">
      <div className="drum-crown"><i /><strong>{remaining.length}</strong><i /></div>
      <div className="drum-glass">
        <div className="drum-rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="airflow" aria-hidden="true"><i /><i /><i /></div>
        <div className="rotor"><i /><b /><i /><b /></div>
        {visibleBalls.map((number, index) => {
          const [x, y] = positions[index];
          const color = ballColors[Math.min(4, Math.floor((number - 1) / 15))];
          const driftX = ((index % 3) - 1) * (10 + (index % 4) * 2);
          const driftY = 13 + (index % 4) * 4;
          return <span className="mix-ball" style={{ "--x": `${x}%`, "--y": `${y}%`, "--mix-rgb": color, "--delay": `${index * -.16}s`, "--drift-x": `${driftX}px`, "--drift-y": `${driftY}px` } as CSSProperties} key={number}>{number}</span>;
        })}
        <span className="glass-shine" />
      </div>
      <div className="drum-hinge left" /><div className="drum-hinge right" />
    </div>

    <div className="delivery-track">
      <div className="track-glass"><i /><i /></div>
      <span className="tube-clamp clamp-one" /><span className="tube-clamp clamp-two" /><span className="tube-clamp clamp-three" />
      {latestBall && <span className="travel-ball" key={latestBall}><small>{letterFor(latestBall)}</small><strong>{latestBall}</strong></span>}
      <div className="exit-light" />
    </div>

    <div className="machine-console">
      <i className="console-light pink" /><i className="console-light cyan" />
      <div className="console-meter"><span style={{ width: `${(remaining.length / 75) * 100}%` }} /></div>
      <strong>{remaining.length}<small> RESTANTES</small></strong>
    </div>
  </MachineStyle>;
};

export default BallDropTower;

const MachineStyle = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  filter: drop-shadow(0 22px 30px rgba(6, 2, 29, .45));

  &::before { position:absolute; top:53%; right:8%; bottom:18px; left:8%; z-index:1; content:""; background:linear-gradient(100deg,rgba(30,16,67,.9),rgba(69,29,91,.96) 48%,rgba(18,23,60,.94)); border:2px solid rgba(255,210,83,.52); border-bottom-color:#ffd35c; border-radius:34px 34px 20px 20px; box-shadow:inset 0 1px rgba(255,255,255,.12),inset 0 0 28px rgba(77,231,216,.07),0 14px 26px rgba(7,2,29,.34); clip-path:polygon(14% 0,86% 0,100% 27%,100% 100%,0 100%,0 27%); }
  &::after { position:absolute; right:16%; bottom:55px; left:16%; z-index:2; height:3px; content:""; background:linear-gradient(90deg,transparent,#ff59a8,#ffd45b,#4be3d4,transparent); border-radius:99px; box-shadow:0 0 12px rgba(255,199,63,.32); }

  .machine-glow { position:absolute; inset:4% -8% 0; z-index:-1; background:radial-gradient(circle at 50% 38%,rgba(255,78,168,.27),transparent 42%),radial-gradient(circle at 54% 78%,rgba(50,229,216,.2),transparent 45%); filter:blur(9px); animation:machine-breathe 3.2s ease-in-out infinite; }

  .drum-frame { position:absolute; top:18px; left:50%; z-index:3; width:min(31vh,292px); max-width:90%; aspect-ratio:1; transform:translateX(-50%); background:conic-gradient(from 15deg,#ff5da7,#ffd768,#ff8a52,#ff59a2,#8757e9,#49e3d3,#ff5da7); border:2px solid #fff3b3; border-radius:50%; box-shadow:inset 0 0 0 4px rgba(64,16,83,.38),inset 0 0 0 8px rgba(255,255,255,.16),0 15px 30px rgba(30,4,50,.4),0 0 26px rgba(255,90,166,.22); }
  .drum-frame::before { position:absolute; inset:11px; content:""; background:linear-gradient(145deg,rgba(255,255,255,.17),rgba(17,9,49,.2)); border:2px solid rgba(255,255,255,.62); border-radius:50%; box-shadow:inset 0 0 26px rgba(48,229,216,.12); }
  .drum-frame::after { position:absolute; top:50%; left:50%; z-index:3; width:47px; aspect-ratio:1; content:""; transform:translate(-50%,-50%); background:radial-gradient(circle at 34% 25%,#fff,#ffe782 18%,#ff8b4d 55%,#b43582); border:4px solid #fff4bc; border-radius:50%; box-shadow:0 0 0 7px rgba(255,84,163,.2),0 0 19px rgba(255,195,61,.48); }
  .drum-crown { position:absolute; top:-12px; left:50%; z-index:7; display:flex; width:104px; height:34px; align-items:center; justify-content:center; gap:8px; transform:translateX(-50%); color:#4c184b; background:linear-gradient(180deg,#fff5b9,#ffc847 54%,#ec7950); border:2px solid #fff5c3; border-radius:17px; box-shadow:0 7px 15px rgba(28,4,46,.33); font-size:.56rem; }
  .drum-crown i { width:7px; height:7px; background:#ff4e9e; border-radius:50%; box-shadow:0 0 9px #ff4e9e; }.drum-crown i:last-child{background:#4ae3d4;box-shadow:0 0 9px #4ae3d4}.drum-crown strong{font-weight:900}
  .drum-glass { position:absolute; inset:15px; z-index:2; overflow:hidden; background:radial-gradient(circle at 34% 23%,rgba(255,255,255,.3),transparent 25%),radial-gradient(circle at 67% 72%,rgba(47,228,214,.16),transparent 43%),linear-gradient(145deg,rgba(51,23,96,.93),rgba(8,12,40,.98)); border:2px solid rgba(255,255,255,.54); border-radius:50%; box-shadow:inset 0 18px 35px rgba(0,0,0,.32),inset 0 0 32px rgba(69,232,217,.12); }
  .drum-rings { position:absolute; inset:15%; animation:drum-spin 9s linear infinite; }.drum-rings i{position:absolute;inset:0;border:1px solid rgba(255,255,255,.1);border-radius:50%}.drum-rings i:nth-child(2){inset:18%;border-color:rgba(255,208,80,.16)}.drum-rings i:nth-child(3){inset:36%;border-color:rgba(61,229,215,.18)}
  .airflow { position:absolute; inset:8%; animation:drum-spin 2.8s linear infinite; }.airflow i{position:absolute;inset:13%;border:2px solid transparent;border-top-color:rgba(80,241,226,.42);border-right-color:rgba(80,241,226,.12);border-radius:50%;filter:drop-shadow(0 0 6px rgba(74,235,220,.4))}.airflow i:nth-child(2){inset:27%;border-top-color:rgba(255,211,86,.38);transform:rotate(120deg)}.airflow i:nth-child(3){inset:40%;border-top-color:rgba(255,90,168,.38);transform:rotate(235deg)}
  .rotor { position:absolute; top:50%; left:50%; width:72%; height:72%; transform:translate(-50%,-50%); animation:rotor-spin 6s linear infinite; }.rotor i,.rotor b{position:absolute;top:50%;left:50%;width:100%;height:5px;transform:translate(-50%,-50%);background:linear-gradient(90deg,transparent,rgba(255,211,91,.42),transparent);border-radius:9px}.rotor b{transform:translate(-50%,-50%) rotate(90deg);background:linear-gradient(90deg,transparent,rgba(69,231,217,.36),transparent)}.rotor i:last-of-type{transform:translate(-50%,-50%) rotate(45deg)}.rotor b:last-child{transform:translate(-50%,-50%) rotate(135deg)}
  .mix-ball { position:absolute; left:var(--x); top:var(--y); z-index:4; display:grid; width:30px; aspect-ratio:1; place-items:center; transform:translate(-50%,-50%); color:#fff; background:radial-gradient(circle at 32% 22%,#fff 0 7%,rgba(var(--mix-rgb),1) 27%,rgba(var(--mix-rgb),.88) 65%,#612672); border:2px solid rgba(255,255,255,.88); border-radius:50%; box-shadow:inset -3px -4px 7px rgba(33,5,58,.2),0 5px 10px rgba(0,0,0,.3),0 0 10px rgba(var(--mix-rgb),.24); font-size:.4rem; font-weight:900; animation:turbine-tumble 1.35s var(--delay) cubic-bezier(.45,.05,.55,.95) infinite; }
  .glass-shine { position:absolute; top:8%; left:18%; width:14%; height:46%; background:linear-gradient(rgba(255,255,255,.5),transparent); border-radius:50%; transform:rotate(28deg); filter:blur(1px); }
  .drum-hinge { position:absolute; top:45%; z-index:6; width:25px; height:49px; background:linear-gradient(90deg,#8e2f74,#ff68aa,#ffd665); border:2px solid #fff0a0; box-shadow:0 5px 10px rgba(22,4,42,.3); }.drum-hinge.left{left:-10px;border-radius:12px 3px 3px 12px}.drum-hinge.right{right:-10px;border-radius:3px 12px 12px 3px;transform:scaleX(-1)}

  .delivery-track { position:absolute; right:-5px; bottom:calc(100% - 174px); z-index:6; width:172px; height:65vh; border-top:16px solid #ff5b9f; border-right:16px solid #ff5b9f; border-radius:0 72px 0 0; box-shadow:4px -4px 0 #ffd45d,8px -8px 0 rgba(255,255,255,.15),0 0 24px rgba(255,82,158,.22); pointer-events:none; }
  .delivery-track::before { position:absolute; right:-16px; bottom:-14px; width:105px; height:16px; content:""; background:linear-gradient(90deg,#ffd45d,#ff5b9f); border-radius:12px 0 0 12px; box-shadow:0 4px 0 rgba(255,255,255,.14); }
  .delivery-track::after { position:absolute; top:-25px; left:-15px; width:48px; height:48px; content:""; background:radial-gradient(circle,#fff5a9 0 8%,rgba(255,197,57,.42) 28%,transparent 70%); animation:exit-pulse 1.4s ease-in-out infinite; }
  .track-glass { position:absolute; inset:0; overflow:hidden; border-top:8px solid rgba(255,255,255,.34); border-right:8px solid rgba(255,255,255,.34); border-radius:0 62px 0 0; box-shadow:inset -8px 8px 20px rgba(57,230,216,.18); }.track-glass i{position:absolute;right:-4px;bottom:-35px;width:8px;height:42px;background:linear-gradient(transparent,#69f5e7,transparent);border-radius:50%;box-shadow:0 0 12px #69f5e7;animation:riser-energy 1.5s linear infinite}.track-glass i:last-child{top:-4px;right:-35px;width:42px;height:8px;animation:top-energy 1.5s .9s linear infinite}
  .travel-ball { position:absolute; right:-38px; bottom:-26px; z-index:8; display:flex; width:28px; aspect-ratio:1; align-items:center; justify-content:center; flex-direction:column; color:#491b49; background:radial-gradient(circle at 32% 21%,#fff 0 8%,#fff4ae 22%,#ffd154 56%,#ef7254 82%); border:2px solid #fff8d0; border-radius:50%; box-shadow:0 0 0 2px rgba(255,177,50,.16),0 0 12px rgba(255,170,44,.56),0 5px 9px rgba(35,6,48,.28); animation:ball-rise 2s linear forwards; will-change:transform; }.travel-ball small{font-size:.17rem;line-height:1}.travel-ball strong{font-size:.46rem;line-height:1}
  .exit-light { position:absolute; top:-30px; left:-32px; width:48px; height:48px; background:radial-gradient(circle,#fff4a8,rgba(255,191,58,.4) 36%,transparent 70%); animation:exit-pulse 1.4s ease-in-out infinite; }

  .machine-console { position:absolute; right:4%; bottom:0; left:4%; z-index:7; display:grid; height:58px; grid-template-columns:auto 1fr auto auto; align-items:center; gap:8px; padding:0 12px; background:linear-gradient(180deg,#633071,#2b1648 58%,#130c2b); border:2px solid #ffd35c; border-radius:16px 16px 24px 24px; box-shadow:inset 0 1px rgba(255,255,255,.18),0 9px 18px rgba(18,3,39,.34); }.machine-console::before{position:absolute;top:-23px;left:50%;width:42%;height:24px;content:"";transform:translateX(-50%);background:linear-gradient(90deg,#24123f,#713271 50%,#24123f);border:2px solid rgba(255,211,92,.58);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:inset 0 1px rgba(255,255,255,.12)}.console-light{position:relative;width:8px;height:8px;background:#ff57a1;border-radius:50%;box-shadow:0 0 9px #ff57a1}.console-light.cyan{background:#4ae4d5;box-shadow:0 0 9px #4ae4d5}.console-meter{position:relative;height:8px;overflow:hidden;background:#0c0921;border:1px solid rgba(255,255,255,.1);border-radius:8px}.console-meter span{display:block;height:100%;background:linear-gradient(90deg,#ff54a5,#ffd45a,#4ae4d5);border-radius:inherit}.machine-console strong{position:relative;color:#fff1a0;font-size:.62rem}.machine-console small{color:#9c91af;font-size:.28rem}

  /* Conducto de vidrio: doble pared, reflejos y abrazaderas metálicas. */
  .delivery-track { border-top:48px solid #d19a3b; border-right:48px solid #d19a3b; border-radius:0 108px 0 0; box-shadow:none; filter:drop-shadow(0 9px 13px rgba(24,5,48,.36)) drop-shadow(0 0 8px rgba(255,201,65,.12)); }
  .delivery-track::before { right:-48px; bottom:-36px; box-sizing:border-box; width:144px; height:48px; background:linear-gradient(180deg,rgba(210,247,248,.38) 0 7px,rgba(18,31,57,.94) 7px 100%); border:4px solid #d19a3b; border-top-color:#ffe081; border-bottom-color:#744247; border-radius:24px 4px 4px 24px; box-shadow:inset 0 2px rgba(255,255,255,.16),inset 0 -3px rgba(42,18,47,.26),0 9px 14px rgba(26,5,46,.3),0 0 8px rgba(255,199,65,.12); }
  .delivery-track::after { top:-33px; left:-24px; width:58px; height:58px; background:radial-gradient(circle,#fff8c4 0 7%,rgba(255,210,82,.45) 18%,rgba(255,255,255,.08) 40%,transparent 70%); }
  .track-glass { inset:-44px -44px 0 0; border-top:40px solid rgba(18,31,57,.94); border-right:40px solid rgba(18,31,57,.94); border-radius:0 103px 0 0; box-shadow:none; }
  .track-glass::before { position:absolute; top:12px; right:12px; bottom:12px; left:12px; content:""; border-top:7px solid rgba(214,247,248,.42); border-right:7px solid rgba(214,247,248,.42); border-radius:0 78px 0 0; filter:blur(.25px); }
  .track-glass::after { display:none; }
  .track-glass>i { display:none; }
  .tube-clamp { position:absolute; right:-67px; z-index:9; width:90px; height:19px; background:linear-gradient(180deg,#fff0a3,#d99c37 42%,#6a3762 78%,#32183d); border:2px solid #fff0a4; border-radius:10px; box-shadow:0 6px 11px rgba(28,5,47,.34),inset 0 1px rgba(255,255,255,.65),0 0 10px rgba(255,192,57,.2); }
  .tube-clamp::after { position:absolute; top:4px; right:10px; left:10px; height:4px; content:""; background:linear-gradient(90deg,#8f426f,#ffe277,#8f426f); border-radius:5px; }
  .tube-clamp.clamp-one { top:22%; }.tube-clamp.clamp-two { top:53%; }.tube-clamp.clamp-three { top:82%; }

  @keyframes machine-breathe{50%{opacity:.55;transform:scale(1.07)}}
  @keyframes drum-spin{to{transform:rotate(360deg)}}
  @keyframes rotor-spin{to{transform:translate(-50%,-50%) rotate(-360deg)}}
  @keyframes turbine-tumble{0%{transform:translate(-50%,-50%) rotate(0)}25%{transform:translate(calc(-50% + var(--drift-x)),calc(-50% - var(--drift-y))) rotate(95deg)}52%{transform:translate(calc(-50% - var(--drift-x)),calc(-50% + var(--drift-y))) rotate(190deg)}78%{transform:translate(calc(-50% + var(--drift-x)),calc(-50% + var(--drift-y))) rotate(270deg)}100%{transform:translate(-50%,-50%) rotate(360deg)}}
  @keyframes riser-energy{0%{bottom:-12%;opacity:0}20%{opacity:1}80%{opacity:1}100%{bottom:105%;opacity:0}}
  @keyframes top-energy{0%{right:-12%;opacity:0}20%{opacity:1}80%{opacity:1}100%{right:105%;opacity:0}}
  /* La balota sigue el centro del tubo: tramo recto, arco de 80px y salida horizontal. */
  @keyframes ball-rise{
    0%{opacity:0;transform:translate(-105px,0) rotate(-130deg) scale(.72)}
    10%{opacity:1}
    22%{transform:translate(0,0) rotate(20deg) scale(1)}
    60%{transform:translate(0,calc(-60vh + 44px)) rotate(270deg) scale(1)}
    65%{transform:translate(-6px,calc(-60vh + 13px)) rotate(300deg) scale(1)}
    70%{transform:translate(-23px,calc(-60vh - 13px)) rotate(330deg) scale(1)}
    75%{transform:translate(-49px,calc(-60vh - 30px)) rotate(360deg) scale(1)}
    80%{transform:translate(-80px,calc(-60vh - 36px)) rotate(390deg) scale(1)}
    94%{opacity:1;transform:translate(-144px,calc(-60vh - 36px)) rotate(465deg) scale(1)}
    100%{opacity:0;transform:translate(-160px,calc(-60vh - 36px)) rotate(500deg) scale(.76)}
  }
  @keyframes exit-pulse{50%{opacity:.48;transform:scale(1.18)}}
`;
