import * as React from "react";
import * as Slot from "@radix-ui/react-slot";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/shared/lib/utils";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "default" | "outline" | "ghost" | "secondary"; size?: "default" | "sm" | "icon" };
export function Button({ className, variant = "default", size = "default", asChild = false, ...props }: ButtonProps) {
 const Comp = asChild ? Slot.Root : "button";
 return <Comp className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variant === "default" ? "bg-primary text-primary-foreground hover:opacity-90" : variant === "outline" ? "border bg-background hover:bg-accent" : variant === "secondary" ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover:bg-accent hover:text-accent-foreground", size === "default" ? "h-10 px-4 py-2" : size === "sm" ? "h-8 rounded-md px-3 text-xs" : "h-9 w-9", className)} {...props} />;
}
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />; }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />; }
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />; }
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-5 pt-0", className)} {...props} />; }
export function Badge({ className, variant = "secondary", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "success" }) { return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variant === "default" ? "bg-primary text-primary-foreground" : variant === "success" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : variant === "outline" ? "border text-foreground" : "bg-secondary text-secondary-foreground", className)} {...props} />; }
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) { return <input ref={ref} className={cn("flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />; });
export function Progress({ value, className }: { value: number; className?: string }) { return <ProgressPrimitive.Root value={value} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}><ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-transform duration-500 ease-out" style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }} /></ProgressPrimitive.Root>; }
export function Separator({ className }: { className?: string }) { return <SeparatorPrimitive.Root decorative className={cn("shrink-0 bg-border", className)} />; }
