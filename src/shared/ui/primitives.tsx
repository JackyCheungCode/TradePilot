import * as React from "react";
import * as Slot from "@radix-ui/react-slot";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/shared/lib/utils";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "default" | "outline" | "ghost" | "secondary"; size?: "default" | "sm" | "icon" };
export function Button({ className, variant = "default", size = "default", asChild = false, ...props }: ButtonProps) {
 const Comp = asChild ? Slot.Root : "button";
 return <Comp className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variant === "default" ? "bg-primary text-primary-foreground hover:opacity-90" : variant === "outline" ? "border bg-background hover:bg-accent" : variant === "secondary" ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover:bg-accent hover:text-accent-foreground", size === "default" ? "h-9 px-3.5 py-2" : size === "sm" ? "h-8 rounded-[5px] px-3 text-xs" : "h-8 w-8", className)} {...props} />;
}
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-md border border-[#e8ebee] bg-card text-card-foreground shadow-[0_1px_2px_rgba(16,24,40,0.035)]", className)} {...props} />; }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />; }
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />; }
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-4 pt-0", className)} {...props} />; }
export function Badge({ className, variant = "secondary", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "success" }) { return <span className={cn("inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-medium", variant === "default" ? "bg-primary text-primary-foreground" : variant === "success" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : variant === "outline" ? "border text-foreground" : "bg-secondary text-secondary-foreground", className)} {...props} />; }
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) { return <input ref={ref} className={cn("flex h-[34px] w-full rounded-[5px] border bg-background px-3 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />; });
export function Progress({ value, className }: { value: number; className?: string }) { return <ProgressPrimitive.Root value={value} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}><ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-transform duration-500 ease-out" style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }} /></ProgressPrimitive.Root>; }
export function Separator({ className }: { className?: string }) { return <SeparatorPrimitive.Root decorative className={cn("shrink-0 bg-border", className)} />; }

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(function PopoverContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
 return <PopoverPrimitive.Portal><PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} /></PopoverPrimitive.Portal>;
});

export type ComboboxOption = { value: string; label: string; description?: string };
export function Combobox({ value, onValueChange, options, placeholder = "请选择", searchPlaceholder = "搜索选项…", disabled = false, className }: { value: string; onValueChange: (value: string) => void; options: ComboboxOption[]; placeholder?: string; searchPlaceholder?: string; disabled?: boolean; className?: string }) {
 const [open, setOpen] = React.useState(false);
 const [query, setQuery] = React.useState("");
 const selected = options.find((option) => option.value === value);
 const filtered = options.filter((option) => (option.label + " " + (option.description ?? "")).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
  <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled} className={cn("h-9 w-full justify-between font-normal text-[13px]", !selected && "text-muted-foreground", className)}><span className="min-w-0 truncate text-left">{selected?.label ?? placeholder}</span><span aria-hidden="true" className="material-symbols-outlined ml-2 shrink-0 text-[18px] text-muted-foreground">arrow_drop_down</span></Button></PopoverTrigger>
  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2">
   <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="mb-2 h-9"/>
   <div className="max-h-60 overflow-y-auto">
    {filtered.length ? filtered.map((option) => <button key={option.value} type="button" onClick={() => { onValueChange(option.value); setOpen(false); }} className={cn("flex w-full flex-col rounded-[4px] px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent", value === option.value && "bg-accent")}><span className="font-medium">{option.label}</span>{option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}</button>) : <p className="px-3 py-6 text-center text-xs text-muted-foreground">没有匹配选项</p>}
   </div>
  </PopoverContent>
 </Popover>;
}
