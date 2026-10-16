import React from "react";
import { Link } from "react-router-dom";
import AppIcon from "../AppIcon";
import "./AppLinkNavigation.css";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface AppLinkNavigationProps {
  icon?: IconProp;
  label: string;
  caption?: string;
  to?: string;
  href?: string;
  selected?: boolean;
  /** Marca visual de grupo navegable (flecha a la izquierda). */
  showChevron?: boolean;
  badge?: string | number;
  /** Elemento al final de la fila, p. ej. la flecha de un grupo desplegable. */
  trailing?: React.ReactNode;
  variant?: "default" | "plain";
  onClick?: () => void;
}

const AppLinkNavigation: React.FC<AppLinkNavigationProps> = ({
  icon, label, caption, to, href, selected, showChevron, badge, trailing, variant = "default", onClick,
}) => {
  const className = `vs-link-nav ${variant === "plain" ? "is-plain" : ""} ${selected ? "selected" : ""}`.trim();

  const content = (
    <>
      {showChevron && <span className="nav-chevron" aria-hidden="true"><AppIcon icon="angle-right" /></span>}
      {icon && <span className="nav-icon"><AppIcon icon={icon} /></span>}
      <span className="nav-copy"><strong>{label}</strong>{caption && <small>{caption}</small>}</span>
      {badge !== undefined && <span className="nav-badge">{badge}</span>}
      {trailing}
    </>
  );

  if (to) return <Link to={to} className={className} onClick={onClick} title={label}>{content}</Link>;
  if (href) return <a href={href} className={className} target="_blank" rel="noreferrer" title={label}>{content}</a>;
  return <button type="button" className={className} onClick={onClick} title={label}>{content}</button>;
};

export default AppLinkNavigation;
