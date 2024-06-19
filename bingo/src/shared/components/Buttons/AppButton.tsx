import React from "react";
import { ButtonProps } from "./props.button";
import AppIcon from "../../components/AppIcon";
import { Link } from "react-router-dom";
import styled from "styled-components";

const AppButton: React.FC<ButtonProps> = ({
  ariaLabel,
  label,
  outlined,
  href,
  onClick,
  variant,
  target,
  shadow,
  icon,
  to,
  className,
  children,
  subvariant,
  disabled,
}) => {
  const baseClassName = "vs-btn";
  const variantClassName = `vs-btn--${variant ?? "primary"}`;
  const outlinedClassName = outlined
    ? `vs-outlined--${variant ?? "primary"}`
    : "";
  const shadowClassName = shadow ? `vs-shadow--${shadow}` : "";
  const iconClassName =
    (icon && label) || children
      ? `vs-btn--labelIcon`
      : icon
      ? "vs-btn--icon"
      : "";
  const classNameCustom = className ? className : "";
  const classNames = [
    baseClassName,
    variantClassName,
    subvariant,
    outlinedClassName,
    shadowClassName,
    iconClassName,
    classNameCustom,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick && to) {
    return (
      <AppButtonStyles>
        <Link to={`${to}`} onClick={onClick} className={classNames}>
          {icon && <AppIcon icon={icon}></AppIcon>}
          {label}
          {children}
        </Link>
      </AppButtonStyles>
    );
  }

  if (href && onClick) {
    return (
      <AppButtonStyles>
        <a
          className={classNames}
          target={target}
          href={href}
          onClick={onClick}
          aria-label={ariaLabel}
        >
          {label}
          {icon && <AppIcon icon={icon}></AppIcon>}
          {children}
        </a>
      </AppButtonStyles>
    );
  }
  if (href) {
    return (
      <AppButtonStyles>
        <a className={classNames} target={target} href={href}>
          {icon && <AppIcon icon={icon}></AppIcon>}
          {label}
          {children}
        </a>
      </AppButtonStyles>
    );
  }

  if (onClick) {
    return (
      <AppButtonStyles>
        <button
          type="button"
          className={classNames}
          onClick={onClick}
          aria-label={ariaLabel}
          disabled={disabled}
        >
          {label}
          {icon && <AppIcon icon={icon}></AppIcon>}
          {children}
        </button>
      </AppButtonStyles>
    );
  }

  if (to) {
    return (
      <AppButtonStyles>
        <Link to={`${to}`} className={classNames}>
          {icon && <AppIcon icon={icon}></AppIcon>}
          {label}
          {children}
        </Link>
      </AppButtonStyles>
    );
  }

  return (
    <AppButtonStyles>
      <button
        type="submit"
        className={classNames}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {label}
        {icon && <AppIcon icon={icon}></AppIcon>}
        {children}
      </button>
    </AppButtonStyles>
  );
};
export default AppButton;

const AppButtonStyles = styled.div`
  .vs-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    border-color: transparent;
    border-radius: var(--radius-1);
    text-decoration: none;
    padding: var(--p-3) var(--p-7);
    white-space: nowrap;
    width: 100%;
  }
  .vs-btn--link {
    display: inline;
    color: var(--color-primary);
    padding: 0;
    border-radius: unset;
    font-weight: bold;
    white-space: inherit;
  }

  .vs-btn--primary.active {
    background-color: var(--color-primary-600);
  }

  .vs-btn--primary {
    color: #ffffff;
    background-color: var(--color-primary);
  }

  .vs-btn--white {
    color: #ffffff;
    background-color: #fff;
  }
  .vs-btn--dark {
    color: rgb(77, 77, 77);
    background-color: rgba(77, 77, 77, 0.282);
  }
  .vs-btn--danger {
    color: #fff;
    background-color: var(--color-danger);
  }
  .vs-btn--icon {
    width: var(--width-btn-icon);
    height: var(--height-btn-icon);
    border-color: transparent;
    background-color: transparent;
    padding: 0;
    font-size: 16px;
  }
  .vs-btn--labelIcon {
    gap: 0.5rem;
  }
  .vs-btn--light {
    color: var(--color-light);
    background-color: rgba(var(--color-light-rgb), 0.06);
  }
  .vs-btn--light:hover {
    color: var(--color-light);
    background-color: rgba(var(--color-light-rgb), 0.15);
  }

  .vs-btn--primary:hover {
    background-color: var(--color-primary-600);
    color: #fff;
  }
  .vs-btn--danger:hover {
    background-color: var(--color-danger-600);
    color: #fff;
  }
  .vs-outlined--primary {
    border: 1px solid var(--color-primary);
    background-color: transparent;
    color: var(--color-primary);
    text-decoration: none;
    cursor: pointer;
  }
  .vs-outlined--dark {
    border: 1px solid rgba(var(--color-gray-300-rgb), 0.5);
    background-color: transparent;
    color: var(--color-gray-400);
    cursor: pointer;
  }

  .vs-outlined--dark:hover {
    color: var(--color-gray-400);
    background-color: rgba(var(--color-gray-400-rgb), 0.1);
  }

  .vs-outlined--primary:hover {
    color: var(--color-primary);
    background-color: rgba(var(--color-primary-rgb), 0.1);
  }
  .vs-outlined--secondary {
    border: 1px solid var(--color-secondary);
    background-color: transparent;
    color: var(--color-secondary);
    text-decoration: none;
    cursor: pointer;
  }
  .vs-outlined--light {
    border: 1px solid var(--color-light);
    color: var(--color-light);
    background-color: transparent;
  }

  .outlined-button:hover {
    background-color: #000;
    color: rgba(255, 255, 255, 0.8);
  }
`;
