import { VariantsConstant } from "../../constant/variants.constant";
import { ShadowsConstant } from "../../constant/shadows.const";
import { ReactNode } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface ButtonProps {
    children?: ReactNode,
    ariaLabel?: string;
    label?: string ;
    href? : string;
    to? : string;
    variant?: VariantsConstant;
    subvariant?: string;
    shadow?:ShadowsConstant;
    className?: string;
    target?: string;
    icon?: IconProp;
    outlined?: boolean;
    onClick?: () => void;
    params?: unknown;
    disabled?: boolean;
    id?: string;
}
