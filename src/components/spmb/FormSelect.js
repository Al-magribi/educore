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
    <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function FormSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  required = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selected = value ?? "";
  const displayLabel = selected || placeholder;
  const isPlaceholder = !selected;

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
        onChange(options[highlightIndex]);
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

    const currentIndex = options.indexOf(selected);
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, options, selected]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex];
    item?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  const pick = (option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {name ? <input type="hidden" name={name} value={selected} required={required && !selected} /> : null}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required || undefined}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
          open
            ? "border-primary ring-2 ring-primary/20"
            : "border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        }`}
      >
        <span className={`min-w-0 truncate ${isPlaceholder ? "text-slate-400" : "font-medium text-slate-900"}`}>
          {displayLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">Tidak ada pilihan</li>
          ) : (
            options.map((option, index) => {
              const active = option === selected;
              const highlighted = index === highlightIndex;

              return (
                <li key={option} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => pick(option)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : highlighted
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="min-w-0 truncate">{option}</span>
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
