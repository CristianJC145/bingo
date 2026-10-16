import React from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface IconProps { icon: IconProp; className?: string; }
const AppIcon: React.FC<IconProps> = ({ icon, className }) => <FontAwesomeIcon className={className} icon={icon} />;
export default AppIcon;
