import React from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import AppButton from "../components/Buttons/AppButton";
import AppIcon from "../components/AppIcon";
import { useAuth } from "../../modules/auth/context/AuthContext";
import { useSlotLive } from "../../modules/slotMachine/context/SlotLiveContext";

interface AppNavbarProps { toggleSidebar: () => void; }

const pageMeta = [
  { match: "/admin/dashboard", eyebrow: "Resumen general", title: "Dashboard" },
  { match: "/admin/usuarios", eyebrow: "Administración", title: "Usuarios" },
  { match: "/admin/asignaciones", eyebrow: "Administración", title: "Asignación de cartones" },
  { match: "/registro", eyebrow: "Registro", title: "Registro de cartones" },
  { match: "/game", eyebrow: "Operación en vivo", title: "Panel de juego" },
  { match: "/sorteo", eyebrow: "Dinámica en vivo", title: "Máquina de la suerte" },
  { match: "/figures", eyebrow: "Configuración", title: "Figuras ganadoras" },
  { match: "/resources", eyebrow: "Recursos", title: "Generador de cartones" },
  { match: "/printing", eyebrow: "Recursos", title: "Impresión de cartones" },
  { match: "/customization", eyebrow: "Preferencias", title: "Personalización" },
];

const AppNavbar: React.FC<AppNavbarProps> = ({ toggleSidebar }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { state: slotState, hideWinner, hideMachine } = useSlotLive();
  const current = pageMeta.find((item) => location.pathname.startsWith(item.match)) ?? pageMeta[0];

  return (
    <AppNavbarStyle>
      <header className="app-header">
        <div className="header-left">
          <AppButton variant="light" icon="bars" className="menu-trigger" onClick={toggleSidebar} ariaLabel="Abrir menú" />
          <div className="route-title">
            <span>{current.eyebrow}</span>
            <strong>{current.title}</strong>
          </div>
        </div>
        <div className={`header-right ${isAdmin ? "has-broadcast" : ""}`}>
          {/* Aviso persistente: la máquina sigue al aire aunque estemos en otro módulo. */}
          {slotState.active && (
            <div className="slot-live-alert">
              <span className="alert-dot" />
              <div className="alert-copy">
                <strong>Máquina en vivo</strong>
                <small>{slotState.result ? `Cartón N° ${slotState.result.cardNumber}` : "En transmisión"}</small>
              </div>
              <div className="alert-actions">
                {slotState.winnerVisible && (
                  <button type="button" onClick={hideWinner} title="Ocultar solo el cartón ganador">
                    <AppIcon icon="trophy" /><span>Ganador</span>
                  </button>
                )}
                <button type="button" className="danger" onClick={hideMachine} title="Ocultar la máquina en OBS">
                  <AppIcon icon="power-off" /><span>Máquina</span>
                </button>
              </div>
            </div>
          )}
          <div className="system-status"><span className="status-dot" /><span><strong>Sistema disponible</strong><small>Servidor local</small></span></div>
          {isAdmin && <a className="broadcast-link" href="/obs" target="_blank" rel="noreferrer"><span>Vista OBS</span></a>}
        </div>
      </header>
    </AppNavbarStyle>
  );
};

export default AppNavbar;

const AppNavbarStyle = styled.div`
  .app-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    height: var(--navbar-height);
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(1rem, 3vw, 2.5rem);
    background: rgba(12, 15, 21, .78);
    border-bottom: 1px solid var(--border-subtle);
    backdrop-filter: blur(18px);
  }
  .header-left, .header-right, .system-status, .broadcast-link { display: flex; align-items: center; }
  .header-left { gap: 1rem; }
  .menu-trigger .vs-btn { color: var(--text-secondary); border: 1px solid var(--border-subtle); }
  .route-title { display: flex; flex-direction: column; line-height: 1.25; }
  .route-title span { color: var(--text-muted); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .route-title strong { margin-top: .2rem; font-family: "Poppins", sans-serif; font-size: .96rem; font-weight: 600; }
  .header-right { gap: 1rem; }
  .slot-live-alert { display: flex; align-items: center; gap: .6rem; padding: .42rem .5rem .42rem .7rem; background: linear-gradient(120deg, rgba(255,184,77,.14), rgba(var(--color-danger-rgb),.1)); border: 1px solid rgba(255,184,77,.32); border-radius: 12px; }
  .alert-dot { width: 8px; height: 8px; flex: 0 0 8px; background: var(--color-danger); border-radius: 50%; box-shadow: 0 0 0 5px rgba(var(--color-danger-rgb),.14); animation: live-pulse 1.5s infinite; }
  @keyframes live-pulse { 50% { box-shadow: 0 0 0 9px rgba(var(--color-danger-rgb),0); } }
  .alert-copy { display: flex; flex-direction: column; line-height: 1.15; }
  .alert-copy strong { color: var(--color-accent); font-size: .7rem; font-weight: 700; white-space: nowrap; }
  .alert-copy small { margin-top: .12rem; color: var(--text-muted); font-size: .58rem; white-space: nowrap; }
  .alert-actions { display: flex; gap: .3rem; }
  .alert-actions button { display: flex; align-items: center; gap: .3rem; padding: .38rem .55rem; color: var(--text-secondary); white-space: nowrap; background: rgba(255,255,255,.06); border: 1px solid var(--border-subtle); border-radius: 9px; font-size: .62rem; font-weight: 600; cursor: pointer; transition: color .16s ease, background .16s ease; }
  .alert-actions button:hover { color: #fff; background: rgba(255,255,255,.12); }
  .alert-actions button.danger:hover { color: #ff8e99; background: rgba(var(--color-danger-rgb),.14); border-color: rgba(var(--color-danger-rgb),.35); }
  .system-status { gap: .7rem; }
  /* El divisor solo tiene sentido cuando hay algo a la derecha. */
  .header-right.has-broadcast .system-status { padding-right: 1rem; border-right: 1px solid var(--border-subtle); }
  .status-dot { width: 8px; height: 8px; background: var(--color-secondary); border-radius: 50%; box-shadow: 0 0 0 5px rgba(var(--color-secondary-rgb), .09); }
  .system-status > span:last-child { display: flex; flex-direction: column; line-height: 1.2; }
  .system-status strong { color: var(--text-secondary); font-size: .72rem; font-weight: 600; }
  .system-status small { margin-top: .2rem; color: var(--text-muted); font-size: .62rem; }
  .broadcast-link { gap: .55rem; padding: .58rem .8rem; color: var(--text-primary); font-size: .75rem; font-weight: 600; text-decoration: none !important; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 10px; }
  .broadcast-link:hover { color: #fff; border-color: var(--border-strong); }
  .broadcast-link b { color: var(--color-accent); font-size: .9rem; }
  @media (min-width: 992px) { .menu-trigger { display: none; } }
  @media (max-width: 1100px) { .alert-copy small { display: none; } .alert-actions button span { display: none; } }
  @media (max-width: 640px) { .system-status { display: none; } .broadcast-link span { display: none; } .alert-copy { display: none; } }
`;
