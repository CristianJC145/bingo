import { useEffect, useRef } from "react";
import styled from "styled-components";

interface ElectronicBallMachineProps {
  drawnNumbers: number[];
  latestBall?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const palette = [
  { fill: "#4bddc9", shade: "#249b8d", text: "#10211e" },
  { fill: "#68a1ff", shade: "#3f68c8", text: "#ffffff" },
  { fill: "#9a7cff", shade: "#6548ce", text: "#ffffff" },
  { fill: "#db75f3", shade: "#9744b2", text: "#ffffff" },
  { fill: "#ffc766", shade: "#d99028", text: "#241a09" },
];

const colorFor = (number: number) => palette[Math.min(4, Math.floor((number - 1) / 15))];
const letterFor = (number?: number) => number ? ["B", "I", "N", "G", "O"][Math.min(4, Math.floor((number - 1) / 15))] : "—";
const seeded = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const ElectronicBallMachine: React.FC<ElectronicBallMachineProps> = ({ drawnNumbers, latestBall }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const remainingRef = useRef(new Set(Array.from({ length: 75 }, (_, index) => index + 1)));
  const dimensionsRef = useRef({ width: 600, height: 420, dpr: 1 });
  const rotationRef = useRef(0);

  useEffect(() => {
    const remaining = new Set(Array.from({ length: 75 }, (_, index) => index + 1).filter((number) => !drawnNumbers.includes(number)));
    remainingRef.current = remaining;
    particlesRef.current = particlesRef.current.filter((particle) => remaining.has(particle.id));

    const { width, height } = dimensionsRef.current;
    const chamberRadiusX = width * .45;
    const chamberRadiusY = height * .41;
    const ballRadius = Math.max(7.5, Math.min(12, chamberRadiusY / 15.5));
    const centerX = width / 2;
    const centerY = height / 2;
    remaining.forEach((number) => {
      if (particlesRef.current.some((particle) => particle.id === number)) return;
      const angle = number * 2.399963;
      const distance = .16 + seeded(number) * .68;
      particlesRef.current.push({
        id: number,
        x: centerX + Math.cos(angle) * chamberRadiusX * distance,
        y: centerY + Math.sin(angle) * chamberRadiusY * distance,
        vx: (seeded(number + 80) - .5) * 1.4,
        vy: (seeded(number + 160) - .5) * 1.4,
        radius: ballRadius,
      });
    });
  }, [drawnNumbers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let animationFrame = 0;
    let previousTime = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const previous = dimensionsRef.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(240, rect.width);
      const height = Math.max(240, rect.height);
      const scaleX = width / previous.width;
      const scaleY = height / previous.height;
      particlesRef.current.forEach((particle) => { particle.x *= scaleX; particle.y *= scaleY; });
      dimensionsRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const frame = (time: number) => {
      const delta = Math.min(2, Math.max(.35, (time - previousTime) / 16.67));
      previousTime = time;
      const { width, height, dpr } = dimensionsRef.current;
      const centerX = width / 2;
      const centerY = height / 2;
      const chamberRadiusX = width * .455;
      const chamberRadiusY = height * .42;
      const particles = particlesRef.current;
      rotationRef.current += .026 * delta;

      particles.forEach((particle) => {
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const normalizedDistance = Math.hypot(dx / chamberRadiusX, dy / chamberRadiusY);
        const swirl = normalizedDistance < .72 ? .018 : .007;
        particle.vx += (-dy / distance) * swirl * delta;
        particle.vy += (dx / distance) * swirl * delta + .055 * delta;
        particle.vx += Math.sin(time * .0023 + particle.id) * .006 * delta;
        if (particle.y > centerY + chamberRadiusY * .42 && Math.abs(particle.x - centerX) < chamberRadiusX * .66) {
          particle.vy -= .15 * delta;
          particle.vx += Math.sin(particle.id * 2.1 + time * .004) * .055 * delta;
        }
        particle.vx *= Math.pow(.995, delta);
        particle.vy *= Math.pow(.995, delta);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        const ellipseX = particle.x - centerX;
        const ellipseY = particle.y - centerY;
        const boundaryDistance = Math.hypot(ellipseX / chamberRadiusX, ellipseY / chamberRadiusY);
        const limit = 1 - particle.radius / Math.min(chamberRadiusX, chamberRadiusY) - .012;
        if (boundaryDistance > limit) {
          const projection = limit / boundaryDistance;
          particle.x = centerX + ellipseX * projection;
          particle.y = centerY + ellipseY * projection;
          const gradientX = (particle.x - centerX) / (chamberRadiusX * chamberRadiusX);
          const gradientY = (particle.y - centerY) / (chamberRadiusY * chamberRadiusY);
          const gradientLength = Math.hypot(gradientX, gradientY) || 1;
          const nx = gradientX / gradientLength;
          const ny = gradientY / gradientLength;
          const normalVelocity = particle.vx * nx + particle.vy * ny;
          if (normalVelocity > 0) {
            particle.vx -= 1.72 * normalVelocity * nx;
            particle.vy -= 1.72 * normalVelocity * ny;
          }
        }
      });

      for (let pass = 0; pass < 2; pass++) {
        for (let first = 0; first < particles.length; first++) {
          for (let second = first + 1; second < particles.length; second++) {
            const a = particles[first];
            const b = particles[second];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.hypot(dx, dy) || .001;
            const minimum = a.radius + b.radius;
            if (distance >= minimum) continue;
            const nx = dx / distance;
            const ny = dy / distance;
            const correction = (minimum - distance) * .51;
            a.x -= nx * correction; a.y -= ny * correction;
            b.x += nx * correction; b.y += ny * correction;
            const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relativeVelocity < 0) {
              const impulse = -(1.55 * relativeVelocity) / 2;
              a.vx -= impulse * nx; a.vy -= impulse * ny;
              b.vx += impulse * nx; b.vy += impulse * ny;
            }
          }
        }
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(centerX, centerY);
      context.scale(1, chamberRadiusY / chamberRadiusX);
      context.rotate(rotationRef.current);
      context.strokeStyle = "rgba(187,198,214,.27)";
      context.lineWidth = Math.max(7, chamberRadiusY * .045);
      context.lineCap = "round";
      for (let arm = 0; arm < 3; arm++) {
        context.rotate((Math.PI * 2) / 3);
        context.beginPath(); context.moveTo(-chamberRadiusX * .52, 0); context.lineTo(chamberRadiusX * .52, 0); context.stroke();
      }
      context.restore();

      particles.forEach((particle) => {
        const colors = colorFor(particle.id);
        const gradient = context.createRadialGradient(particle.x - particle.radius * .35, particle.y - particle.radius * .45, 1, particle.x, particle.y, particle.radius);
        gradient.addColorStop(0, "#ffffff"); gradient.addColorStop(.22, colors.fill); gradient.addColorStop(1, colors.shade);
        context.beginPath(); context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill();
        context.strokeStyle = "rgba(255,255,255,.58)"; context.lineWidth = 1; context.stroke();
        if (particle.radius >= 7.2) {
          context.fillStyle = colors.text; context.font = `800 ${Math.max(6.5, particle.radius * .72)}px Poppins`; context.textAlign = "center"; context.textBaseline = "middle";
          context.fillText(String(particle.id), particle.x, particle.y + .4);
        }
      });
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect(); };
  }, []);

  const latestLetter = letterFor(latestBall);
  return <MachineStyle>
    <div className="tombola-wrap"><div className="machine-glow" /><div className="rear-support left" /><div className="physical-chamber"><canvas ref={canvasRef} /><div className="glass-highlight" /><div className="glass-highlight secondary" /><div className="axle-hub"><i /></div></div><div className="rear-support right" /><div className="tombola-base"><i /><span /></div></div>
    <div className="extraction-system"><div className="tube-neck" /><div className="glass-tube">{latestBall && <><span className="travelling-ball" key={`travelling-${latestBall}`}><small>{latestLetter}</small><strong>{latestBall}</strong></span><span className="settled-ball" key={`settled-${latestBall}`}><small>{latestLetter}</small><strong>{latestBall}</strong></span></>}</div><div className="tube-outlet"><i /></div></div>
  </MachineStyle>;
};

export default ElectronicBallMachine;

const MachineStyle = styled.div`
  display:grid;width:100%;height:100%;min-height:0;grid-template-columns:minmax(360px,1fr) 102px;align-items:center;gap:.35rem;
  .tombola-wrap{position:relative;width:100%;max-width:760px;justify-self:center;padding:1.25rem 1.45rem 3.5rem}
  .machine-glow{position:absolute;inset:8% 8% 12%;background:radial-gradient(ellipse,rgba(109,73,255,.22),rgba(23,218,204,.08) 45%,transparent 72%);filter:blur(25px);pointer-events:none}
  .physical-chamber{position:relative;z-index:2;width:100%;aspect-ratio:1.42;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,rgba(46,48,74,.38),rgba(6,8,17,.92) 70%),linear-gradient(180deg,rgba(176,199,223,.08),rgba(7,9,17,.28));border:clamp(9px,.85vw,13px) solid #8993a4;border-top-color:#e4e9f0;border-right-color:#aab4c4;border-bottom-color:#48505f;border-left-color:#707a8a;border-radius:46% / 49%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.24),inset 0 18px 35px rgba(255,255,255,.07),inset 0 -42px 75px rgba(0,0,0,.52),0 20px 45px rgba(0,0,0,.38),0 0 0 3px rgba(37,41,53,.75)}
  .physical-chamber::before{position:absolute;inset:7px;z-index:3;content:"";border:1px solid rgba(255,255,255,.2);border-radius:inherit;box-shadow:inset 0 0 30px rgba(131,163,196,.08);pointer-events:none}
  canvas{position:absolute;inset:0;width:100%;height:100%}
  .glass-highlight{position:absolute;top:8%;left:12%;z-index:4;width:12%;height:57%;background:linear-gradient(100deg,rgba(255,255,255,.25),rgba(255,255,255,.015));border-radius:50%;transform:rotate(24deg);filter:blur(.4px);pointer-events:none}.glass-highlight.secondary{top:13%;right:15%;left:auto;width:5%;height:34%;opacity:.45;transform:rotate(-18deg)}
  .axle-hub{position:absolute;top:50%;left:50%;z-index:5;display:grid;width:58px;height:58px;place-items:center;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 28%,#f7f9fc,#a7b0bf 32%,#4e5665 68%,#242a35);border:2px solid #dce2ea;border-radius:50%;box-shadow:0 7px 18px rgba(0,0,0,.38),inset 0 0 0 5px rgba(34,39,50,.45)}.axle-hub i{width:23px;height:23px;background:radial-gradient(circle at 35% 30%,#9b87ff,#5036c8 65%,#251b61);border:2px solid #c9beff;border-radius:50%;box-shadow:0 0 12px rgba(131,103,255,.35)}
  .rear-support{position:absolute;top:44%;z-index:1;width:42px;height:105px;background:linear-gradient(90deg,#3d4553,#d3d9e1 38%,#727c8c 68%,#303744);border:1px solid #c3cad5;box-shadow:0 10px 24px rgba(0,0,0,.35)}.rear-support::before{position:absolute;top:-16px;left:-8px;width:56px;height:56px;content:"";background:radial-gradient(circle at 35% 30%,#f5f7fa,#919baa 48%,#323947 72%);border:2px solid #d9dee6;border-radius:50%;box-shadow:inset 0 0 0 9px #454d5b}.rear-support.left{left:.55rem;border-radius:8px 0 0 8px}.rear-support.right{right:.55rem;border-radius:0 8px 8px 0}
  .tombola-base{position:absolute;right:10%;bottom:.35rem;left:10%;z-index:6;height:28px;background:linear-gradient(180deg,#d8dde5 0,#7b8492 26%,#343b48 63%,#181d25);border:1px solid #dce1e8;border-radius:7px 7px 18px 18px;box-shadow:0 14px 24px rgba(0,0,0,.35),inset 0 1px rgba(255,255,255,.7)}.tombola-base::before{position:absolute;bottom:25px;left:50%;width:48%;height:44px;content:"";transform:translateX(-50%);background:linear-gradient(90deg,#353d4a,#aeb6c2 17%,#6f7887 50%,#aeb6c2 83%,#353d4a);clip-path:polygon(13% 100%,22% 0,78% 0,87% 100%);filter:drop-shadow(0 5px 5px rgba(0,0,0,.25))}.tombola-base i,.tombola-base span{position:absolute;bottom:-5px;width:52px;height:10px;background:#1d222b;border-radius:0 0 8px 8px}.tombola-base i{left:8%}.tombola-base span{right:8%}
  .extraction-system{position:relative;z-index:3;display:flex;height:82%;min-height:330px;align-items:center;flex-direction:column}
  .tube-neck{width:82px;height:23px;flex:0 0 23px;background:linear-gradient(180deg,#eef1f5,#8d97a6 38%,#424a58 74%,#232a34);border:1px solid #dfe4ea;border-radius:11px 11px 5px 5px;box-shadow:0 7px 18px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.8)}
  .glass-tube{position:relative;width:62px;flex:1;overflow:hidden;background:linear-gradient(90deg,rgba(85,111,134,.22),rgba(255,255,255,.14) 38%,rgba(94,135,149,.08) 58%,rgba(11,20,30,.28));border-right:5px solid #697482;border-left:5px solid #697482;box-shadow:inset 0 0 22px rgba(84,226,216,.08),0 9px 18px rgba(0,0,0,.22)}
  .glass-tube::after{position:absolute;top:0;bottom:0;left:8px;width:6px;content:"";background:linear-gradient(90deg,rgba(255,255,255,.3),transparent);border-radius:50%}
  .tube-outlet{position:relative;width:82px;height:29px;background:linear-gradient(180deg,#dce2e9,#7c8795 40%,#333b48);border:1px solid #dce2e9;border-radius:5px 5px 14px 14px;box-shadow:0 7px 15px rgba(0,0,0,.3)}.tube-outlet i{position:absolute;right:-34px;bottom:6px;width:39px;height:16px;background:linear-gradient(180deg,#b8c1cc,#4b5564);border:1px solid #d4dae2;border-radius:0 8px 8px 0}
  .travelling-ball,.settled-ball{position:absolute;left:7px;z-index:2;display:flex;width:44px;height:44px;align-items:center;justify-content:center;flex-direction:column;color:#1d160a;background:radial-gradient(circle at 35% 25%,#fffdf0,#ffd85c 55%,#f18b28);border:3px solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 8px 22px rgba(255,198,63,.48)}.travelling-ball{top:8px;animation:physical-extract 1.25s cubic-bezier(.18,.65,.22,1) forwards}.settled-ball{bottom:9px;opacity:0;animation:settle-out .28s 1.15s ease forwards}.travelling-ball small,.settled-ball small{font-size:.29rem;line-height:1}.travelling-ball strong,.settled-ball strong{font-size:.72rem;line-height:1.1}
  @keyframes physical-extract{0%{opacity:0;transform:translateY(-35px) scale(.65) rotate(-80deg)}15%{opacity:1}88%{opacity:1}100%{opacity:0;transform:translateY(calc(100% + 210px)) scale(1) rotate(240deg)}}
  @keyframes settle-out{from{opacity:0;transform:translate(-20px,-10px) scale(.7)}to{opacity:1;transform:translate(0,0) scale(1)}}
`;
