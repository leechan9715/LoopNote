import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 font-extrabold tracking-normal shadow-sm transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:pointer-events-none disabled:opacity-60 motion-safe:active:scale-[0.98]";

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "border-emerald-500 bg-emerald-400 text-emerald-950 shadow-emerald-100 hover:bg-emerald-300",
  secondary:
    "border-amber-400 bg-amber-200 text-amber-950 shadow-amber-100 hover:bg-amber-100",
  outline:
    "border-sky-300 bg-white text-sky-800 shadow-sky-100 hover:border-sky-400 hover:bg-sky-50",
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-12 px-6 py-3 text-base",
  lg: "min-h-14 px-8 py-4 text-lg",
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={[
        baseClassName,
        variantClassName[variant],
        sizeClassName[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading ? rightIcon : null}
    </button>
  );
}
