import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import AppIcon from "../AppIcon";
import { ButtonProps } from "./props.button";

const AppButton: React.FC<ButtonProps> = ({ ariaLabel, label, outlined, href, onClick, variant, target, shadow, icon, to, className, children, subvariant, disabled, id }) => {
  const classNames = ["vs-btn", `vs-btn--${variant ?? "primary"}`, outlined ? `vs-outlined--${variant ?? "primary"}` : "", shadow ? `vs-shadow--${shadow}` : "", (icon && label) || children ? "vs-btn--labelIcon" : icon ? "vs-btn--icon" : "", subvariant, className].filter(Boolean).join(" ");
  const content = <>{label}{icon && <AppIcon icon={icon} />}{children}</>;
  if (to) return <AppButtonStyles><Link to={to} onClick={onClick} className={classNames}>{content}</Link></AppButtonStyles>;
  if (href) return <AppButtonStyles><a className={classNames} target={target} href={href} onClick={onClick} aria-label={ariaLabel}>{content}</a></AppButtonStyles>;
  return <AppButtonStyles><button type={onClick ? "button" : "submit"} className={classNames} onClick={onClick} aria-label={ariaLabel} disabled={disabled} id={id}>{content}</button></AppButtonStyles>;
};

export default AppButton;

const AppButtonStyles = styled.div`
  .vs-btn { display: flex; min-height: 42px; align-items: center; justify-content: center; gap: .55rem; padding: .72rem 1.15rem; color: #fff; border: 1px solid transparent; border-radius: 11px; font-size: .78rem; font-weight: 600; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease, opacity .18s ease; }
  .vs-btn:hover:not(:disabled) { color: #fff; transform: translateY(-1px); }
  .vs-btn:focus-visible { outline: 3px solid rgba(var(--color-primary-rgb), .28); outline-offset: 2px; }
  .vs-btn:disabled { cursor: not-allowed; opacity: .42; }
  .vs-btn--primary { background: linear-gradient(135deg, #8a6bff, #6847f2); box-shadow: 0 10px 24px rgba(104,71,242,.18); }
  .vs-btn--primary:hover:not(:disabled) { background: linear-gradient(135deg, #9579ff, #7454f4); box-shadow: 0 12px 30px rgba(104,71,242,.3); }
  .vs-btn--danger { background: var(--color-danger); }
  .vs-btn--danger:hover:not(:disabled) { background: var(--color-danger-600); }
  .vs-btn--light { color: var(--text-primary); background: rgba(255,255,255,.055); border-color: var(--border-subtle); }
  .vs-btn--light:hover:not(:disabled) { background: rgba(255,255,255,.09); border-color: var(--border-strong); }
  .vs-btn--white { color: var(--text-secondary); background: transparent; }
  .vs-btn--transparent, .vs-btn--link { color: var(--text-secondary); background: transparent; }
  .vs-btn--transparent:hover:not(:disabled), .vs-btn--link:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,.04); }
  .vs-btn--icon { width: var(--width-btn-icon); min-height: var(--height-btn-icon); padding: 0; }
  .vs-outlined--primary { color: #a996ff; background: transparent; border-color: rgba(var(--color-primary-rgb), .5); box-shadow: none; }
  .vs-outlined--light { color: var(--text-primary); background: transparent; border-color: var(--border-strong); }
  .vs-outlined--transparent { color: var(--text-secondary); border-color: var(--border-subtle); }
`;
