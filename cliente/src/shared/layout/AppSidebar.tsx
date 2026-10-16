import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import AppLinkNavigation from "../components/LinkNavigation/AppLinkNavigation";
import AppIcon from "../components/AppIcon";
import { useAuth } from "../../modules/auth/context/AuthContext";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSmallSidebar: (value: boolean) => void;
}

interface NavChild { to: string; icon: IconProp; label: string; }
interface NavItem { to: string; icon: IconProp; label: string; children?: NavChild[]; }

const registryNavigation: NavItem[] = [
  { to: "/registro/cartones", icon: "list", label: "Registro de cartones" },
];

const operationNavigation: NavItem[] = [
  { to: "/admin/dashboard", icon: "pie-chart", label: "Dashboard" },
  {
    to: "/game",
    icon: "gamepad",
    label: "Juego",
    children: [
      { to: "/game/panel", icon: "play", label: "Panel de juego" },
      { to: "/game/libre", icon: "plus", label: "Juego libre" },
      { to: "/game/historial", icon: "clock", label: "Historial" },
      { to: "/game/configuracion", icon: "sliders", label: "Configuración" },
    ],
  },
  { to: "/sorteo/maquina", icon: "gem", label: "Máquina de la suerte" },
  { to: "/figures/administator", icon: "vector-square", label: "Figuras" },
  { to: "/resources/generate", icon: "clone", label: "Cartones" },
  { to: "/printing/orders", icon: "receipt", label: "Impresión" },
  { to: "/customization/sound", icon: "sliders", label: "Personalización" },
];

const managementNavigation: NavItem[] = [
  { to: "/admin/usuarios", icon: "users", label: "Usuarios" },
  { to: "/admin/asignaciones", icon: "user-tag", label: "Asignaciones" },
  { to: "/admin/cartones", icon: "list", label: "Cartones asignados" },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose, onSmallSidebar }) => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const [smallSidebar, setSmallSidebar] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const initials = (user?.fullName ?? "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("");

  useEffect(() => { onClose(); }, [location.pathname, onClose]);

  const handleSmallSidebar = () => {
    const value = !smallSidebar;
    setSmallSidebar(value);
    onSmallSidebar(value);
  };

  const toggleGroup = (key: string) => {
    // Contraído solo hay iconos: pulsar un grupo primero devuelve el ancho completo.
    if (smallSidebar) { handleSmallSidebar(); setOpenGroups((groups) => (groups.includes(key) ? groups : [...groups, key])); return; }
    setOpenGroups((groups) => (groups.includes(key) ? groups.filter((item) => item !== key) : [...groups, key]));
  };

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname.startsWith(item.to);
    if (!item.children) {
      return <AppLinkNavigation key={item.to} to={item.to} icon={item.icon} label={item.label} showChevron selected={isActive} />;
    }

    // La ruta activa manda: el grupo que contiene la página actual siempre se ve abierto.
    const expanded = isActive || openGroups.includes(item.to);
    return (
      <div className={`nav-branch ${expanded ? "expanded" : ""} ${isActive ? "is-active" : ""}`} key={item.to}>
        {/* El padre solo enciende su icono: la píldora completa la lleva la subopción actual. */}
        <AppLinkNavigation
          icon={item.icon}
          label={item.label}
          showChevron
          trailing={<span className="branch-caret" aria-hidden="true"><AppIcon icon="angle-down" /></span>}
          onClick={() => toggleGroup(item.to)}
        />
        <div className="nav-sub" role="group" aria-label={item.label} hidden={!expanded}>
          {item.children.map((child) => (
            <AppLinkNavigation
              key={child.to}
              to={child.to}
              icon={child.icon}
              label={child.label}
              variant="plain"
              selected={location.pathname.startsWith(child.to)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <>
      <span className="group-label">{label}</span>
      <nav className="nav-group" aria-label={label}>
        {items.map(renderItem)}
      </nav>
    </>
  );

  return (
    <AppSidebarStyle>
      {isOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={onClose} />}

      <aside className={`vs-sidebar ${isOpen ? "open" : ""} ${smallSidebar ? "small-sidebar" : ""}`}>
        <header className="sidebar-brand">
          <span className="brand-mark"><AppIcon icon="gem" /></span>
          <span className="brand-copy"><strong>BINGO</strong><small>ASODIFI</small></span>
          <button type="button" className="collapse-toggle" onClick={handleSmallSidebar} aria-label={smallSidebar ? "Expandir menú" : "Contraer menú"}>
            <AppIcon icon={smallSidebar ? "angle-right" : "angle-left"} />
          </button>
          <button type="button" className="close-mobile" onClick={onClose} aria-label="Cerrar menú"><AppIcon icon="times" /></button>
        </header>

        <div className="sidebar-scroll">
          {isAdmin ? (
            <>
              {renderGroup("Operación", operationNavigation)}
              {renderGroup("Administración", managementNavigation)}
            </>
          ) : (
            renderGroup("Registro", registryNavigation)
          )}

          {isAdmin && (
            <>
              <span className="group-label">Cuenta</span>
              <nav className="nav-group" aria-label="Cuenta">
                <AppLinkNavigation href="/obs" icon="ad" label="Vista de transmisión" variant="plain" />
              </nav>
            </>
          )}
        </div>

        <footer className="sidebar-foot">
          <AppLinkNavigation icon="right-from-bracket" label="Cerrar sesión" variant="plain" onClick={signOut} />
          <div className="account-row">
            <span className="avatar">{initials}</span>
            <span className="account-copy">
              <strong>{user?.fullName}</strong>
              <small>{isAdmin ? "Administrador" : "Registrador"}</small>
            </span>
          </div>
        </footer>
      </aside>
    </AppSidebarStyle>
  );
};

export default AppSidebar;

const AppSidebarStyle = styled.div`
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 39;
    border: 0;
    background: rgba(3, 5, 9, .72);
    backdrop-filter: blur(4px);
  }

  .vs-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 40;
    display: flex;
    width: 258px;
    flex-direction: column;
    padding: 1rem .85rem 1rem;
    background: #131722;
    border-right: 1px solid rgba(255, 255, 255, .06);
    transform: translateX(-100%);
    transition: width .25s ease, transform .25s ease;
  }
  .vs-sidebar.open { transform: translateX(0); }

  .sidebar-brand {
    display: flex;
    min-height: 46px;
    flex: 0 0 auto;
    align-items: center;
    gap: .65rem;
    margin-bottom: 1.4rem;
    padding: 0 .25rem;
  }
  .brand-mark {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    place-items: center;
    color: #4ee0c4;
    background: rgba(39, 211, 178, .1);
    border: 1px solid rgba(39, 211, 178, .22);
    border-radius: 12px;
    font-size: .9rem;
    box-shadow: 0 0 18px rgba(39, 211, 178, .14);
  }
  .brand-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; line-height: 1.15; white-space: nowrap; }
  .brand-copy strong { color: #fff; font-family: "Poppins", sans-serif; font-size: .84rem; font-weight: 600; letter-spacing: .1em; }
  .brand-copy small { margin-top: .22rem; color: var(--text-muted); font-size: .58rem; letter-spacing: .1em; }

  .collapse-toggle, .close-mobile {
    display: grid;
    width: 26px;
    height: 26px;
    flex: 0 0 26px;
    place-items: center;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid rgba(255, 255, 255, .07);
    border-radius: 8px;
    font-size: .62rem;
    cursor: pointer;
    transition: color .16s ease, background .16s ease;
  }
  .collapse-toggle:hover, .close-mobile:hover { color: var(--text-primary); background: rgba(255, 255, 255, .06); }
  .collapse-toggle { display: none; }

  .sidebar-scroll {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    margin: 0 -.25rem;
    padding: 0 .25rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, .12) transparent;
  }
  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .12); border-radius: 99px; }

  .group-label {
    padding: 0 .6rem;
    margin-bottom: .6rem;
    color: var(--text-muted);
    font-size: .56rem;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .nav-group { display: flex; flex-direction: column; gap: .15rem; }
  .nav-group + .group-label { margin-top: 1.5rem; }

  /* Grupo desplegable: la flecha final indica el estado, la guía vertical la jerarquía. */
  .branch-caret {
    display: grid;
    width: 14px;
    flex: 0 0 14px;
    place-items: center;
    color: var(--text-muted);
    font-size: .58rem;
    transition: transform .18s ease, color .16s ease;
  }
  .nav-branch.expanded .branch-caret { color: #a996ff; transform: rotate(180deg); }
  .nav-branch > .vs-link-nav { cursor: pointer; }
  .nav-branch.is-active > .vs-link-nav { color: var(--text-primary); }
  .nav-branch.is-active > .vs-link-nav .nav-copy strong { font-weight: 600; }
  .nav-branch.is-active > .vs-link-nav .nav-icon {
    color: #fff;
    background: linear-gradient(145deg, #8a6bff, #6544e8);
    border-color: rgba(255, 255, 255, .12);
    box-shadow: 0 5px 14px rgba(101, 68, 232, .35);
  }

  .nav-sub {
    display: flex;
    flex-direction: column;
    gap: .1rem;
    margin: .18rem 0 .3rem 1.35rem;
    padding-left: .7rem;
    border-left: 1px solid rgba(255, 255, 255, .08);
  }
  .nav-sub[hidden] { display: none; }
  .nav-sub .vs-link-nav { padding-block: .42rem; }
  .nav-sub .vs-link-nav .nav-copy strong { font-size: .72rem; }
  .nav-sub .vs-link-nav.selected { color: #fff; background: rgba(124, 92, 255, .14); }
  .nav-sub .vs-link-nav.selected .nav-icon { color: #a996ff; }

  /* Pie fijo: cerrar sesión siempre visible, justo encima de la tarjeta de usuario. */
  .sidebar-foot {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: .55rem;
    margin-top: 1rem;
    padding-top: .85rem;
    border-top: 1px solid rgba(255, 255, 255, .06);
  }
  .sidebar-foot .vs-link-nav:hover { color: #ff8e99; background: rgba(var(--color-danger-rgb), .09); }
  .sidebar-foot .vs-link-nav:hover .nav-icon { color: #ff8e99; }
  .account-row {
    display: flex;
    align-items: center;
    gap: .65rem;
    padding-top: .55rem;
    border-top: 1px solid rgba(255, 255, 255, .05);
  }
  .avatar {
    display: grid;
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    place-items: center;
    color: #fff;
    background: linear-gradient(145deg, #8269f8, #6848dd);
    border-radius: 11px;
    font-size: .66rem;
    font-weight: 700;
  }
  .account-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; line-height: 1.2; }
  .account-copy strong { overflow: hidden; color: var(--text-primary); font-size: .72rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .account-copy small { margin-top: .15rem; color: var(--text-muted); font-size: .6rem; }

  @media (min-width: 992px) {
    .vs-sidebar { transform: translateX(0); }
    .sidebar-backdrop, .close-mobile { display: none; }
    .collapse-toggle { display: grid; }

    /* Contraído: solo iconos centrados, sin textos ni elementos que desborden. */
    .vs-sidebar.small-sidebar { width: 86px; padding-inline: .7rem; }
    .vs-sidebar.small-sidebar .brand-copy,
    .vs-sidebar.small-sidebar .group-label,
    .vs-sidebar.small-sidebar .nav-copy,
    .vs-sidebar.small-sidebar .nav-chevron,
    .vs-sidebar.small-sidebar .nav-badge,
    .vs-sidebar.small-sidebar .branch-caret,
    .vs-sidebar.small-sidebar .nav-sub,
    .vs-sidebar.small-sidebar .account-copy { display: none; }
    .vs-sidebar.small-sidebar .sidebar-brand { justify-content: center; gap: 0; margin-bottom: 1.1rem; }
    .vs-sidebar.small-sidebar .collapse-toggle { position: absolute; top: 1.55rem; right: -13px; z-index: 1; background: #131722; }
    .vs-sidebar.small-sidebar .vs-link-nav { justify-content: center; gap: 0; padding: .45rem 0; }
    .vs-sidebar.small-sidebar .nav-group { gap: .3rem; }
    .vs-sidebar.small-sidebar .nav-group + .group-label { margin-top: 0; }
    /* Separador visual entre grupos cuando no hay etiquetas. */
    .vs-sidebar.small-sidebar .nav-group ~ .nav-group { margin-top: .9rem; padding-top: .9rem; border-top: 1px solid rgba(255, 255, 255, .06); }
    .vs-sidebar.small-sidebar .account-row { justify-content: center; }
  }
`;
