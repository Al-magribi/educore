"use client";

import { useEffect, useId, useRef, useState } from "react";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

/**
 * Select kustom admin dengan opsi { value, label, description? }.
 */
export function AdminSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const buttonId = id ?? listId;

  const selected = options.find((o) => o.value === value) ?? null;
  const isPlaceholder = !selected;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
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
    const currentIndex = options.findIndex((o) => o.value === value);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    listRef.current.children[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        id={buttonId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          open
            ? "border-[var(--admin-primary)] ring-2 ring-[var(--admin-ring)]"
            : "border-slate-200 hover:border-slate-300 focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
        }`}
      >
        <span className={`min-w-0 truncate ${isPlaceholder ? "text-slate-400" : "font-medium text-slate-900"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={buttonId}
          className="absolute z-40 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5"
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
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]"
                        : highlighted
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm ${active ? "font-semibold" : "font-medium"}`}>
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                      ) : null}
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
