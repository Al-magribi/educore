import { FilePen, FileUp } from "lucide-react";

export const SOURCE_META = {
  created: {
    label: "Dibuat di aplikasi",
    color: "blue",
    icon: FilePen,
    bg: "#dbeafe",
    fg: "#1d4ed8",
  },
  uploaded: {
    label: "File upload",
    color: "purple",
    icon: FileUp,
    bg: "#ede9fe",
    fg: "#6d28d9",
  },
};

export const fileExtension = (name) =>
  String(name || "")
    .split(".")
    .pop()
    .toUpperCase();
