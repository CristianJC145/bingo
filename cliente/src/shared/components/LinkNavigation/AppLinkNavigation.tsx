import React from "react";
import { Link } from "react-router-dom";
import AppIcon from "../AppIcon";
import './AppLinkNavigation.css'

interface AppLinkNavigationProps {
    icon?: string,
    label: string,
    to?: string,
    selected?: boolean,
    onClick?: () => void
}

const AppLinkNavigation : React.FC<AppLinkNavigationProps> =({icon, label, to, selected, onClick})=>{
    if(to) {
        return (
            <Link to={`${to}`} className={`vs-link-nav ${selected ? 'selected' : ''}`} onClick={onClick}>
                <AppIcon icon={icon}></AppIcon>
                <span>{label}</span>
            </Link>
        )
    }
    return (
        <button type="button" className="vs-link-nav" onClick={onClick}>
            <AppIcon icon={icon}></AppIcon>
            <span>{label}</span>
        </button>
    )

}
export default AppLinkNavigation;