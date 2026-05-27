import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: ReactNode;
  errorMessage?: ReactNode;
  fullWidth?: boolean;
}

const inputBaseClassName =
  "min-h-12 rounded-3xl border-2 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

export function Input({
  className,
  errorMessage,
  fullWidth = true,
  helperText,
  id,
  label,
  name,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? name;
  const errorId = inputId && errorMessage ? `${inputId}-error` : undefined;
  const helperId = inputId && helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["flex flex-col gap-2", fullWidth ? "w-full" : ""].filter(Boolean).join(" ")}>
      {label ? (
        <label className="text-sm font-extrabold text-slate-800" htmlFor={inputId}>
          {label}
          {required ? <span className="ml-1 text-rose-600">*</span> : null}
        </label>
      ) : null}
      <input
        aria-describedby={describedBy}
        aria-invalid={errorMessage ? true : undefined}
        className={[
          inputBaseClassName,
          errorMessage ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-sky-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        id={inputId}
        name={name}
        required={required}
        {...props}
      />
      {errorMessage ? (
        <p className="text-sm font-bold text-rose-700" id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p className="text-sm font-semibold text-slate-500" id={helperId}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
