"use client";

import { motion } from "framer-motion";

export function AuthButton({
  children,
  type = "submit",
  variant = "primary",
  disabled,
  onClick,
}) {
  const variants = {
    primary:
      "bg-primary text-white shadow-md shadow-primary/20 hover:bg-[#1d4ed8] disabled:opacity-60",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${variants[variant] ?? variants.primary}`}
    >
      {children}
    </motion.button>
  );
}
