"use client";

import { useEffect, useId, useRef, useState } from "react";

function ChevronIcon({ open, className = "" }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[var(--admin-primary)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-slate-300 border-t-[var(--admin-primary)] ${className}`}
      aria-hidden
    />
  );
}

const SIZE_CLASS = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2.5 text-sm",
};

const OPTION_SIZE_CLASS = {
  sm: "px-2.5 py-2 text-xs",
  md: "px-3 py-2.5 text-sm",
};

/**
 * @param {{
 *   id?: string;
 *   value: string;
 *   onChange: (value: string) => void;
 *   options: Array<{ value: string; label: string; indicatorClassName?: string }>;
 *   placeholder?: string;
 *   disabled?: boolean;
 *   loading?: boolean;
 *   size?: "sm" | "md";
 *   className?: string;
 *   align?: "left" | "right";
 *   "aria-label"?: string;
 * }} props
 */
export function AdminSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  disabled = false,
  loading = false,
  size = "md",
  className = "",
  align = "left",
  "aria-label": ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const triggerId = id ?? `admin-select-${listId}`;

  const selectedOption = options.find((option) => option.value === value) ?? null;
  const displayLabel = selectedOption?.label ?? placeholder;
  const isPlaceholder = !selectedOption;
  const isDisabled = disabled || loading;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (!open || options.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % options.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
      } else if (event.key === "Enter" && highlightIndex >= 0) {
        event.preventDefault();
        onChange(options[highlightIndex].value);
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, options, highlightIndex, onChange]);

  useEffect(() => {
    if (!open) {
      setHighlightIndex(-1);
      return;
    }

    const currentIndex = options.findIndex((option) => option.value === value);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex];
    item?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  const pick = (optionValue) => {
    if (optionValue !== value) {
      onChange(optionValue);
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={triggerId}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        onClick={() => !isDisabled && setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left shadow-sm transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${SIZE_CLASS[size]} ${
          open
            ? "border-[var(--admin-primary)] ring-2 ring-[var(--admin-ring)]"
            : "border-slate-200 hover:border-slate-300 focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
        } ${loading ? "opacity-90" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.indicatorClassName ? (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${selectedOption.indicatorClassName}`}
              aria-hidden
            />
          ) : null}
          <span className={`truncate ${isPlaceholder ? "text-slate-400" : "font-medium text-slate-900"}`}>
            {displayLabel}
          </span>
        </span>
        {loading ? <Spinner className="h-3.5 w-3.5" /> : <ChevronIcon open={open} />}
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className={`absolute z-40 mt-1.5 max-h-60 min-w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">Tidak ada pilihan</li>
          ) : (
            options.map((option, index) => {
              const active = option.value === value;
              const highlighted = index === highlightIndex;

              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => pick(option.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg text-left transition ${OPTION_SIZE_CLASS[size]} ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] font-medium text-[var(--admin-primary)]"
                        : highlighted
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {option.indicatorClassName ? (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${option.indicatorClassName}`}
                          aria-hidden
                        />
                      ) : null}
                      <span className="truncate">{option.label}</span>
                    </span>
                    {active ? <CheckIcon /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
