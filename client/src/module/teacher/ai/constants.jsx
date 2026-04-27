import React from "react";
import {
  AudioLines,
  BrainCircuit,
  FileCheck2,
  FileText,
  KeyRound,
  Mic2,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
};

export const audioModelOptions = [
  {
    label: "gpt-4o-mini-transcribe",
    value: "gpt-4o-mini-transcribe",
  },
  {
    label: "gpt-4o-transcribe",
    value: "gpt-4o-transcribe",
  },
];

export const textModelOptions = [
  { label: "gpt-4.1-mini", value: "gpt-4.1-mini" },
  { label: "gpt-4.1", value: "gpt-4.1" },
  { label: "gpt-4o-mini", value: "gpt-4o-mini" },
];

export const languageOptions = [
  { label: "Bahasa Indonesia", value: "id" },
  { label: "English", value: "en" },
];

export const featureMeta = [
  {
    key: "question_generator",
    title: "Generator Soal",
    scopeLabel: "Fitur 01",
    scopeType: "text",
    description:
      "Gunakan AI untuk membantu menyusun draft soal dari topik dan level kelas.",
    icon: <FileText size={18} />,
    tone: "#1d4ed8",
    bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
  },
  {
    key: "essay_grader",
    title: "Pemeriksa Essay",
    scopeLabel: "Fitur 02",
    scopeType: "text",
    description:
      "Bantu koreksi jawaban uraian dengan masukan skor dan alasan penilaian.",
    icon: <FileCheck2 size={18} />,
    tone: "#047857",
    bg: "linear-gradient(135deg, #d1fae5, #ecfccb)",
  },
  {
    key: "speech_to_text",
    title: "Speech to Text",
    scopeLabel: "Fitur 03",
    scopeType: "audio",
    description:
      "Transkripsi audio guru dengan mode live browser atau AI dari file rekaman.",
    icon: <Mic2 size={18} />,
    tone: "#9a3412",
    bg: "linear-gradient(135deg, #ffedd5, #fef3c7)",
  },
];

export const createSummaryCards = (config, isMobile) => [
  {
    key: "provider",
    title: "Provider",
    value: (config?.provider || "openai").toUpperCase(),
    icon: <BrainCircuit size={18} />,
    color: "#1d4ed8",
    bg: "linear-gradient(135deg, #dbeafe, #eef2ff)",
    fontSize: isMobile ? 18 : 22,
  },
  {
    key: "mode",
    title: "Mode Default",
    value: config?.default_mode === "ai" ? "AI" : "Live",
    icon:
      config?.default_mode === "ai" ? (
        <Sparkles size={18} />
      ) : (
        <Radio size={18} />
      ),
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #ecfeff)",
    fontSize: isMobile ? 18 : 22,
  },
  {
    key: "key",
    title: "Status API Key",
    value: config?.has_api_key ? "Tersimpan" : "Belum Ada",
    icon: config?.has_api_key ? (
      <ShieldCheck size={18} />
    ) : (
      <KeyRound size={18} />
    ),
    color: config?.has_api_key ? "#15803d" : "#b45309",
    bg: config?.has_api_key
      ? "linear-gradient(135deg, #dcfce7, #ecfccb)"
      : "linear-gradient(135deg, #fef3c7, #ffedd5)",
    fontSize: isMobile ? 18 : 22,
  },
  {
    key: "test",
    title: "Tes Terakhir",
    value:
      config?.last_test_status === "success"
        ? "Berhasil"
        : config?.last_test_status === "failed"
          ? "Gagal"
          : "Belum Tes",
    icon: <AudioLines size={18} />,
    color:
      config?.last_test_status === "success"
        ? "#15803d"
        : config?.last_test_status === "failed"
          ? "#b91c1c"
          : "#475569",
    bg: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    fontSize: isMobile ? 18 : 22,
  },
];
