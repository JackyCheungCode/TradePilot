import * as React from "react";
import * as Slot from "@radix-ui/react-slot";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Button as CarbonButton,
  TextInput as CarbonTextInput,
  TextArea as CarbonTextArea,
  Tag as CarbonTag,
  ComboBox as CarbonComboBox,
} from "@carbon/react";
import { cn } from "@/shared/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  // Preserve the existing Slot contract for link-as-button call sites.
  if (asChild) {
    return (
      <Slot.Root
        data-tp-button="true"
        data-tp-size={size}
        data-tp-variant={variant}
        className={cn("inline-flex items-center justify-center gap-2", className)}
        {...props}
      />
    );
  }

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
  return <div className={cn("rounded-md border border-transparent bg-layer text-text-primary shadow-none", className)} {...props} />;
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
>(function Input({ className, id, ...props }, ref) {
  const generatedId = React.useId();
  return (
    <CarbonTextInput
      ref={ref}
      id={id ?? generatedId}
      labelText=""
      hideLabel
      data-tp-control="true"
      className={className}
      {...props}
    />
  );
});

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ className, ...props }, ref) {
  // Keep the native input contract for existing controlled forms while Carbon styles
  // are applied through the global Carbon token layer; migration of label semantics
  // is tracked separately because call sites use both standalone and wrapped labels.
  return (
    <input
      ref={ref}
      type="checkbox"
      data-tp-control="true"
      className={cn("cds--checkbox", className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, id, ...props }, ref) {
  const generatedId = React.useId();
  return (
    <CarbonTextArea
      ref={ref}
      id={id ?? generatedId}
      labelText=""
      hideLabel
      data-tp-control="true"
      className={className}
      {...props}
    />
  );
});

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <ProgressPrimitive.Root value={value} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-layer", className)}>
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-interactive transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
export function Separator({ className }: { className?: string }) {
  return <SeparatorPrimitive.Root decorative className={cn("shrink-0 bg-border-subtle", className)} />;
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 w-72 rounded-md border border-border-subtle bg-layer p-4 text-text-primary shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

export type ComboboxOption = { value: string; label: string; description?: string };

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
      onChange={({ selectedItem }) => onValueChange(selectedItem?.value ?? "")}
      placeholder={searchPlaceholder || placeholder}
      titleText={placeholder}
      hideLabel
      disabled={disabled}
      className={className}
    />
  );
}
