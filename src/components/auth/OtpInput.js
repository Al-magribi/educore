"use client";

import { useRef, useState } from "react";

export function OtpInput({ length = 6, value, onChange }) {
  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(
    () => value?.split("").concat(Array(length).fill("")).slice(0, length) ?? Array(length).fill("")
  );

  const update = (next) => {
    setDigits(next);
    onChange?.(next.join(""));
  };

  const handleChange = (index, char) => {
    if (char && !/^\d$/.test(char)) return;
    const next = [...digits];
    next[index] = char;
    update(next);
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill("");
    pasted.split("").forEach((c, i) => {
      next[i] = c;
    });
    update(next);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-12 w-10 rounded-xl border border-slate-200 text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-14 sm:w-12"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
