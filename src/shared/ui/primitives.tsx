import * as React from "react";
import {
  Button as CarbonButton,
  Checkbox as CarbonCheckbox,
  DatePicker as CarbonDatePicker,
  DatePickerInput as CarbonDatePickerInput,
  TextInput as CarbonTextInput,
  TextArea as CarbonTextArea,
  Tag as CarbonTag,
  ComboBox as CarbonComboBox,
  MultiSelect as CarbonMultiSelect,
  Tile as CarbonTile,
  ProgressBar as CarbonProgressBar,
} from "@carbon/react";
import { cn } from "@/shared/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const kind =
    variant === "default"
      ? "primary"
      : variant === "secondary"
        ? "secondary"
        : variant === "outline"
          ? "tertiary"
          : "ghost";
  return (
    <CarbonButton
      data-tp-button="true"
      data-tp-size={size}
      data-tp-variant={variant}
      kind={kind}
      size={size === "sm" || size === "icon" ? "sm" : "md"}
      hasIconOnly={size === "icon"}
      className={className}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <CarbonTile className={cn("rounded-md border-0 bg-layer text-text-primary shadow-none", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

export function Badge({
  className,
  variant = "secondary",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success";
}) {
  const type = variant === "success" ? "green" : variant === "default" ? "blue" : "gray";
  return (
    <CarbonTag
      type={type}
      size="sm"
      className={cn(variant === "outline" && "border border-current bg-transparent", className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, id, defaultValue, value, onClick, onChange, size: _nativeSize, ...props }, ref) {
  const generatedId = React.useId();
  void _nativeSize;
  if (props.type === "date") {
    const dateValue = String(value ?? defaultValue ?? "");
    const { min, max, disabled, placeholder, "aria-label": ariaLabel } = props;
    return (
      <CarbonDatePicker
        datePickerType="single"
        dateFormat="Y-m-d"
        value={dateValue || undefined}
        minDate={min}
        maxDate={max}
        className={className}
        onChange={(_dates, dateString) => {
          const target = { value: dateString } as HTMLInputElement;
          onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
        }}
      >
        <CarbonDatePickerInput
          id={id ?? generatedId}
          labelText={ariaLabel ?? ""}
          hideLabel
          type="text"
          placeholder={placeholder ?? "YYYY-MM-DD"}
          disabled={disabled}
        />
      </CarbonDatePicker>
    );
  }
  return (
    <CarbonTextInput
      ref={ref}
      id={id ?? generatedId}
      labelText=""
      hideLabel
      data-tp-control="true"
      className={className}
      defaultValue={typeof defaultValue === "string" || typeof defaultValue === "number" ? defaultValue : undefined}
      value={typeof value === "string" || typeof value === "number" ? value : undefined}
      onClick={onClick as React.MouseEventHandler<HTMLElement> | undefined}
      {...props}
    />
  );
});

type CarbonCompatibleCheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  labelText?: React.ReactNode;
};

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  CarbonCompatibleCheckboxProps
>(function Checkbox({ className, id, labelText, onChange, ...props }, ref) {
  const generatedId = React.useId();
  const accessibleLabel = labelText ?? props["aria-label"] ?? "";
  return (
    <CarbonCheckbox
      ref={ref}
      id={id ?? generatedId}
      labelText={accessibleLabel}
      hideLabel={!labelText}
      data-tp-control="true"
      className={className}
      onChange={(event, _data) => onChange?.(event as React.ChangeEvent<HTMLInputElement>)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, id, defaultValue, value, ...props }, ref) {
  const generatedId = React.useId();
  return (
    <CarbonTextArea
      ref={ref}
      id={id ?? generatedId}
      labelText=""
      hideLabel
      data-tp-control="true"
      className={className}
      defaultValue={typeof defaultValue === "string" || typeof defaultValue === "number" ? defaultValue : undefined}
      value={typeof value === "string" || typeof value === "number" ? value : undefined}
      {...props}
    />
  );
});

export function Progress({ value, className }: { value: number; className?: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <CarbonProgressBar
      label="任务进度"
      value={normalized}
      max={100}
      size="small"
      hideLabel
      className={className}
    />
  );
}
export function Separator({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("h-px shrink-0 bg-border-subtle", className)} />;
}

export type ComboboxOption = { value: string; label: string; description?: string; icon?: React.ReactNode };

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  searchPlaceholder = "搜索选项…",
  disabled = false,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  const selected = options.find((option) => option.value === value) ?? null;
  return (
    <CarbonComboBox
      id={id}
      items={options}
      selectedItem={selected}
      itemToString={(item) => item?.label ?? ""}
      itemToElement={(item) => <span className="flex items-center gap-2">{item.icon}{<span className="flex flex-col"><span>{item.label}</span>{item.description ? <span className="text-xs text-text-secondary">{item.description}</span> : null}</span>}</span>}
      onChange={({ selectedItem }) => onValueChange(selectedItem?.value ?? "")}
      placeholder={searchPlaceholder || placeholder}
      titleText=""
      aria-label={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

export type MultiSelectOption = { value: string; label: string; description?: string; icon?: React.ReactNode };

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  disabled = false,
  className,
}: {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  const selectedItems = options.filter((option) => value.includes(option.value));
  return (
    <CarbonMultiSelect
      id={id}
      label={placeholder}
      hideLabel
      items={options}
      selectedItems={selectedItems}
      itemToString={(item) => item?.label ?? ""}
      onChange={({ selectedItems: nextItems }) => onValueChange((nextItems ?? []).map((item) => item.value))}
      selectionFeedback="fixed"
      disabled={disabled}
      className={className}
    />
  );
}
