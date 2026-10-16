import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { getSponsorInitials, getSponsorUrl, isPersonSponsor, type SponsorAsset } from "../../bingoCustomization/services/sponsors.service";
import { getObsBrandingUrl, type ObsBrandingAsset } from "../../bingoCustomization/services/obsBranding.service";
import BallDropTower from "./BallDropTower";

interface BroadcastFigure {
  id: number;
  name: string;
  pattern: boolean[][];
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface ObsBroadcastStageProps {
  ballots: number[];
  figures: BroadcastFigure[];
  figureIndex: number;
  sponsors: SponsorAsset[];
  branding: ObsBrandingAsset | null;
  connection: ConnectionStatus;
  showSetupGuide: boolean;
  slotContent?: ReactNode;
  slotPhase?: "entering" | "visible" | "leaving";
}

const lanes = [
  { letter: "B", start: 1, rgb: "54, 224, 207", accent: "#36e0cf" },
  { letter: "I", start: 16, rgb: "93, 143, 255", accent: "#5d8fff" },
  { letter: "N", start: 31, rgb: "151, 98, 255", accent: "#9762ff" },
  { letter: "G", start: 46, rgb: "235, 82, 204", accent: "#eb52cc" },
  { letter: "O", start: 61, rgb: "255, 174, 70", accent: "#ffae46" },
];

const SPONSOR_LOGO_LIMIT = 6;
const SPONSOR_ROTATION_MS = 10_000;
const SPONSOR_LOGO_BATCH = 3;

const ballMeta = (number?: number) => {
  const lane = number ? lanes[Math.min(4, Math.floor((number - 1) / 15))] : undefined;
  return { letter: lane?.letter ?? "—", rgb: lane?.rgb ?? "122, 112, 160", accent: lane?.accent ?? "#7a70a0" };
};

const ObsBroadcastStage: React.FC<ObsBroadcastStageProps> = ({
  ballots,
  figures,
  figureIndex,
  sponsors,
  branding,
  slotContent,
  slotPhase = "visible",
}) => {
  const latestBall = ballots[ballots.length - 1];
  const [presentedBall, setPresentedBall] = useState<number | undefined>(latestBall);
  const latest = ballMeta(presentedBall);
  const recent = ballots.filter((number) => number !== presentedBall && number !== latestBall).slice(-3).reverse();
  const figure = figures[figureIndex];
  const progress = Math.min(100, (ballots.length / 75) * 100);
  const logoSponsors = sponsors.filter((asset) => !isPersonSponsor(asset) && asset.mediaType === "image");
  const personSponsors = sponsors.filter(isPersonSponsor);
  const [logoOffset, setLogoOffset] = useState(0);
  const [personOffset, setPersonOffset] = useState(0);
  const visibleLogos = Array.from({ length: Math.min(SPONSOR_LOGO_LIMIT, logoSponsors.length) }, (_, index) => logoSponsors[(logoOffset + index) % logoSponsors.length]);
  const activePerson = personSponsors.length ? personSponsors[personOffset % personSponsors.length] : undefined;
  const logoSignature = logoSponsors.map((asset) => asset.id).join("|");
  const personSignature = personSponsors.map((asset) => `${asset.id}:${asset.role ?? ""}`).join("|");
  const logoRotationStep = Math.min(SPONSOR_LOGO_BATCH, Math.max(1, logoSponsors.length - SPONSOR_LOGO_LIMIT));
  const sponsorLayout = String(Math.max(1, visibleLogos.length));

  // La balota grande cambia cuando termina el recorrido desde la turbina.
  useEffect(() => {
    if (latestBall === presentedBall) return;
    if (!latestBall) { setPresentedBall(undefined); return; }
    const arrival = window.setTimeout(() => setPresentedBall(latestBall), 1550);
    return () => window.clearTimeout(arrival);
  }, [latestBall, presentedBall]);

  useEffect(() => {
    setLogoOffset(0);
    if (logoSponsors.length <= SPONSOR_LOGO_LIMIT) return;

    const rotation = window.setInterval(() => {
      setLogoOffset((currentOffset) => (currentOffset + logoRotationStep) % logoSponsors.length);
    }, SPONSOR_ROTATION_MS);

    return () => window.clearInterval(rotation);
  }, [logoSponsors.length, logoRotationStep, logoSignature]);

  useEffect(() => {
    setPersonOffset(0);
    if (personSponsors.length <= 1) return;
    const rotation = window.setInterval(() => setPersonOffset((currentOffset) => (currentOffset + 1) % personSponsors.length), SPONSOR_ROTATION_MS);
    return () => window.clearInterval(rotation);
  }, [personSponsors.length, personSignature]);

  return <StageStyle className={slotContent ? `live-stage slot-live slot-${slotPhase}` : "live-stage"}>
    <div className="ambient-shapes" aria-hidden="true"><i /><i /><i /><i /></div>

    <section className={`left-channel ${branding ? "has-custom" : "uses-default"}`}>
      <div className="channel-backdrop" aria-hidden="true">
        {branding ? branding.mediaType === "video" ? <video src={getObsBrandingUrl(branding.url)} autoPlay muted loop playsInline /> : <img src={getObsBrandingUrl(branding.url)} alt="" /> : <div className="default-channel-art"><div className="channel-ribbons"><i /><i /><i /></div><div className="floating-balls"><span>B</span><span>18</span><span>N</span><span>52</span><span>O</span><span>74</span><span>G</span></div><div className="channel-stars"><i /><i /><i /><i /></div></div>}
      </div>

      <section className="sponsor-stage sponsor-wall">
        <div className="sponsor-corners" aria-hidden="true"><i /><i /><i /><i /></div>
        <header className="sponsor-wall-title"><small><i /> ALIADOS QUE HACEN POSIBLE ESTE BINGO <i /></small><strong>PATROCINADORES</strong><span /></header>
        <div className={`sponsor-content ${activePerson ? "has-person" : ""} ${visibleLogos.length ? "" : "no-logos"}`}>
          <div className={`sponsor-logo-grid logo-count-${sponsorLayout}`}>
            {visibleLogos.length ? visibleLogos.map((asset, index) => <div className="sponsor-logo" style={{ "--sponsor-order": index } as CSSProperties} title={asset.name} key={`${logoOffset}-${asset.id}`}><img src={getSponsorUrl(asset.url)} alt={asset.name} /></div>) : !activePerson && <div className="sponsor-grid-empty"><AppIcon icon="star" /><strong>Tu marca puede estar aquí</strong><small>Agrega logos o personas desde Personalización</small></div>}
          </div>
          {activePerson && <div className={`sponsor-person ${activePerson.role ? "has-role" : "particular"}`} title={activePerson.role ? `${activePerson.name} · ${activePerson.role}` : activePerson.name} key={`${personOffset}-${activePerson.id}`}>
            <div className="person-atmosphere" aria-hidden="true"><i /><i /><i /></div>
            <span className="person-medallion"><b>{getSponsorInitials(activePerson.name)}</b><i /><em><AppIcon icon="star" /></em></span>
            <div className="person-copy"><span><i /> PATROCINADOR DESTACADO <i /></span><strong>{activePerson.name}</strong>{activePerson.role && <small>{activePerson.role}</small>}</div>
            <b className="thanks-ribbon">GRACIAS POR HACERLO POSIBLE</b>
          </div>}
        </div>
        {(visibleLogos.length > 0 || activePerson) && <div className="sponsor-bingo-decor" aria-hidden="true">
          <span className="decor-ball ball-left"><small>B</small>12</span><span className="decor-ball ball-right"><small>G</small>48</span>
          {[0, 1, 2].map((cardIndex) => <div className={`decor-ticket ticket-${cardIndex + 1}`} key={cardIndex}>
            <div className="decor-ticket-head">{"BINGO".split("").map((letter) => <b key={letter}>{letter}</b>)}</div>
            <div className="decor-ticket-grid">{Array.from({ length: 25 }, (_, cellIndex) => <i className={`${cellIndex === 12 ? "free" : ""} ${(cellIndex + cardIndex * 3) % 7 === 0 ? "marked" : ""}`} key={cellIndex} />)}</div>
          </div>)}
        </div>}
      </section>
    </section>

    <aside className="info-totem">
      <section className="current-spotlight" style={{ "--ball-rgb": latest.rgb } as CSSProperties}>
        <div className="spotlight-rays" aria-hidden="true"><i /><i /><i /></div>
        <div className="current-ball" key={presentedBall ?? "empty"}><small>{latest.letter}</small><strong>{presentedBall ?? "—"}</strong><span /></div>
        <div className="recent-orbit">
          {Array.from({ length: 3 }, (_, index) => recent[index]).map((number, index) => {
            const meta = ballMeta(number);
            return <span className={!number ? "empty" : ""} style={{ "--recent-rgb": meta.rgb } as CSSProperties} key={`${number ?? "empty"}-${index}`}><small>{meta.letter}</small><b>{number ?? "·"}</b></span>;
          })}
        </div>
      </section>

      <section className="figure-medallion">
        <div className="figure-kicker"><i /> FIGURA EN JUEGO <i /></div>
        {figure ? <>
          <div className="figure-pattern" key={figure.id}>{figure.pattern.flatMap((row, rowIndex) => row.map((cell, cellIndex) => <span className={rowIndex === 2 && cellIndex === 2 ? "free" : cell ? "active" : ""} key={`${rowIndex}-${cellIndex}`}>{rowIndex === 2 && cellIndex === 2 ? <AppIcon icon="star" /> : cell ? <i /> : ""}</span>))}</div>
          <strong className="figure-title">{figure.name}</strong>
          {figures.length > 1 && <small className="figure-page">{figureIndex + 1}/{figures.length}</small>}
        </> : <div className="figure-waiting"><AppIcon icon="vector-square" /><strong>Esperando figura</strong></div>}
      </section>
    </aside>

    <section className="machine-stage"><BallDropTower drawnNumbers={ballots} latestBall={latestBall} /></section>

    <section className="score-wall">
      <div className="score-columns">
        {lanes.map((lane) => <div className="score-column" style={{ "--lane-rgb": lane.rgb, "--lane-accent": lane.accent } as CSSProperties} key={lane.letter}>
          <header><strong>{lane.letter}</strong></header>
          <div>{Array.from({ length: 15 }, (_, index) => lane.start + index).map((number) => <span className={`${ballots.includes(number) ? "drawn" : ""} ${presentedBall === number ? "latest" : ""}`} key={number}><i />{number}<b /></span>)}</div>
        </div>)}
      </div>
      <footer className="score-progress"><div><span style={{ width: `${progress}%` }} /></div><strong>{ballots.length}<small>/75</small></strong></footer>
    </section>

    {slotContent && <section className="live-slot" aria-live="polite">{slotContent}</section>}
  </StageStyle>;
};

export default ObsBroadcastStage;

const StageStyle = styled.section`
  --ink: #0c0a26;
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  grid-template-columns: minmax(0, 39%) minmax(300px, 18%) minmax(0, 43%);
  grid-template-rows: minmax(0, 63fr) minmax(0, 37fr);
  grid-template-areas: "camera info board" "sponsor machine board";
  gap: clamp(14px, 1vw, 20px);
  padding: clamp(14px, 1.05vw, 21px);
  overflow: hidden;
  color: #fff;
  background: transparent;
  isolation: isolate;

  &::before { position:absolute; top:0; right:0; bottom:0; left:calc(39% + 14px); z-index:-2; content:""; background:linear-gradient(110deg,transparent 0 28%,rgba(255,255,255,.045) 28.1% 28.35%,transparent 28.45% 69%,rgba(255,255,255,.035) 69.1% 69.3%,transparent 69.4%),radial-gradient(circle at 67% 44%,transparent 0 18%,rgba(127,81,239,.13) 18.2% 18.5%,transparent 18.7% 28%,rgba(57,226,213,.08) 28.2% 28.4%,transparent 28.6%),radial-gradient(circle at 18% 8%,rgba(255,79,170,.22),transparent 30%),radial-gradient(circle at 88% 85%,rgba(43,227,211,.18),transparent 30%),linear-gradient(137deg,#26094e,#0b0c2b 44%,#24105a); border-radius:32px 0 0 32px; }
  &::after { position:absolute; right:-13%; bottom:-36%; z-index:-1; width:58%; aspect-ratio:1; content:""; background:conic-gradient(from 210deg,rgba(255,74,164,.46),rgba(255,201,68,.16),rgba(53,228,213,.25),rgba(134,70,235,.39),rgba(255,74,164,.46)); border-radius:50%; filter:blur(36px); animation:scene-drift 13s ease-in-out infinite alternate; }
  .ambient-shapes { position:absolute; inset:0; z-index:-1; overflow:hidden; pointer-events:none; }
  .ambient-shapes i { position:absolute; display:block; border:1px solid rgba(255,255,255,.08); border-radius:50%; }
  .ambient-shapes i:nth-child(1){top:-13%;left:28%;width:28vw;aspect-ratio:1;box-shadow:0 0 0 32px rgba(255,82,169,.03),0 0 0 68px rgba(87,225,214,.022)}
  .ambient-shapes i:nth-child(2){right:-5%;top:22%;width:15vw;aspect-ratio:1;border-color:rgba(255,209,79,.13)}
  .ambient-shapes i:nth-child(3){bottom:-18%;left:5%;width:22vw;aspect-ratio:1;border-color:rgba(59,231,216,.1)}
  .ambient-shapes i:nth-child(4){top:47%;left:48%;width:7px;height:7px;background:#fff0a0;border:0;box-shadow:22px -31px #ff5ba9,41px 17px #4ce2d3,-27px 24px #9871ff;animation:sparkle 3s steps(2) infinite}

  .camera-arch { position:absolute; inset:25px; pointer-events:none; }
  .camera-arch i { position:absolute; width:54px; height:54px; border-color:#ffe782; border-style:solid; opacity:.92; }
  .camera-arch i:nth-child(1){top:0;left:0;border-width:3px 0 0 3px;border-radius:20px 0 0}
  .camera-arch i:nth-child(2){top:0;right:0;border-width:3px 3px 0 0;border-radius:0 20px 0 0}
  .camera-arch i:nth-child(3){bottom:52px;left:50%;width:120px;height:4px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#fff0a1,transparent);border:0;border-radius:8px;box-shadow:0 0 12px rgba(255,224,102,.5)}
  .studio-brand { position:absolute; top:28px; left:28px; display:flex; align-items:center; gap:.72rem; padding:.54rem .82rem; background:linear-gradient(108deg,rgba(113,45,220,.95),rgba(228,54,148,.94)); border:1px solid rgba(255,255,255,.32); border-radius:17px; box-shadow:0 12px 27px rgba(32,6,74,.33),inset 0 1px rgba(255,255,255,.22); backdrop-filter:blur(13px); }
  .studio-brand>span { display:grid; width:42px; height:42px; place-items:center; color:#501c4e; background:linear-gradient(145deg,#fff7bd,#ffc348 60%,#ff8a5a); border:2px solid #fff8d6; border-radius:14px; box-shadow:0 8px 17px rgba(43,8,65,.28); font-size:.85rem; font-weight:900; }
  .studio-brand>div { display:flex; flex-direction:column; line-height:1; }.studio-brand strong{font-size:.72rem;letter-spacing:.16em}.studio-brand small{margin-top:.28rem;color:#fff2aa;font-size:.38rem;letter-spacing:.14em}
  .live-pill { position:absolute; top:30px; right:30px; display:flex; align-items:center; gap:.45rem; padding:.5rem .74rem; background:rgba(16,10,46,.82); border:1px solid rgba(255,255,255,.23); border-radius:99px; box-shadow:0 10px 22px rgba(13,3,39,.32); font-size:.45rem; font-weight:800; letter-spacing:.1em; backdrop-filter:blur(12px); }
  .live-pill i { width:9px; height:9px; background:#ff578e; border-radius:50%; box-shadow:0 0 0 5px rgba(255,87,142,.15),0 0 12px #ff578e; animation:live-pulse 1.7s ease-in-out infinite; }
  .camera-guide { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; color:rgba(255,255,255,.32); text-align:center; }.camera-guide svg{font-size:1.6rem}.camera-guide strong{margin-top:.7rem;font-size:.72rem;letter-spacing:.16em}.camera-guide small{margin-top:.28rem;font-size:.45rem}
  .camera-bracket { position:absolute; width:35px; height:35px; border-color:#ffe57c; border-style:solid; }.camera-bracket.top-left{top:12px;left:12px;border-width:2px 0 0 2px;border-radius:17px 0 0}.camera-bracket.top-right{top:12px;right:12px;border-width:2px 2px 0 0;border-radius:0 17px 0 0}.camera-bracket.bottom-left{bottom:12px;left:12px;border-width:0 0 2px 2px;border-radius:0 0 0 17px}.camera-bracket.bottom-right{right:12px;bottom:12px;border-width:0 2px 2px 0;border-radius:0 0 17px}
  .camera-ribbon { position:absolute; right:24px; bottom:22px; left:24px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:.68rem .78rem; background:linear-gradient(90deg,rgba(70,33,135,.88),rgba(218,53,149,.86) 52%,rgba(29,176,174,.82)); border:1px solid rgba(255,255,255,.2); border-radius:15px; box-shadow:0 10px 24px rgba(16,4,46,.3); backdrop-filter:blur(12px); }.camera-ribbon strong{font-size:.5rem;letter-spacing:.15em}.camera-ribbon>b{justify-self:end;width:42px;height:4px;background:linear-gradient(90deg,#ffdc68,#fff3b3);border-radius:8px;box-shadow:0 0 11px rgba(255,216,87,.48)}
  .signal { display:flex; align-items:center; gap:.38rem; color:#e9e3f4; font-size:.4rem; font-weight:700; letter-spacing:.08em; }.signal i{width:7px;height:7px;background:#ffce4e;border-radius:50%;box-shadow:0 0 8px #ffce4e}.signal.connected i{background:#58ead8;box-shadow:0 0 8px #58ead8}.signal.disconnected i{background:#ff668a;box-shadow:0 0 8px #ff668a}

  .sponsor-stage { grid-area:sponsor; position:relative; display:grid; min-height:0; grid-template-columns:45px minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto; column-gap:.75rem; padding:.8rem 1rem .72rem .72rem; overflow:hidden; background:radial-gradient(circle at 86% 10%,rgba(255,207,71,.17),transparent 28%),radial-gradient(circle at 8% 88%,rgba(255,78,164,.16),transparent 30%),linear-gradient(145deg,rgba(49,20,93,.98),rgba(10,16,47,.98)); border:1px solid rgba(255,211,91,.48); border-radius:28px 28px 44px 28px; box-shadow:inset 0 1px rgba(255,255,255,.1),0 22px 44px rgba(7,2,30,.39); }
  .sponsor-stage::after{position:absolute;right:-34px;bottom:-36px;width:120px;height:120px;content:"";border:18px solid rgba(69,227,213,.07);border-radius:50%;}
  .sponsor-rail { grid-row:1/3; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:2px; color:#fff0a1; background:linear-gradient(180deg,rgba(226,55,151,.9),rgba(108,53,210,.92)); border:1px solid rgba(255,255,255,.2); border-radius:17px; box-shadow:inset 0 1px rgba(255,255,255,.18),0 8px 18px rgba(25,5,59,.27); font-size:.38rem; font-weight:900; line-height:1; }
  .sponsor-media { min-height:0; overflow:hidden; border-radius:18px; }.sponsor-media>div{width:100%;height:100%;background:radial-gradient(circle at 50% 42%,rgba(255,211,96,.14),transparent 68%),rgba(6,10,33,.5);border:1px solid rgba(255,222,126,.2);border-radius:18px}
  .sponsor-nameplate { display:flex; min-width:0; align-items:center; justify-content:space-between; gap:.75rem; padding:.55rem .2rem 0; }.sponsor-nameplate>div{display:flex;min-width:0;flex-direction:column}.sponsor-nameplate small{color:#6fe9db;font-size:.37rem;font-weight:800;letter-spacing:.13em}.sponsor-nameplate strong{margin-top:.15rem;overflow:hidden;color:#fff6d4;font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.sponsor-nameplate>span{display:grid;min-width:35px;height:25px;place-items:center;color:#481945;background:linear-gradient(145deg,#fff0a6,#ffc33d);border-radius:9px;font-size:.4rem;font-weight:900}
  .sponsor-dots { position:absolute; right:22px; bottom:12px; display:flex; gap:4px; transform:translateY(100%); }.sponsor-dots i{width:14px;height:3px;background:rgba(255,255,255,.14);border-radius:5px}.sponsor-dots i.active{background:linear-gradient(90deg,#ff57a7,#ffd45d,#4ce3d4)}

  .info-totem { grid-area:info; display:grid; min-height:0; grid-template-rows:minmax(0,47fr) minmax(0,53fr); gap:10px; }
  .current-spotlight { position:relative; display:grid; min-height:0; place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 47%,rgba(var(--ball-rgb),.3),transparent 38%),linear-gradient(155deg,rgba(64,23,109,.94),rgba(13,17,53,.97)); border:1px solid rgba(var(--ball-rgb),.55); border-radius:50% 50% 31px 31px / 38% 38% 31px 31px; box-shadow:inset 0 1px rgba(255,255,255,.1),0 20px 42px rgba(8,2,31,.39),0 0 27px rgba(var(--ball-rgb),.1); }
  .current-spotlight::before{position:absolute;top:-28%;width:80%;aspect-ratio:1;content:"";border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 24px rgba(var(--ball-rgb),.035),0 0 0 50px rgba(255,255,255,.018);animation:orbit-turn 16s linear infinite}
  .spotlight-rays{position:absolute;inset:0;animation:orbit-turn 18s linear infinite}.spotlight-rays i{position:absolute;top:48%;left:50%;width:72%;height:2px;transform-origin:left;background:linear-gradient(90deg,rgba(var(--ball-rgb),.45),transparent)}.spotlight-rays i:nth-child(2){transform:rotate(120deg)}.spotlight-rays i:nth-child(3){transform:rotate(240deg)}
  .current-ball { position:relative; z-index:2; display:flex; width:min(17vh,180px); aspect-ratio:1; align-items:center; justify-content:center; flex-direction:column; color:#481946; background:radial-gradient(circle at 32% 21%,#fff 0 7%,#fff6b7 17%,#ffd65a 48%,#f47a55 78%,#bd3876); border:7px solid #fff9db; border-radius:50%; box-shadow:0 0 0 8px rgba(var(--ball-rgb),.19),0 0 36px rgba(var(--ball-rgb),.5),0 22px 38px rgba(39,6,57,.4),inset -9px -12px 16px rgba(104,26,74,.18); animation:ball-arrive .8s cubic-bezier(.18,.83,.24,1.1); }.current-ball::before{position:absolute;top:9%;left:19%;width:28%;height:17%;content:"";background:rgba(255,255,255,.55);border-radius:50%;transform:rotate(-25deg);filter:blur(2px)}.current-ball small{font-size:.82rem;font-weight:900;line-height:1}.current-ball strong{margin-top:.12rem;font-size:clamp(3rem,4.2vw,4.7rem);line-height:.95}.current-ball>span{position:absolute;right:19%;bottom:12%;width:18%;height:7%;background:rgba(116,29,87,.18);border-radius:50%;transform:rotate(-24deg)}
  .recent-orbit { position:absolute; right:0; bottom:12px; left:0; z-index:3; display:flex; justify-content:center; gap:8px; }.recent-orbit>span{display:flex;width:39px;aspect-ratio:1;align-items:center;justify-content:center;flex-direction:column;color:#fff;background:radial-gradient(circle at 32% 22%,#fff 0 7%,rgba(var(--recent-rgb),1) 28%,rgba(var(--recent-rgb),.82) 68%,#542466);border:2px solid rgba(255,255,255,.86);border-radius:50%;box-shadow:0 6px 13px rgba(7,3,30,.34),0 0 12px rgba(var(--recent-rgb),.25)}.recent-orbit small{font-size:.24rem;line-height:1}.recent-orbit b{font-size:.52rem;line-height:1}.recent-orbit .empty{opacity:.28;background:rgba(255,255,255,.08);border-style:dashed;box-shadow:none}
  .figure-medallion { position:relative; display:flex; min-height:0; align-items:center; justify-content:center; flex-direction:column; overflow:hidden; padding:2.45rem .6rem .7rem; background:radial-gradient(circle at 50% 45%,rgba(148,92,255,.31),transparent 52%),linear-gradient(150deg,#241451,#0f183c); border:1px solid rgba(80,230,215,.4); border-radius:31px 31px 50% 50% / 31px 31px 24% 24%; box-shadow:inset 0 1px rgba(255,255,255,.08),0 18px 37px rgba(7,2,30,.35); }.figure-medallion::before{position:absolute;bottom:-55%;width:130%;aspect-ratio:1;content:"";border:1px solid rgba(255,211,83,.14);border-radius:50%;box-shadow:0 0 0 18px rgba(255,87,169,.035),0 0 0 38px rgba(66,230,215,.025)}
  .figure-kicker { position:absolute; top:14px; right:14px; left:14px; display:flex; align-items:center; justify-content:center; gap:8px; color:#77eddf; font-size:.44rem; font-weight:900; letter-spacing:.13em; }.figure-kicker i{width:25px;height:2px;background:linear-gradient(90deg,transparent,#ffd562)}.figure-kicker i:last-child{background:linear-gradient(90deg,#ffd562,transparent)}
  .figure-pattern { position:relative; z-index:2; display:grid; width:min(18.5vh,185px); grid-template-columns:repeat(5,1fr); gap:6px; padding:12px; background:linear-gradient(145deg,rgba(85,48,171,.96),rgba(15,19,57,.98)); border:1px solid rgba(215,192,255,.48); border-radius:26px; box-shadow:0 18px 34px rgba(5,3,26,.38),inset 0 1px rgba(255,255,255,.14),0 0 22px rgba(129,81,238,.12); }.figure-pattern>span{display:grid;aspect-ratio:1;place-items:center;background:rgba(27,36,65,.94);border:1px solid rgba(119,143,173,.28);border-radius:7px}.figure-pattern>span.active{background:linear-gradient(145deg,#f184ff,#8058ef);border-color:#efd0ff;box-shadow:inset 0 1px rgba(255,255,255,.3),0 5px 12px rgba(144,71,226,.4)}.figure-pattern>span.free{color:#ffdc66;background:rgba(255,190,68,.12);border-color:rgba(255,213,98,.45)}.figure-pattern svg{font-size:.52rem}.figure-pattern i{width:8px;height:8px;background:#fff;border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,.13),0 0 11px rgba(255,255,255,.44)}
  .figure-title{position:relative;z-index:2;margin-top:.65rem;max-width:92%;overflow:hidden;font-size:.92rem;text-overflow:ellipsis;white-space:nowrap}.figure-page{position:absolute;right:14px;bottom:12px;color:#ffe78c;font-size:.4rem}.figure-waiting{display:flex;align-items:center;flex-direction:column;color:#8f86a7}.figure-waiting svg{font-size:1.45rem}.figure-waiting strong{margin-top:.55rem;font-size:.68rem}

  .machine-stage { grid-area:machine; position:relative; min-height:0; padding:8px 0 0; }

  .score-wall { grid-area:board; position:relative; display:grid; min-height:0; grid-template-rows:82px minmax(0,1fr) 54px; gap:12px; margin-left:20px; padding:16px; overflow:hidden; background:radial-gradient(circle at 50% 0,rgba(145,82,255,.24),transparent 29%),radial-gradient(circle at 98% 84%,rgba(49,227,213,.12),transparent 27%),linear-gradient(153deg,#1d1245,#0a122c 55%,#21103f); border:2px solid rgba(255,205,78,.82); border-radius:34px 34px 34px 34px; box-shadow:inset 0 0 0 3px rgba(255,255,255,.055),inset 0 0 60px rgba(104,65,190,.12),0 26px 54px rgba(5,2,26,.49),0 0 34px rgba(118,76,232,.14); }
  .score-wall::before{position:absolute;inset:8px;content:"";pointer-events:none}.score-wall::after{position:absolute;top:0;right:19%;width:38%;height:5px;content:"";background:linear-gradient(90deg,transparent,#ff5ca9,#ffd55c,#4ce2d3,transparent);box-shadow:0 0 16px rgba(255,90,169,.5)}
  .score-crown { position:relative; z-index:2; display:grid; grid-template-columns:1fr 2.35fr 1fr; align-items:center; gap:10px; padding:9px 12px; background:linear-gradient(180deg,rgba(54,22,96,.95),rgba(14,15,49,.95)); border:1px solid rgba(255,218,100,.43); border-radius:20px 37px 20px 20px; box-shadow:inset 0 1px rgba(255,255,255,.08),0 10px 22px rgba(17,4,48,.3); }.score-crown>div{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.score-crown b{display:grid;height:54px;place-items:center;color:#fff;background:linear-gradient(145deg,var(--lane-accent),#5631a4);border:2px solid rgba(255,255,255,.83);border-radius:16px;box-shadow:inset 0 -8px rgba(48,8,69,.14),0 6px 13px rgba(12,4,38,.28);font-size:1.65rem;text-shadow:0 3px 7px rgba(44,7,64,.4)}.score-crown>span{display:flex;align-items:center;gap:6px;color:#9e94b7;font-size:.36rem;font-weight:800;letter-spacing:.1em}.score-crown>span:last-child{justify-content:flex-end;text-align:right}.score-crown>span i{width:6px;height:6px;background:#53e5d4;border-radius:50%;box-shadow:0 0 8px #53e5d4}.score-crown>span:last-child i{background:#ffd055;box-shadow:0 0 8px #ffd055}
  .score-lanes { position:relative; z-index:2; display:grid; min-height:0; grid-template-rows:repeat(5,1fr); gap:9px; }.score-lane{position:relative;display:grid;min-height:0;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:10px;padding:8px 12px 8px 8px;overflow:hidden;background:linear-gradient(90deg,rgba(var(--lane-rgb),.17),rgba(var(--lane-rgb),.045) 38%,rgba(255,255,255,.018));border:1px solid rgba(var(--lane-rgb),.28);border-radius:22px 42px 42px 22px;box-shadow:inset 0 1px rgba(255,255,255,.06),inset -30px 0 42px rgba(3,5,21,.12)}.score-lane::after{position:absolute;right:-25px;width:75px;aspect-ratio:1;content:"";border:12px solid rgba(var(--lane-rgb),.05);border-radius:50%}
  .lane-letter{position:relative;z-index:2;display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(145deg,rgba(var(--lane-rgb),.96),rgba(91,43,172,.94));border:2px solid rgba(255,255,255,.75);border-radius:17px;box-shadow:inset 0 -9px rgba(37,7,63,.13),0 7px 15px rgba(8,3,33,.27)}.lane-letter span{font-size:1.35rem;font-weight:900;line-height:1;text-shadow:0 3px 6px rgba(36,6,56,.38)}.lane-letter small{margin-top:4px;color:rgba(255,255,255,.72);font-size:.28rem;font-weight:700}
  .score-progress { position:relative; z-index:2; display:grid; grid-template-columns:1fr auto; align-items:center; gap:12px; padding:0 14px; background:linear-gradient(90deg,rgba(83,34,133,.93),rgba(137,44,141,.82) 50%,rgba(29,25,77,.94));border:1px solid rgba(188,146,255,.38);border-radius:16px;box-shadow:inset 0 1px rgba(255,255,255,.1),0 7px 16px rgba(15,4,42,.25)}.score-progress>div{height:10px;overflow:hidden;background:rgba(8,6,28,.62);border:1px solid rgba(255,255,255,.08);border-radius:10px}.score-progress>div span{display:block;height:100%;background:linear-gradient(90deg,#ff55aa,#ffd65a 54%,#4ce4d5);border-radius:inherit;box-shadow:0 0 12px rgba(255,89,168,.38)}.score-progress>strong{color:#fff2a3;font-size:1.28rem}.score-progress small{margin-left:2px;color:#ad9fc4;font-size:.42rem}

  .live-slot { position:relative; z-index:30; display:grid; min-height:0; grid-column:2/4; grid-row:1/3; place-items:stretch; padding:clamp(12px,.9vw,18px); overflow:hidden; background:radial-gradient(circle at 24% 38%,rgba(111,57,205,.22),transparent 42%),radial-gradient(circle at 82% 16%,rgba(255,75,169,.12),transparent 34%),linear-gradient(145deg,rgba(24,10,55,.98),rgba(7,7,27,.99));border:1px solid rgba(255,207,92,.38);border-radius:32px;box-shadow:0 0 75px rgba(0,0,0,.62),inset 0 0 75px rgba(124,92,255,.11)}.live-slot>div:first-child{width:100%;height:100%;min-height:0}.slot-entering>.live-slot{animation:slot-in .82s cubic-bezier(.16,.82,.22,1) both}.slot-leaving>.live-slot{pointer-events:none;animation:slot-out .68s cubic-bezier(.55,.05,.8,.25) both}.slot-visible>.score-wall,.slot-visible>.machine-stage,.slot-visible>.info-totem{visibility:hidden}

  /* Segunda dirección: cinco torres verticales de lectura amplia. */
  grid-template-columns: minmax(0, 38%) minmax(300px, 18%) minmax(0, 44%);
  &::before { left: calc(38% + 14px); }

  .score-wall { grid-template-rows:64px minmax(0,1fr) 52px; gap:10px; padding:15px; border-radius:38px 38px 38px 38px; }
  .score-wall::before { border-radius:30px 61px 30px 30px; }
  .score-crown { grid-template-columns:1fr auto 1fr; padding:8px 15px; border-radius:21px 46px 21px 21px; }
  .score-crown>div.wall-title { display:flex; align-items:center; justify-content:center; gap:9px; color:#fff4b0; font-size:.61rem; font-weight:900; letter-spacing:.15em; text-shadow:0 0 15px rgba(255,210,79,.28); white-space:nowrap; }
  .wall-title i { width:28px; height:2px; background:linear-gradient(90deg,transparent,#ffcf53); border-radius:4px; box-shadow:0 0 8px rgba(255,207,83,.45); }
  .wall-title i:last-child { background:linear-gradient(90deg,#ffcf53,transparent); }
  .score-columns { position:relative; z-index:2; display:grid; min-height:0; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
  .score-column { position:relative; display:grid; min-width:0; min-height:0; grid-template-rows:72px minmax(0,1fr); gap:6px; padding:6px; overflow:hidden; background:linear-gradient(180deg,rgba(var(--lane-rgb),.15),rgba(var(--lane-rgb),.035) 38%,rgba(255,255,255,.014)); border:1px solid rgba(var(--lane-rgb),.3); border-radius:20px; box-shadow:inset 0 1px rgba(255,255,255,.07),inset 0 -30px 44px rgba(2,4,20,.17),0 10px 22px rgba(4,3,25,.2); }
  .score-column::after { position:absolute; right:-45%; bottom:-7%; width:120%; aspect-ratio:1; content:""; border:18px solid rgba(var(--lane-rgb),.035); border-radius:50%; pointer-events:none; }
  .score-column>header { position:relative; z-index:2; display:flex; align-items:center; justify-content:center; flex-direction:column; background:linear-gradient(145deg,rgba(var(--lane-rgb),1),rgba(99,45,184,.95)); border:2px solid rgba(255,255,255,.82); border-radius:19px; box-shadow:inset 0 -10px rgba(39,7,66,.13),0 7px 15px rgba(7,3,31,.3),0 0 15px rgba(var(--lane-rgb),.14); }
  .score-column>header::before { position:absolute; top:7px; left:12px; width:25%; height:18%; content:""; background:linear-gradient(135deg,rgba(255,255,255,.5),transparent); border-radius:50%; transform:rotate(-12deg); }
  .score-column>header strong { font-size:1.65rem; line-height:1; text-shadow:0 4px 8px rgba(39,7,60,.42); }
  .score-column>header small { margin-top:5px; color:rgba(255,255,255,.76); font-size:.32rem; font-weight:800; letter-spacing:.08em; }
  .score-column>div { position:relative; z-index:2; display:grid; min-height:0; grid-template-rows:repeat(15,minmax(0,1fr)); gap:4px; }
  .score-column>div>span { position:relative; display:flex; min-width:0; min-height:0; align-items:center; justify-content:center; color:#9ba1ba; background:linear-gradient(90deg,rgba(var(--lane-rgb),.055),rgba(255,255,255,.026)); border:1px solid rgba(var(--lane-rgb),.12); border-radius:12px; box-shadow:inset 0 1px rgba(255,255,255,.025); font-size:clamp(.72rem,.88vw,.96rem); font-weight:800; }
  .score-column>div>span>i,.score-column>div>span>b { position:absolute; width:4px; height:4px; background:rgba(var(--lane-rgb),.28); border-radius:50%; }
  .score-column>div>span>i { left:9px; }.score-column>div>span>b { right:9px; }
  .score-column>div>span.drawn { color:#fff; background:linear-gradient(105deg,rgba(var(--lane-rgb),.96),rgba(var(--lane-rgb),.7) 54%,rgba(115,39,143,.92)); border-color:rgba(255,255,255,.72); box-shadow:inset 0 1px rgba(255,255,255,.27),inset 0 -6px rgba(54,9,77,.12),0 5px 12px rgba(var(--lane-rgb),.27),0 0 14px rgba(var(--lane-rgb),.1); font-size:clamp(.82rem,1vw,1.06rem); text-shadow:0 2px 5px rgba(30,5,48,.52); }
  .score-column>div>span.drawn>i,.score-column>div>span.drawn>b { background:#fff; box-shadow:0 0 7px rgba(255,255,255,.72); }
  .score-column>div>span.latest { color:#4c1b49; background:linear-gradient(105deg,#fff6b4,#ffd451 52%,#ef7754); border:2px solid #fff9d7; box-shadow:0 0 0 3px rgba(255,178,47,.2),0 0 22px rgba(255,169,41,.78),inset 0 1px rgba(255,255,255,.55); text-shadow:none; animation:latest-column 1s cubic-bezier(.18,.85,.24,1.1); }
  .score-column>div>span.latest>i,.score-column>div>span.latest>b { background:#cf5a53; box-shadow:none; }

  /* Patrocinador como escenario de reconocimiento, no como tarjeta auxiliar. */
  .sponsor-stage { grid-template-columns:1fr; grid-template-rows:52px minmax(0,1fr) 58px; gap:7px; padding:10px 13px 11px; overflow:hidden; background:radial-gradient(circle at 50% 42%,rgba(255,207,71,.17),transparent 44%),radial-gradient(circle at 4% 86%,rgba(255,76,164,.2),transparent 30%),radial-gradient(circle at 96% 15%,rgba(54,229,215,.14),transparent 28%),linear-gradient(145deg,#3d185f,#11163d 68%,#241145); border:2px solid rgba(255,216,105,.72); border-radius:42px 28px 42px 28px; box-shadow:inset 0 0 0 3px rgba(255,255,255,.045),inset 0 0 42px rgba(255,190,63,.06),0 22px 45px rgba(7,2,30,.42),0 0 26px rgba(255,191,54,.09); }
  .sponsor-stage::before { position:absolute; inset:7px; content:""; border:1px solid rgba(255,255,255,.11); border-radius:34px 21px 34px 21px; pointer-events:none; }
  .sponsor-stage::after { right:-38px; bottom:-45px; width:145px; height:145px; border:20px solid rgba(69,227,213,.065); }
  .sponsor-halo { position:absolute; inset:0; pointer-events:none; }.sponsor-halo i{position:absolute;top:-70%;left:20%;width:58%;height:190%;background:linear-gradient(100deg,transparent,rgba(255,231,151,.07),transparent);transform:rotate(9deg);animation:sponsor-sweep 6s ease-in-out infinite}.sponsor-halo i:last-child{right:-25%;bottom:-70%;top:auto;left:auto;width:65%;aspect-ratio:1;height:auto;background:conic-gradient(from 0deg,rgba(255,82,168,.16),rgba(56,230,215,.12),transparent 70%);border-radius:50%;animation:sponsor-orbit 13s linear infinite}
  .sponsor-crown { position:relative; z-index:4; display:flex; align-items:center; justify-content:center; gap:12px; }.sponsor-crown>i{width:54px;height:2px;background:linear-gradient(90deg,transparent,#ffd665);box-shadow:0 0 8px rgba(255,213,94,.45)}.sponsor-crown>i:last-child{background:linear-gradient(90deg,#ffd665,transparent)}.sponsor-crown>div{display:flex;align-items:center;flex-direction:column;line-height:1}.sponsor-crown small{color:#76ebdd;font-size:.34rem;font-weight:800;letter-spacing:.13em}.sponsor-crown strong{margin-top:.3rem;color:#fff2ab;font-size:.62rem;letter-spacing:.14em;text-shadow:0 0 13px rgba(255,210,79,.25)}
  .sponsor-media { position:relative; min-height:0; overflow:visible; padding:11px; background:linear-gradient(145deg,rgba(255,214,99,.19),rgba(255,81,165,.09) 45%,rgba(55,227,214,.11)); border:1px solid rgba(255,224,135,.3); border-radius:22px; box-shadow:inset 0 1px rgba(255,255,255,.1),0 13px 26px rgba(8,3,31,.28); }
  .sponsor-media>.marquee-lights { position:absolute; inset:0; z-index:3; display:grid; width:auto; height:auto; grid-template-columns:repeat(6,1fr); align-content:space-between; gap:0; padding:5px 23px; background:transparent; border:0; border-radius:22px; box-shadow:none; pointer-events:none; }
  .marquee-lights i { width:6px; height:6px; justify-self:center; background:#ffe37c; border:1px solid #fff6c4; border-radius:50%; box-shadow:0 0 9px rgba(255,211,82,.82); animation:marquee-pulse 1.8s ease-in-out infinite alternate; }.marquee-lights i:nth-child(2n){animation-delay:-.6s}.marquee-lights i:nth-child(3n){background:#61eadb;box-shadow:0 0 9px rgba(76,229,213,.75);animation-delay:-1.1s}
  .sponsor-media>div:not(.marquee-lights) { width:100%; height:100%; overflow:hidden; background:radial-gradient(circle at 50% 42%,rgba(255,214,103,.14),transparent 67%),rgba(6,10,32,.53); border:1px solid rgba(255,235,172,.19); border-radius:16px; }
  .sponsor-nameplate { position:relative; z-index:4; display:grid; grid-template-columns:44px minmax(0,1fr) auto; gap:10px; padding:4px 9px 0; }.sponsor-nameplate>span.sponsor-star{display:grid;width:40px;height:40px;place-items:center;color:#52204c;background:linear-gradient(145deg,#fff4af,#ffc33c 62%,#f17a50);border:2px solid #fff6c9;border-radius:14px;box-shadow:0 7px 14px rgba(30,5,48,.3),0 0 13px rgba(255,194,58,.18);font-size:.8rem}.sponsor-nameplate small{color:#72e9dc;font-size:.34rem}.sponsor-nameplate strong{font-size:.77rem}.sponsor-nameplate>span.sponsor-count{display:grid;min-width:54px;height:30px;place-items:center;color:#fff0a0;background:rgba(112,54,192,.45);border:1px solid rgba(255,218,105,.28);border-radius:10px;font-size:.39rem}.sponsor-dots{right:74px;bottom:14px;transform:none}.sponsor-dots i{height:4px}

  /* Ajustes de legibilidad y carril técnico para el tubo. */
  .info-totem { padding-right:42px; }
  .figure-kicker { top:11px; right:10px; left:10px; gap:8px; padding:.42rem .35rem; color:#fff5b0; background:linear-gradient(90deg,transparent,rgba(126,57,203,.7) 18%,rgba(224,61,153,.68) 50%,rgba(126,57,203,.7) 82%,transparent); border-radius:11px; font-size:clamp(.51rem,.64vw,.69rem); letter-spacing:.11em; text-shadow:0 2px 8px rgba(14,3,40,.55); }
  .figure-kicker i { width:24px; height:3px; box-shadow:0 0 8px rgba(255,212,91,.45); }
  .figure-medallion { padding-top:3rem; }

  .score-wall { grid-template-rows:minmax(0,1fr) 52px; gap:10px; padding-top:14px; }
  .score-column { grid-template-rows:66px minmax(0,1fr); }
  .score-column>header strong { font-size:1.95rem; }
  .score-column>div>span { font-size:clamp(.8rem,.98vw,1.08rem); }
  .score-column>div>span.drawn { font-size:clamp(.9rem,1.08vw,1.16rem); }

  /* Marquesina completa: las luces rodean la marca sin convertir el título en otra fila. */
  .sponsor-stage { grid-template-rows:minmax(0,1fr) 60px; gap:6px; padding:11px 15px 10px; border-width:3px; box-shadow:inset 0 0 0 4px rgba(255,255,255,.045),inset 0 0 55px rgba(255,190,63,.08),0 23px 46px rgba(7,2,30,.44),0 0 35px rgba(255,191,54,.14); }
  .sponsor-crown { position:absolute; top:16px; right:72px; left:72px; z-index:7; min-height:44px; padding:.42rem 1rem; background:linear-gradient(105deg,rgba(86,37,157,.94),rgba(218,54,147,.94) 52%,rgba(40,179,176,.9)); border:1px solid rgba(255,239,174,.42); border-radius:14px; box-shadow:0 9px 20px rgba(19,4,49,.34),inset 0 1px rgba(255,255,255,.18),0 0 18px rgba(255,87,166,.12); backdrop-filter:blur(10px); }
  .sponsor-crown>i { width:9px; height:9px; flex:0 0 9px; background:#ffe16c; border:1px solid #fff6bb; transform:rotate(45deg); box-shadow:0 0 11px rgba(255,216,86,.85); }
  .sponsor-crown>i:last-child { background:#64ebdd; border-color:#cafff8; box-shadow:0 0 11px rgba(77,232,217,.8); }
  .sponsor-crown small { font-size:.37rem; }
  .sponsor-crown strong { margin-top:.32rem; font-size:clamp(.67rem,.84vw,.9rem); letter-spacing:.13em; }
  .sponsor-media { padding:55px 14px 13px; border-radius:28px; }
  .sponsor-media>.marquee-lights { display:none; }
  .sponsor-media>div:not(.marquee-lights) { border-radius:19px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 10px 24px rgba(5,2,25,.26); }
  .sponsor-nameplate { grid-template-columns:48px minmax(0,1fr) auto; padding:4px 13px 0; }
  .sponsor-nameplate>span.sponsor-star { width:44px; height:44px; font-size:.95rem; animation:sponsor-star-pulse 2.4s ease-in-out infinite; }
  .sponsor-nameplate small { font-size:.39rem; }.sponsor-nameplate strong { font-size:.85rem; }
  .sponsor-bulb-frame { position:absolute; inset:7px; z-index:6; pointer-events:none; }
  .sponsor-bulb-frame>span { position:absolute; display:flex; align-items:center; justify-content:space-around; }
  .bulbs-top,.bulbs-bottom { right:34px; left:34px; height:10px; }.bulbs-top{top:0}.bulbs-bottom{bottom:0}
  .bulbs-right,.bulbs-left { top:30px; bottom:30px; width:10px; flex-direction:column; }.bulbs-right{right:0}.bulbs-left{left:0}
  .sponsor-bulb-frame i { display:block; width:7px; height:7px; flex:0 0 7px; background:radial-gradient(circle at 35% 30%,#fff,#ffe477 45%,#ff9f3f); border:1px solid #fff4b2; border-radius:50%; box-shadow:0 0 6px #ffd155,0 0 13px rgba(255,190,52,.68); animation:bulb-live 1.5s ease-in-out infinite alternate; }
  .sponsor-bulb-frame span:nth-child(2n) i:nth-child(2n),.sponsor-bulb-frame span:nth-child(2n+1) i:nth-child(2n+1) { background:radial-gradient(circle at 35% 30%,#fff,#72f2e5 48%,#22aead); border-color:#c9fff8; box-shadow:0 0 6px #56e4d7,0 0 13px rgba(66,227,213,.58); animation-delay:-.75s; }

  /* Canal vertical unificado: cámara, identidad y patrocinadores comparten una sola pieza. */
  grid-template-columns:minmax(380px,.52fr) minmax(300px,.42fr) minmax(0,1.06fr);
  grid-template-areas:"left info board" "left machine board";
  &::before { left:calc(26% + 12px); }
  .left-channel { position:relative; display:grid; min-height:0; grid-area:left; grid-row:1/3; grid-template-rows:minmax(0,34fr) minmax(0,66fr); gap:8px; padding:14px; overflow:hidden; background:transparent; border:2px solid rgba(255,205,76,.84); border-radius:22px 22px 28px 28px; box-shadow:inset 0 0 0 4px rgba(255,255,255,.055),0 25px 52px rgba(6,2,28,.42),0 0 30px rgba(255,87,164,.12); isolation:isolate; }
  .left-channel::before { position:absolute; inset:7px; z-index:2; content:""; border:1px solid rgba(255,255,255,.13); border-radius:36px 21px 36px 21px; pointer-events:none; }
  .left-channel::after { position:absolute; top:0; right:19%; left:19%; z-index:4; height:5px; content:""; background:linear-gradient(90deg,transparent,#ff5ba8,#ffd35d,#4de3d4,transparent); box-shadow:0 0 15px rgba(255,90,168,.55); pointer-events:none; }
  .channel-backdrop { position:absolute; inset:0; z-index:-2; overflow:hidden; background:#170b3c; -webkit-mask-image:linear-gradient(#000 0 0),linear-gradient(#000 0 0); -webkit-mask-position:0 0,14px 14px; -webkit-mask-size:100% 100%,calc(100% - 28px) calc(34% - 14px); -webkit-mask-repeat:no-repeat; -webkit-mask-composite:xor; mask-image:linear-gradient(#000 0 0),linear-gradient(#000 0 0); mask-position:0 0,14px 14px; mask-size:100% 100%,calc(100% - 28px) calc(34% - 14px); mask-repeat:no-repeat; mask-composite:exclude; }
  .channel-backdrop>img,.channel-backdrop>video { width:100%; height:100%; object-fit:cover; }
  .channel-backdrop::after { position:absolute; inset:0; content:""; background:linear-gradient(180deg,rgba(13,7,40,.06),rgba(13,7,40,.2) 38%,rgba(13,7,40,.05) 65%,rgba(10,6,31,.38)); }
  .default-channel-art { position:absolute; inset:0; overflow:hidden; background:radial-gradient(circle at 52% 40%,rgba(255,77,166,.31),transparent 31%),radial-gradient(circle at 40% 82%,rgba(52,230,215,.22),transparent 34%),linear-gradient(155deg,#4b126f,#11103d 53%,#28105c); }
  .channel-ribbons i { position:absolute; width:165%; height:120px; border:22px solid transparent; border-top-color:rgba(255,87,169,.16); border-radius:50%; transform:rotate(-24deg); }.channel-ribbons i:nth-child(1){top:35%;left:-36%}.channel-ribbons i:nth-child(2){top:56%;left:-25%;border-top-color:rgba(71,230,216,.13);transform:rotate(21deg)}.channel-ribbons i:nth-child(3){bottom:-5%;left:-31%;border-top-color:rgba(255,210,75,.11);transform:rotate(-14deg)}
  .floating-balls span { position:absolute; z-index:2; display:grid; width:42px; aspect-ratio:1; place-items:center; color:#fff; background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ff87bb 22%,#d845a1 61%,#603098); border:3px solid rgba(255,255,255,.86); border-radius:50%; box-shadow:inset -4px -5px 8px rgba(39,5,65,.18),0 9px 18px rgba(6,2,27,.34),0 0 15px rgba(255,80,166,.18); font-size:.56rem; font-weight:900; animation:channel-ball-float 3.6s ease-in-out infinite alternate; }
  .floating-balls span:nth-child(1){top:39%;left:8%}.floating-balls span:nth-child(2){top:46%;right:8%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ffe077 22%,#f1854d 61%,#a83b79);animation-delay:-.8s}.floating-balls span:nth-child(3){top:57%;left:16%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#a998ff 22%,#6c53e1 61%,#4a348f);animation-delay:-1.5s}.floating-balls span:nth-child(4){top:64%;right:13%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#73f1df 22%,#22a7af 61%,#365f93);animation-delay:-2.1s}.floating-balls span:nth-child(5){top:75%;left:9%;animation-delay:-2.7s}.floating-balls span:nth-child(6){top:82%;right:10%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ffe077 22%,#f1854d 61%,#a83b79);animation-delay:-.35s}.floating-balls span:nth-child(7){top:69%;left:47%;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#73f1df 22%,#22a7af 61%,#365f93);animation-delay:-1.1s}
  .channel-stars i { position:absolute; z-index:1; width:6px; height:6px; background:#ffe27b; transform:rotate(45deg); box-shadow:0 0 9px rgba(255,214,85,.8); animation:channel-star 2s steps(2) infinite; }.channel-stars i:nth-child(1){top:42%;left:34%}.channel-stars i:nth-child(2){top:53%;right:27%;background:#5be7d9;box-shadow:0 0 9px rgba(75,229,215,.8);animation-delay:-.6s}.channel-stars i:nth-child(3){bottom:25%;left:29%;animation-delay:-1.2s}.channel-stars i:nth-child(4){bottom:16%;right:32%;background:#ff6bac;box-shadow:0 0 9px rgba(255,82,166,.75);animation-delay:-1.7s}
  .left-channel .studio-brand { top:16px; left:16px; padding:.42rem .62rem; }.left-channel .studio-brand>span{width:34px;height:34px;border-radius:11px}.left-channel .studio-brand strong{font-size:.6rem}.left-channel .studio-brand small{font-size:.31rem}
  .left-channel .live-pill { top:17px; right:17px; padding:.4rem .58rem; font-size:.38rem; }.left-channel .camera-ribbon{right:14px;bottom:13px;left:14px;padding:.52rem .62rem;border-radius:12px}.left-channel .camera-ribbon strong{font-size:.42rem}.left-channel .signal{font-size:.34rem}.left-channel .camera-arch{inset:18px}.left-channel .camera-bracket{width:27px;height:27px}
  .left-channel>.sponsor-stage { position:relative; z-index:3; grid-area:auto; grid-row:2; margin:0; border-radius:29px 20px 29px 20px; }
  .left-channel>.sponsor-wall { display:grid; min-height:0; grid-template-rows:auto minmax(0,1fr); gap:14px; padding:18px 10px 10px; overflow:hidden; color:#fff; background:unset; border:0; border-radius:0; box-shadow:none; }
  .sponsor-wall::before { position:absolute; right:4%; bottom:-48%; left:4%; z-index:0; height:88%; content:""; border-radius:50%; filter:blur(34px); opacity:.7; animation:sponsor-atmosphere 9s ease-in-out infinite alternate; }
  .sponsor-wall::after { position:absolute; top:0; right:8%; left:8%; z-index:1; content:"";}
  .sponsor-corners { position:absolute; inset:0; z-index:1; pointer-events:none; }
  .sponsor-corners i { position:absolute; width:6px; aspect-ratio:1; background:#ff5aa8; border-radius:50%; box-shadow:0 0 10px #ff5aa8; animation:sponsor-spark 2.2s ease-in-out infinite alternate; }
  .sponsor-corners i:nth-child(1){top:21px;left:12%;}.sponsor-corners i:nth-child(2){top:37px;right:10%;width:4px;background:#4de3d4;box-shadow:0 0 9px #4de3d4;animation-delay:-.6s}.sponsor-corners i:nth-child(3){bottom:12px;left:7%;width:4px;background:#ffd44f;box-shadow:0 0 9px #ffd44f;animation-delay:-1.2s}.sponsor-corners i:nth-child(4){right:8%;bottom:21px;background:#8d68ff;box-shadow:0 0 9px #8d68ff;animation-delay:-1.7s}
  .sponsor-wall-title { position:relative; z-index:2; display:flex; align-items:center; flex-direction:column; padding:0 12px; color:#fff; text-align:center; text-shadow:0 5px 17px rgba(4,2,28,.58); }
  .sponsor-wall-title small { display:flex; width:100%; align-items:center; justify-content:center; gap:11px; color:#73e9dd; font-size:clamp(.44rem,.52vw,.62rem); font-weight:950; line-height:1; letter-spacing:.12em; }
  .sponsor-wall-title small i { width:clamp(22px,3vw,42px); height:1px; background:linear-gradient(90deg,transparent,rgba(112,235,222,.7)); }.sponsor-wall-title small i:last-child{background:linear-gradient(90deg,rgba(112,235,222,.7),transparent)}
  .sponsor-wall-title strong { margin-top:9px; color:#fff2a1; font-size:clamp(1.45rem,1.68vw,1.9rem); font-weight:1000; line-height:.92; letter-spacing:.045em; text-shadow:0 0 22px rgba(255,203,69,.4),0 6px 18px rgba(4,2,28,.6); }
  .sponsor-wall-title>span { width:10px; aspect-ratio:1; margin-top:10px; background:#ffd34f; border:2px solid rgba(255,255,255,.7); border-radius:2px; box-shadow:-20px 0 0 -2px #ff55a5,20px 0 0 -2px #49dfd4,0 0 12px rgba(255,203,69,.52); transform:rotate(45deg); }
  .sponsor-content { position:relative; z-index:2; display:grid; min-height:0; grid-template-rows:minmax(0,1fr); gap:10px; }
  .sponsor-content.has-person { grid-template-rows:minmax(0,1fr) clamp(122px,13.4vh,148px); }
  .sponsor-content.no-logos { grid-template-rows:minmax(122px,148px); align-content:start; }
  .sponsor-content.no-logos .sponsor-logo-grid { display:none; }
  .sponsor-logo-grid { position:relative; z-index:2; display:grid; min-height:0; grid-template-columns:repeat(2,minmax(0,1fr)); align-content:start; gap:13px 12px; padding:4px 5px 0; }
  .sponsor-logo-grid.logo-count-1 { grid-template-columns:minmax(0,78%); grid-auto-rows:175px; justify-content:center; }
  .sponsor-logo-grid.logo-count-2 { grid-auto-rows:150px; }
  .sponsor-logo-grid.logo-count-3,.sponsor-logo-grid.logo-count-4 { grid-auto-rows:135px; }
  .sponsor-logo-grid.logo-count-5,.sponsor-logo-grid.logo-count-6 { grid-auto-rows:112px; }
  .sponsor-content.has-person .sponsor-logo-grid.logo-count-5,.sponsor-content.has-person .sponsor-logo-grid.logo-count-6 { grid-template-rows:repeat(3,minmax(0,1fr)); grid-auto-rows:auto; align-content:stretch; }
  .sponsor-logo-grid.logo-count-7,.sponsor-logo-grid.logo-count-8 { grid-template-rows:repeat(4,minmax(0,1fr)); align-content:stretch; padding-bottom:5px; }
  .sponsor-logo { position:relative; display:grid; min-width:0; min-height:0; place-items:center; padding:2px 4px; overflow:visible; background:transparent; border:0; border-radius:0; box-shadow:none; animation:sponsor-logo-enter .68s cubic-bezier(.2,.85,.25,1) both; animation-delay:calc(var(--sponsor-order,0) * 45ms); }
  .sponsor-logo::before { position:absolute; inset:15% 8%; content:""; background:radial-gradient(ellipse,rgba(124,93,218,.14),rgba(41,225,211,.035) 48%,transparent 72%); border-radius:50%; filter:blur(5px); }
  .sponsor-logo img { position:relative; z-index:1; display:block; width:100%; height:100%; max-width:100%; max-height:100%; object-fit:contain; filter:drop-shadow(0 0 1px rgba(255,255,255,.72)) drop-shadow(0 0 5px rgba(112,231,219,.2)) drop-shadow(0 7px 8px rgba(3,2,24,.5)); }
  .sponsor-person { position:relative; display:grid; min-width:0; min-height:0; grid-template-columns:clamp(76px,5.1vw,96px) minmax(0,1fr); align-items:center; gap:clamp(13px,1vw,19px); padding:clamp(10px,.72vw,14px) clamp(16px,1.15vw,23px); overflow:hidden; background:radial-gradient(circle at 13% 50%,rgba(255,224,101,.26),transparent 25%),radial-gradient(circle at 92% 12%,rgba(76,231,216,.2),transparent 30%),linear-gradient(112deg,rgba(91,35,164,.96),rgba(31,19,91,.98) 48%,rgba(12,35,75,.96)); border:2px solid rgba(255,217,91,.72); border-radius:24px 10px 24px 10px; box-shadow:inset 0 0 0 2px rgba(255,255,255,.06),inset 0 -22px 35px rgba(7,4,35,.2),0 14px 28px rgba(4,2,29,.38),0 0 22px rgba(255,184,57,.1); clip-path:polygon(0 13px,13px 0,calc(100% - 25px) 0,100% 25px,100% calc(100% - 13px),calc(100% - 13px) 100%,25px 100%,0 calc(100% - 25px)); animation:person-sponsor-enter .72s cubic-bezier(.16,.86,.24,1) both; }
  .sponsor-person::before { position:absolute; top:-75%; left:-28%; z-index:2; width:24%; height:250%; content:""; background:linear-gradient(90deg,transparent,rgba(255,247,190,.22),transparent); transform:rotate(17deg); animation:person-sponsor-shine 5.4s ease-in-out infinite; pointer-events:none; }
  .sponsor-person::after { position:absolute; right:18px; bottom:5px; width:54px; height:3px; content:""; background:linear-gradient(90deg,#ff59aa,#ffd45d,#4ce2d4); border-radius:9px; box-shadow:0 0 11px rgba(255,196,68,.45); }
  .person-atmosphere { position:absolute; inset:0; overflow:hidden; pointer-events:none; }.person-atmosphere::before{position:absolute;right:-8%;bottom:-75%;width:55%;aspect-ratio:1;content:"";border:18px solid rgba(80,229,216,.08);border-radius:50%;box-shadow:0 0 0 18px rgba(255,83,167,.035)}
  .person-atmosphere i { position:absolute; width:6px; aspect-ratio:1; background:#fff0a0; transform:rotate(45deg); box-shadow:0 0 9px #ffd85b; animation:sponsor-spark 1.8s ease-in-out infinite alternate; }.person-atmosphere i:nth-child(1){top:18%;left:27%}.person-atmosphere i:nth-child(2){top:25%;right:8%;background:#50e4d5;box-shadow:0 0 9px #50e4d5;animation-delay:-.6s}.person-atmosphere i:nth-child(3){right:18%;bottom:20%;background:#ff65ad;box-shadow:0 0 9px #ff65ad;animation-delay:-1.1s}
  .person-medallion { position:relative; z-index:3; display:grid; width:clamp(72px,4.65vw,88px); aspect-ratio:1; place-items:center; color:#50204d; background:radial-gradient(circle at 31% 23%,#fff 0 6%,#fff4b4 15%,#ffd052 52%,#ef7957 80%); border:4px solid #fff3ae; border-radius:50%; box-shadow:0 0 0 5px rgba(255,199,65,.14),0 11px 22px rgba(8,3,34,.4),0 0 22px rgba(255,195,56,.24); }
  .person-medallion::before { position:absolute; inset:-10px; content:""; border:1px dashed rgba(83,232,218,.6); border-radius:50%; animation:person-medallion-orbit 9s linear infinite; }
  .person-medallion b { font-size:clamp(1.05rem,1.3vw,1.42rem); font-weight:1000; letter-spacing:-.04em; line-height:1; }
  .person-medallion>i { position:absolute; right:-4px; bottom:6px; width:13px; aspect-ratio:1; background:#51e4d5; border:2px solid #eafffb; border-radius:50%; box-shadow:0 0 11px #4de0d2; }
  .person-medallion>em { position:absolute; top:-12px; display:grid; width:27px; aspect-ratio:1; place-items:center; color:#5c2352; background:linear-gradient(145deg,#fff4a6,#ffc43f); border:2px solid #fff4bd; border-radius:50%; box-shadow:0 6px 11px rgba(7,3,32,.3); font-size:.56rem; font-style:normal; }
  .person-copy { position:relative; z-index:3; display:flex; min-width:0; flex-direction:column; justify-content:center; padding-bottom:12px; }
  .person-copy>span { display:flex; align-items:center; gap:7px; margin-bottom:5px; color:#66eadb; font-size:clamp(.44rem,.52vw,.58rem); font-weight:950; line-height:1; letter-spacing:.12em; }.person-copy>span i{width:18px;height:1px;background:linear-gradient(90deg,transparent,#66eadb)}.person-copy>span i:last-child{background:linear-gradient(90deg,#66eadb,transparent)}
  .sponsor-person strong { display:-webkit-box; overflow:hidden; color:#fff4ac; font-size:clamp(1rem,1.28vw,1.42rem); font-weight:1000; line-height:1.04; letter-spacing:.01em; text-shadow:0 0 18px rgba(255,203,70,.18),0 5px 13px rgba(4,2,27,.62); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .sponsor-person small { display:-webkit-box; margin-top:clamp(4px,.35vw,7px); overflow:hidden; color:#fff; font-size:clamp(.58rem,.72vw,.82rem); font-weight:680; line-height:1.12; text-shadow:0 3px 9px rgba(3,2,25,.62); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .sponsor-person.particular strong { max-width:94%; font-size:clamp(1.22rem,1.58vw,1.72rem); line-height:1.04; }
  .thanks-ribbon { position:absolute; right:clamp(16px,1.15vw,23px); bottom:10px; z-index:3; color:rgba(255,232,139,.88); font-size:clamp(.3rem,.37vw,.42rem); font-weight:950; letter-spacing:.12em; text-shadow:0 0 9px rgba(255,195,64,.25); }
  .logo-count-1 .sponsor-logo { padding:8px 12px; }
  .logo-count-2 .sponsor-logo { padding:5px 8px; }
  .logo-count-7 .sponsor-logo,.logo-count-8 .sponsor-logo { padding:6px 7px; }
  .sponsor-bingo-decor { position:absolute; right:16px; bottom:7px; left:16px; z-index:1; height:126px; pointer-events:none; }
  .sponsor-content.has-person + .sponsor-bingo-decor { opacity:.2; filter:saturate(.8) brightness(.8); transform:translateY(9px) scale(.97); }
  .sponsor-bingo-decor::before { position:absolute; right:12%; bottom:3px; left:12%; height:22px; content:""; background:radial-gradient(ellipse,rgba(255,199,63,.22),rgba(141,82,237,.1) 45%,transparent 72%); filter:blur(7px); }
  .decor-ticket { position:absolute; bottom:13px; left:50%; display:grid; width:108px; height:88px; grid-template-rows:22px minmax(0,1fr); gap:4px; padding:7px; background:linear-gradient(155deg,rgba(52,29,102,.96),rgba(10,18,49,.98)); border:2px solid rgba(255,207,77,.76); border-radius:12px; box-shadow:inset 0 1px rgba(255,255,255,.15),0 12px 19px rgba(4,2,27,.38),0 0 12px rgba(255,193,55,.08); transform-origin:50% 115%; }
  .decor-ticket::after { position:absolute; top:4px; right:8px; left:8px; height:1px; content:""; background:linear-gradient(90deg,transparent,rgba(255,255,255,.34),transparent); }
  .decor-ticket.ticket-1 { z-index:1; transform:translateX(-120%) rotate(-11deg) scale(.9); opacity:.78; }.decor-ticket.ticket-2{z-index:3;transform:translateX(-50%)}.decor-ticket.ticket-3{z-index:2;transform:translateX(20%) rotate(11deg) scale(.9);opacity:.82}
  .decor-ticket-head { display:grid; grid-template-columns:repeat(5,1fr); gap:3px; }.decor-ticket-head b{display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#e052a2,#774fe0);border:1px solid rgba(255,255,255,.44);border-radius:4px;font-size:.36rem;line-height:1;text-shadow:0 2px 4px rgba(30,4,52,.4)}.decor-ticket-head b:nth-child(1){background:linear-gradient(145deg,#3ed8cf,#5568d8)}.decor-ticket-head b:nth-child(5){background:linear-gradient(145deg,#ffd252,#e46f6e)}
  .decor-ticket-grid { display:grid; min-height:0; grid-template-columns:repeat(5,1fr); gap:3px; }.decor-ticket-grid i{position:relative;background:rgba(22,32,65,.9);border:1px solid rgba(111,137,178,.25);border-radius:3px}.decor-ticket-grid i.marked{background:linear-gradient(145deg,#f178dc,#8057eb);border-color:rgba(255,225,255,.75);box-shadow:0 0 6px rgba(190,83,235,.35)}.decor-ticket-grid i.marked::after{position:absolute;inset:32%;content:"";background:#fff;border-radius:50%;box-shadow:0 0 5px #fff}.decor-ticket-grid i.free{background:rgba(255,196,65,.18);border-color:rgba(255,215,105,.58)}.decor-ticket-grid i.free::after{position:absolute;inset:27%;content:"";background:#ffd25e;clip-path:polygon(50% 0,61% 36%,100% 38%,69% 60%,80% 100%,50% 76%,20% 100%,31% 60%,0 38%,39% 36%)}
  .decor-ball { position:absolute; z-index:5; display:flex; width:38px; aspect-ratio:1; align-items:center; justify-content:center; flex-direction:column; color:#fff;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#f275bd 22%,#c9419e 63%,#5d2b87);border:2px solid rgba(255,255,255,.86);border-radius:50%;box-shadow:0 7px 13px rgba(5,2,27,.36),0 0 10px rgba(255,76,162,.22);font-size:.38rem;font-weight:900}.decor-ball small{font-size:.19rem;line-height:1}.decor-ball.ball-left{bottom:13px;left:5%;transform:rotate(-12deg)}.decor-ball.ball-right{right:5%;bottom:24px;background:radial-gradient(circle at 32% 22%,#fff 0 7%,#ffe072 22%,#ee8b4c 63%,#a33a75);transform:rotate(10deg)}
  .sponsor-grid-empty { display:flex; min-height:0; grid-column:1/-1; align-items:center; justify-content:center; flex-direction:column; padding:16px; color:#fff; background:rgba(17,13,56,.24); border:1px dashed rgba(112,231,219,.25); border-radius:15px; text-align:center; }
  .sponsor-grid-empty svg { width:27px; height:27px; color:#ffd059; filter:drop-shadow(0 3px 7px rgba(255,200,60,.35)); }.sponsor-grid-empty strong{margin-top:7px;font-size:.68rem}.sponsor-grid-empty small{margin-top:3px;color:#aaa7cf;font-size:.42rem}

  @keyframes channel-ball-float{to{transform:translate(11px,-18px) rotate(12deg)}}
  @keyframes channel-star{50%{opacity:.3;transform:rotate(90deg) scale(.65)}}
  @keyframes sponsor-atmosphere{to{transform:translateY(-8%) scale(1.08);opacity:.9}}
  @keyframes sponsor-spark{to{opacity:.35;transform:scale(.65)}}
  @keyframes sponsor-logo-enter{from{opacity:0;transform:translateY(10px) scale(.94);filter:blur(2px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}
  @keyframes person-sponsor-shine{0%,62%{transform:translateX(-70%) rotate(17deg);opacity:0}72%{opacity:1}100%{transform:translateX(520%) rotate(17deg);opacity:0}}
  @keyframes person-sponsor-enter{from{opacity:0;transform:translateX(28px) scale(.96);filter:blur(3px) brightness(1.4)}to{opacity:1;transform:translateX(0) scale(1);filter:blur(0) brightness(1)}}
  @keyframes person-medallion-orbit{to{transform:rotate(360deg)}}

  @keyframes latest-column{0%{opacity:.35;transform:scale(.72)}55%{transform:scale(1.09)}100%{opacity:1;transform:scale(1)}}
  @keyframes bulb-live{to{opacity:.42;transform:scale(.72)}}
  @keyframes sponsor-star-pulse{50%{transform:rotate(8deg) scale(1.08);box-shadow:0 7px 14px rgba(30,5,48,.3),0 0 22px rgba(255,194,58,.34)}}
  @keyframes sponsor-sweep{0%,15%{transform:translateX(-70%) rotate(9deg)}60%,100%{transform:translateX(120%) rotate(9deg)}}
  @keyframes sponsor-orbit{to{transform:rotate(360deg)}}
  @keyframes marquee-pulse{to{opacity:.35;transform:scale(.72)}}

  @keyframes scene-drift{to{transform:translate(4%,-5%) rotate(8deg) scale(1.08)}}
  @keyframes sparkle{50%{opacity:.35;transform:rotate(45deg) scale(.75)}}
  @keyframes live-pulse{50%{box-shadow:0 0 0 10px rgba(255,87,142,0),0 0 15px #ff578e}}
  @keyframes orbit-turn{to{transform:rotate(360deg)}}
  @keyframes ball-arrive{0%{opacity:.25;transform:scale(.45) rotate(-28deg)}58%{transform:scale(1.08) rotate(4deg)}100%{opacity:1;transform:scale(1)}}
  @keyframes latest-bounce{50%{transform:scale(1.18)}}
  @keyframes slot-in{0%{opacity:0;clip-path:inset(48% 3% 48% 3% round 32px);transform:translateY(28px) scale(.965);filter:brightness(1.8) saturate(.7)}45%{opacity:1;clip-path:inset(0 3% 0 3% round 32px)}100%{opacity:1;clip-path:inset(0 round 32px);transform:translateY(0) scale(1);filter:brightness(1) saturate(1)}}
  @keyframes slot-out{0%{opacity:1;clip-path:inset(0 round 32px);transform:translateY(0) scale(1);filter:brightness(1)}55%{opacity:.72;clip-path:inset(0 8% 0 8% round 32px)}100%{opacity:0;clip-path:inset(48% 16% 48% 16% round 32px);transform:translateY(-22px) scale(.97);filter:brightness(1.55) blur(2px)}}

  @media(prefers-reduced-motion:reduce){.slot-entering>.live-slot,.slot-leaving>.live-slot{animation-duration:.18s}}

  @media(max-aspect-ratio:4/3){
    grid-template-columns:minmax(0,32%) minmax(250px,21%) minmax(0,47%);
    .lane-balls{gap:2px}.lane-balls>span{font-size:.48rem}.score-lane{grid-template-columns:58px minmax(0,1fr);padding-right:8px}.lane-letter small{display:none}.current-ball{width:130px}.figure-pattern{width:105px}
  }
`;
