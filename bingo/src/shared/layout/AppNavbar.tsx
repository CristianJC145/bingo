import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import AppButton from "../components/Buttons/AppButton";
import AppIcon from "../components/AppIcon";
import LazyImage from "../components/LazyImage";
import { TokenService } from "../services/token.service";
// import { useAuth } from "../contexts/AuthContext";
// import { LogoutUser } from "../services/logout.service";
import { settings } from "../constant/settings.constants";
import { pathnamesT } from "../constant/pathnamesT";

const tokenService = new TokenService();

interface AppNavbarProps {
  toggleSidebar: () => void;
}
const AppNavbar: React.FC<AppNavbarProps> = ({ toggleSidebar }) => {
  // const navigate = useNavigate();
  const location = useLocation();
  const appLogo = settings.appLogo;
  // const logout = new LogoutUser();
  const pathnames = location.pathname
    .split("/")
    .filter((x) => x)
    .filter((name) => isNaN(parseInt(name)));
  const [dropdown, setDropdown] = useState(false);
  // const authContext = useAuth();
  const dataToken = tokenService.isAuthenticated();

  const toggleDropdown = () => {
    setDropdown(!dropdown);
  };

  const closeDropdown = () => {
    setDropdown(false);
  };
  // const handleLogout = async () => {
  //   await logout.run();
  //   closeDropdown();
  //   authContext.logout();
  //   navigate("/");
  //   window.location.reload();
  // };
  return (
    <AppNavbarStyle>
      <nav className="vs-AppNavbar">
        <div className="vs-left-nav">
          <AppButton
            variant="white"
            icon="bars"
            className="vs-btn-openSidebar"
            onClick={toggleSidebar}
            ariaLabel="Button Open Sidebar"
          ></AppButton>
          <div className="vs-nav-breadcrumbs">
            {pathnames.map((name, index) => {
              const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
              const isLast = index === pathnames.length - 1;
              const isActive = isLast && pathnames.length > 1;
              const nameT = pathnamesT.find(
                (pathname) => pathname.path === name
              )
                ? pathnamesT.find((pathname) => pathname.path === name)?.value
                : name;
              if (index >= 1) {
                return (
                  <span
                    key={name}
                    className={`vs-breadcrumbs-item ${
                      isActive ? "active" : ""
                    }`}
                  >
                    {isLast ? (
                      nameT
                    ) : (
                      <>
                        <Link className="vs-item-link" to={routeTo}>
                          {nameT}
                        </Link>
                        <AppIcon icon="angle-right"></AppIcon>
                      </>
                    )}
                  </span>
                );
              }
            })}
          </div>
        </div>
        <div className="vs-right-nav">
          <AppButton
            icon="bell"
            variant="white"
            ariaLabel="Notifications"
          ></AppButton>
          <div className="vs-navbar-profile">
            <AppButton
              className="vs-profile-btn"
              onClick={toggleDropdown}
              aria-label="Button Profile"
            >
              <LazyImage className="vs-profile-img" src={appLogo} alt="" />
            </AppButton>
            {dropdown && (
              <div className="vs-profile-dropdown">
                <div className="vs-dropdown-header">
                  <span>{dataToken.name}</span>
                </div>
                <AppButton
                  className="vs-dropdown-link"
                  variant="link"
                  to="user/profile"
                  label="Mi perfil"
                  onClick={closeDropdown}
                  ariaLabel="Button Profile"
                />
                {/* <AppButton
                  className="vs-dropdown-link"
                  variant="link"
                  href="#"
                  label="Cerrar Sesion"
                  onClick={handleLogout}
                  ariaLabel="Button Sign off"
                /> */}
              </div>
            )}
          </div>
        </div>
      </nav>
    </AppNavbarStyle>
  );
};
export default AppNavbar;

const AppNavbarStyle = styled.div`
  .vs-AppNavbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--navbar-height);
    background-color: #222340;
    padding: 0 var(--p-4);
  }
  .vs-left-nav {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .vs-nav-breadcrumbs {
    display: flex;
    gap: 0.5rem;
    text-transform: capitalize;
    color: var(--color-light);
  }
  .vs-breadcrumbs-item svg {
    margin-left: 0.5rem;
  }
  .vs-breadcrumbs-item.active {
    font-weight: bold;
  }
  .vs-item-link {
    text-decoration: none;
    color: var(--color-gray-300);
  }
  .vs-right-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .vs-navbar-profile {
    position: relative;
  }
  .vs-profile-dropdown {
    position: absolute;
    z-index: 2;
    width: 15rem;
    padding: var(--p-4);
    border-radius: 10px;
    background-color: var(--color-light);
    box-shadow: 0 0 15px rgba(106, 106, 106, 0.6);
    inset: 0px 0px auto auto;
    transform: translate(0px, 45px);
  }
  .vs-dropdown-header {
    padding: var(--p-4);
    font-weight: bold;
    border-bottom: 1px solid rgba(var(--color-gray-900-rgb), 0.1);
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }
  .vs-profile-img {
    height: 30px;
    width: 30px;
    object-fit: cover;
    border-radius: 999px;
  }
  .vs-profile-btn {
    background-color: #fff;
    border: 2px solid rgba(var(--color-gray-400-rgb), 0.075);
    border-radius: 999px;
    padding: 0.225rem;
  }
  .vs-profile-btn: hover {
    background-color: rgba(var(--color-gray-400-rgb), 0.03);
    border-color: rgba(var(--color-gray-400-rgb), 0.1);
  }
  .vs-dropdown-link {
    display: flex;
    padding: var(--p-4);
    border-radius: 8px;
    justify-content: start;
    color: var(--color-gray-800);
  }
  @media (min-width: 768px) {
  }
  @media (min-width: 992px) {
    .vs-btn-openSidebar {
      display: none;
    }
  }
  @media (min-width: 1200px) {
    .vs-AppNavbar {
      padding-left: var(--p-8);
    }
  }
`;
