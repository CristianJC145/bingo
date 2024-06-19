import { VariantsConstant } from "../../constant/variants.constant";
import { ShadowsConstant } from "../../constant/shadows.const";
import { ReactNode } from "react";

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
    icon?: React.ReactNode;
    outlined?: boolean;
    onClick?: () => void;
    params?: any;
    disabled?: boolean;
}