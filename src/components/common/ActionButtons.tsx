import { Button, ButtonSet, type ButtonProps } from "@carbon/react";
export type ActionButtonConfig = { label: string; onClick?: ButtonProps["onClick"]; disabled?: boolean; kind?: "secondary" | "tertiary" | "ghost" | "danger" | "danger--tertiary" | "danger--ghost" };
export type ActionButtonsProps = { primary?: Omit<ActionButtonConfig,"kind">; secondary?: ActionButtonConfig[]; size?: ButtonProps["size"] };
export function ActionButtons({ primary, secondary = [], size }: ActionButtonsProps) {
  return <ButtonSet>{secondary.map((action,index) => <Button key={action.label + "-" + index} kind={action.kind ?? "secondary"} size={size} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>)}
    {primary ? <Button kind="primary" size={size} disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</Button> : null}
  </ButtonSet>;
}