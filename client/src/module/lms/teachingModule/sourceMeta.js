import { FilePen, FileUp } from "lucide-react";

import { museColors } from "../../../config/theme";
export const SOURCE_META = {
  created: {
    label: "Dibuat di aplikasi",
    color: "blue",
    icon: FilePen,
    bg: museColors.primarySoft,
    fg: museColors.primary,
  },
  uploaded: {
    label: "File upload",
    color: "purple",
    icon: FileUp,
    bg: "#ede9fe",
    fg: museColors.purple,
  },
};

export const fileExtension = (name) =>
  String(name || "")
    .split(".")
    .pop()
    .toUpperCase();
