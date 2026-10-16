import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { getSponsorUrl, SponsorAsset } from "../../bingoCustomization/services/sponsors.service";
import { PreparedLogo, prepareSponsorLogo } from "../utils/prepareSponsorLogo";

interface SponsorStageProps {
  sponsor?: SponsorAsset;
}

/**
 * Fracción del área del hueco que puede ocupar un logo. Sin este tope, uno cuadrado
 * llenaría el doble de superficie que uno alargado y la rotación se vería a saltos.
 */
const TARGET_AREA_FILL = 0.66;
/**
 * Ampliación máxima sobre la resolución real del archivo. Existe para que un logo
 * pequeño no acabe convertido en una mancha, pero en transmisión una marca diminuta
 * se nota más que una ligera pérdida de nitidez, así que se permite bastante margen.
 */
const MAX_UPSCALE = 2.4;
/** Proporciones a partir de las cuales el logo recibe casi todo el hueco. */
const EXTREME_ASPECT = 3;

interface Size { width: number; height: number; }

const SponsorStage: React.FC<SponsorStageProps> = ({ sponsor }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const [logo, setLogo] = useState<PreparedLogo | null>(null);

  // El hueco cambia con la resolución de la escena de OBS, no solo al cargar.
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sponsor || sponsor.mediaType !== "image") { setLogo(null); return; }
    let active = true;
    prepareSponsorLogo(getSponsorUrl(sponsor.url))
      .then((prepared) => { if (active) setLogo(prepared); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [sponsor]);

  if (!sponsor) {
    return (
      <SponsorStageStyle ref={boxRef}>
        <div className="stage-empty">
          <span><AppIcon icon="star" /></span>
          <strong>TU MARCA AQUÍ</strong>
          <small>Patrocinador de la transmisión</small>
        </div>
      </SponsorStageStyle>
    );
  }

  if (sponsor.mediaType === "video") {
    return (
      <SponsorStageStyle ref={boxRef} key={sponsor.id}>
        <video className="stage-video" src={getSponsorUrl(sponsor.url)} autoPlay muted playsInline loop />
      </SponsorStageStyle>
    );
  }

  /*
   * Tamaño final del logo. Se toma el menor de tres límites, así que nunca se recorta,
   * nunca se deforma y nunca se amplía más de lo que su resolución permite:
   *   1. lo que cabe en el hueco,
   *   2. el tope de superficie que iguala logos de proporciones muy distintas,
   *   3. el tope de ampliación sobre los píxeles reales.
   */
  let rendered: Size | null = null;
  let plateInset = 0;
  if (logo && box.width > 0 && box.height > 0 && logo.width > 0) {
    const isExtreme = logo.aspect > EXTREME_ASPECT || logo.aspect < 1 / EXTREME_ASPECT;
    /*
     * Un logo muy alargado ya está limitado por su lado corto, así que margen y placa
     * se aprietan para que aproveche casi entero el lado que lo restringe. Uno compacto
     * puede permitirse respirar.
     */
    const shortSide = Math.min(box.width, box.height);
    const margin = shortSide * (isExtreme ? 0.02 : 0.08);
    plateInset = logo.needsLightPlate ? shortSide * (isExtreme ? 0.035 : 0.05) : 0;

    const usableW = Math.max(1, box.width - (margin + plateInset) * 2);
    const usableH = Math.max(1, box.height - (margin + plateInset) * 2);

    const fitScale = Math.min(usableW / logo.width, usableH / logo.height);
    const areaScale = Math.sqrt((usableW * usableH * TARGET_AREA_FILL) / (logo.width * logo.height));
    const scale = Math.min(fitScale, areaScale, MAX_UPSCALE);

    rendered = { width: logo.width * scale, height: logo.height * scale };
  }

  return (
    <SponsorStageStyle ref={boxRef} key={sponsor.id}>
      <span className="stage-halo" aria-hidden="true" />
      {logo && rendered ? (
        <div
          className={`logo-holder ${logo.needsLightPlate ? "on-plate" : ""}`}
          style={{ padding: `${plateInset}px` }}
        >
          <img
            src={logo.src}
            alt={sponsor.name}
            style={{ width: `${rendered.width}px`, height: `${rendered.height}px` }}
          />
          <span className="logo-sheen" aria-hidden="true" />
        </div>
      ) : (
        // Mientras se mide el logo se muestra la imagen tal cual, sin saltos visibles.
        <img className="logo-raw" src={getSponsorUrl(sponsor.url)} alt={sponsor.name} />
      )}
    </SponsorStageStyle>
  );
};

export default SponsorStage;

const SponsorStageStyle = styled.div`
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 205, 90, .12), transparent 68%),
    linear-gradient(160deg, rgba(255, 255, 255, .05), rgba(8, 12, 38, .5));
  border: 1px solid rgba(255, 220, 111, .18);
  border-radius: 16px;
  box-shadow: inset 0 1px rgba(255, 255, 255, .08);
  animation: stage-in .45s cubic-bezier(.2, .9, .3, 1.15);

  @keyframes stage-in { from { opacity: 0; transform: scale(.96); } }

  /* Halo cálido que respira detrás de la marca. */
  .stage-halo {
    position: absolute;
    width: 78%;
    height: 78%;
    background: radial-gradient(circle, rgba(255, 214, 120, .18), transparent 66%);
    filter: blur(18px);
    animation: halo-breathe 4.2s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes halo-breathe { 50% { opacity: .5; transform: scale(1.12); } }

  .logo-holder { position: relative; display: grid; place-items: center; max-width: 100%; max-height: 100%; border-radius: 14px; }
  .logo-holder img { display: block; object-fit: contain; }

  /*
   * Placa clara para logos oscuros con fondo transparente: sin ella se pierden
   * contra el panel. Solo se aplica cuando el análisis detecta que hace falta.
   */
  .logo-holder.on-plate {
    background: linear-gradient(160deg, #ffffff, #eef1f6);
    box-shadow: 0 10px 26px rgba(0, 0, 0, .45), inset 0 0 0 1px rgba(255, 255, 255, .8);
  }

  /* Destello que cruza la marca cada pocos segundos. */
  .logo-sheen {
    position: absolute;
    top: 0;
    left: -70%;
    width: 45%;
    height: 100%;
    background: linear-gradient(105deg, transparent, rgba(255, 255, 255, .38), transparent);
    animation: sheen-sweep 5.5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes sheen-sweep { 0%, 12% { left: -70%; } 46%, 100% { left: 130%; } }

  .stage-video, .logo-raw { width: 100%; height: 100%; object-fit: contain; }

  .stage-empty { display: flex; align-items: center; justify-content: center; flex-direction: column; color: #8a7ca0; text-align: center; }
  .stage-empty > span {
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    color: #ffe16b;
    background: linear-gradient(145deg, rgba(255, 79, 163, .26), rgba(108, 60, 255, .26));
    border: 1px solid rgba(255, 255, 255, .13);
    border-radius: 16px;
    box-shadow: 0 12px 25px rgba(7, 5, 30, .3);
  }
  .stage-empty strong { margin-top: .6rem; color: #ded6e9; font-size: .72rem; letter-spacing: .08em; }
  .stage-empty small { margin-top: .22rem; font-size: .46rem; }
`;
