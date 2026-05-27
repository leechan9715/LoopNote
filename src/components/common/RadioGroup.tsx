import type { ChangeEvent, ReactNode } from "react";

export type RadioGroupOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: ReactNode;
};

export interface RadioGroupProps<TValue extends string> {
  name: string;
  label: string;
  value: TValue;
  options: RadioGroupOption<TValue>[];
  onChange: (value: TValue) => void;
  errorMessage?: ReactNode;
  required?: boolean;
}

export function RadioGroup<TValue extends string>({
  errorMessage,
  label,
  name,
  onChange,
  options,
  required = false,
  value,
}: RadioGroupProps<TValue>) {
  const errorId = errorMessage ? `${name}-error` : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value as TValue);
  };

  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={errorMessage ? true : undefined}
      className="flex w-full flex-col gap-3"
    >
      <legend className="text-sm font-extrabold text-slate-800">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          const isSelected = option.value === value;

          return (
            <label
              className={[
                "flex min-h-24 cursor-pointer flex-col justify-center rounded-3xl border-2 bg-white px-4 py-3 shadow-sm transition focus-within:outline-none focus-within:ring-4 focus-within:ring-sky-200",
                isSelected
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                  : "border-sky-200 text-slate-800 hover:border-sky-300 hover:bg-sky-50",
              ].join(" ")}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                checked={isSelected}
                className="sr-only"
                id={optionId}
                name={name}
                onChange={handleChange}
                required={required}
                type="radio"
                value={option.value}
              />
              <span className="text-base font-extrabold">{option.label}</span>
              {option.description ? (
                <span className="mt-1 text-sm font-semibold text-slate-600">
                  {option.description}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      {errorMessage ? (
        <p className="text-sm font-bold text-rose-700" id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  );
}
