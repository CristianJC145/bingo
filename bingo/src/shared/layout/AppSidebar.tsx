import React, { useEffect, useState } from "react"

import LazyImage from "../components/LazyImage"
import AppLinkNavigation from "../components/LinkNavigation/AppLinkNavigation";
import styled from "styled-components";

import { settings } from "../constant/settings.constants";
import AppButton from "../components/Buttons/AppButton";
import { useLocation } from "react-router-dom";
interface AppSidebarProps {
    isOpen: boolean; 
    onClose: () => void;
    onSmallSidebar: (value: any) => void
}
const AppSidebar : React.FC<AppSidebarProps> = ({isOpen, onClose, onSmallSidebar}) => {
    const location = useLocation();
    const [selectedOption, setSelectedOption] = useState('/bingo/panel');
    const [smallSidebar, setSmallSidebar] = useState(false);
    const appLogo = settings.appLogo;
    const classIsOpen = `vs-sidebar${isOpen ? ' open' : ''}`
    const classSmallSidebar = `${smallSidebar ? 'small-sidebar' : ''}`;
    const classNames = [classIsOpen, classSmallSidebar].filter(Boolean).join(' ');
    const handleSmallSidebar = () => {
        const value = !smallSidebar;
        setSmallSidebar(value);
        onSmallSidebar(value);
    }

    useEffect(() => {
        setSelectedOption(location.pathname);
      }, [location.pathname]);
    return (
        <AppSidebarStyle>
            <aside className={`${classNames}`}>
                <div className="vs-sidebar--header">
                    <a href="/" className="vs-header--logo">
                        <LazyImage className="vs-logo--img" src={appLogo} alt="Logo" />
                        <span className="vs-logo--title">BINGO</span>
                    </a>
                    <AppButton className="vs-btn-closeSidebar" icon="fa-times" variant="dark" onClick={onClose} ariaLabel="Button Close Sidebar"></AppButton>
                    <AppButton className="vs-btn-miniSidebar" icon={`${smallSidebar ? 'bars' : 'bars-staggered'}`} variant="dark" onClick={handleSmallSidebar} ariaLabel="Small Sidebar"></AppButton>
                </div>
                <div className="vs-sidebar-content">
                    <AppLinkNavigation to="/game/panel" icon="gamepad" label="Juego" selected={selectedOption === '/game/panel'}></AppLinkNavigation>
                    <AppLinkNavigation to="/game/figures" icon="vector-square" label="Figuras" selected={selectedOption === "/game/figures"}></AppLinkNavigation>
                    <AppLinkNavigation to="/resources/generate" icon="clone" label="Generador"  selected={selectedOption === "/resources/generate"}></AppLinkNavigation>
                    <AppLinkNavigation to="/dashboard/finance" icon="sack-dollar" label="Financiero" selected={selectedOption === "/dashboard/finance"}></AppLinkNavigation>
                    <AppLinkNavigation to="/dashboard/sales" icon="tags" label="Ventas" selected={selectedOption === "/dashboard/sales"}></AppLinkNavigation>
                    <AppLinkNavigation to="/dashboard/record" icon="clock" label="Historial" selected={selectedOption === "/dashboard/record"}></AppLinkNavigation>
                    <AppLinkNavigation to="/dashboard/account" icon="user" label="Mi cuenta" selected={selectedOption === "/dashboard/account"}></AppLinkNavigation>
                </div>
            </aside>
        </AppSidebarStyle>
    )
}
export default AppSidebar;

const AppSidebarStyle = styled.div`
.vs-sidebar {
    position: fixed;
    width: 220px;
    z-index: 0;
    bottom: 0;
    top: 0;
    background-color: #fff;
    transform: translateX(-17.125rem);
    transition: all .3s ease;
    border-radius: 16px;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.06);
    margin-bottom: 1rem;
    margin-top: 1rem;
    margin-left: 1rem;
}
.vs-sidebar.open {
    transform: translateX(0);
}
.vs-sidebar--header {
    display: flex;
    position: relative;
    justify-content: space-between;
    text-decoration: none;
    min-height: 70px;
    transition: all .3s ease;
}

.vs-sidebar--header::after {
    content: '';
    display: flex;
    position: absolute;
    width: 80%;
    margin-left: 10%;
    border-bottom: 2px solid var(--color-body);
    bottom: 0;
}
.vs-header--logo {
    display: flex;
    text-decoration: none;
    align-items: center;
    padding: var(--p-5) var(--p-4);
    gap: 0.5rem;
    transition: all .3s ease;
}

@keyframes hidden {
    to {
        display: none;
        opacity: 0;
    }  
}
.vs-logo--title {
    font-weight: bold;
    color: var(--color-gray-700);
}
.vs-logo--img {
    width: 35px;
    height: 35px;
}
.vs-btn-closeSidebar {
    margin : 0.5rem;
}
.vs-btn-miniSidebar {
    display: none;
}
.vs-sidebar-content {
    display: flex;
    flex-direction: column;
    padding: 0 var(--p-4);
    margin: 4rem 0;
    gap: 1rem;
}

.vs-sidebar-actions {
    display: flex;
    gap: .5rem;
    align-items: center;
    cursor: pointer;
    position: inherit;
    margin-bottom: 1rem ;
    bottom: 0;
    text-wrap: nowrap;
}

.vs-sidebar-actions:hover button, .vs-sidebar-actions:hover span {
    color: var(--color-gray-400);
}

@media (min-width: 992px) {
    .vs-sidebar {
        transform: translateX(0);
        border-right: 2px solid var(--color-body);
        border-radius: unset;
        box-shadow: unset;
        margin-bottom: 0;
        margin-top: 0;
        margin-left: 0;
    }
    .vs-sidebar-content {
        height: calc(100vh - 225px);
    }
    .vs-btn-closeSidebar {
        display: none;
    }
    .vs-btn-miniSidebar {
        display: inherit;
        position: absolute;
        right: 0;
        margin: var(--p-4) var(--p-3);
    }
    .vs-sidebar.small-sidebar {
        width: 75px;
    }
    .vs-sidebar.small-sidebar .vs-sidebar--header {
        justify-content: center;
    }
    .vs-sidebar.small-sidebar .vs-sidebar--header::after {
        width: 60%;
        margin-left: 0;
    }
    .vs-sidebar.small-sidebar .vs-header--logo {
        width: 0;
        opacity: 0;
        padding: 0;
        pointer-events: none;
    }
    .vs-sidebar.small-sidebar .vs-header--logo img, 
    .vs-sidebar.small-sidebar .vs-header--logo span {
        width: 0;
        opacity: 0;
    }
    .vs-sidebar.small-sidebar .vs-sidebar-content span {
        width: 0;
        opacity: 0;
        transition: .3s ease;
    }
    .vs-sidebar.small-sidebar .vs-sidebar-actions span {
        text-wrap: nowrap;
        width: 0;
        opacity: 0;
    }
    .vs-sidebar.vs-sidebar.small-sidebar .vs-btn-miniSidebar {
        right: 10%;
    }
}
`

