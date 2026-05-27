import type { HTMLAttributes, ReactNode } from "react";

type TypographyVariant = "h1" | "h2" | "body" | "caption";
type TypographyTone = "default" | "muted" | "playful" | "success" | "danger";
type TypographyAlign = "left" | "center" | "right";
type TypographyElement = "h1" | "h2" | "h3" | "p" | "span";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: TypographyElement;
  children: ReactNode;
  variant?: TypographyVariant;
  tone?: TypographyTone;
  align?: TypographyAlign;
}

const defaultElementByVariant: Record<TypographyVariant, TypographyElement> = {
  h1: "h1",
  h2: "h2",
  body: "p",
  caption: "p",
};

const variantClassName: Record<TypographyVariant, string> = {
  h1: "text-4xl font-black leading-tight tracking-normal sm:text-5xl",
  h2: "text-2xl font-extrabold leading-snug tracking-normal sm:text-3xl",
  body: "text-base font-medium leading-7 tracking-normal sm:text-lg",
  caption: "text-sm font-semibold leading-5 tracking-normal",
};

const toneClassName: Record<TypographyTone, string> = {
  default: "text-slate-900",
  muted: "text-slate-600",
  playful: "text-emerald-700",
  success: "text-teal-700",
  danger: "text-rose-700",
};

const alignClassName: Record<TypographyAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Typography({
  as,
  children,
  className,
  variant = "body",
  tone = "default",
  align = "left",
  ...props
}: TypographyProps) {
  const Component = as ?? defaultElementByVariant[variant];

  return (
    <Component
      className={[
        variantClassName[variant],
        toneClassName[tone],
        alignClassName[align],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
