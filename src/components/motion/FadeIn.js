"use client";

import { motion } from "framer-motion";

const defaultVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  as = "div",
  ...props
}) {
  const Component = motion[as] ?? motion.div;

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      variants={defaultVariants}
      {...props}
    >
      {children}
    </Component>
  );
}
