import { useState } from "react";
import { message } from "antd";
import { useLazyGetTeachingModuleDetailQuery } from "../../../service/lms/ApiTeachingModule";
import {
  downloadTeachingModulePdf,
  openTeachingModulePdf,
} from "./teachingModulePdf";

const triggerFileDownload = (url, fileName) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const useTeachingModuleActions = () => {
  const [busyKey, setBusyKey] = useState(null);
  const [fetchDetail] = useLazyGetTeachingModuleDetailQuery();

  const loadDetail = async (module) => {
    const response = await fetchDetail(module.id).unwrap();
    return response?.data;
  };

  const runPdfAction = async (module, mode) => {
    setBusyKey(`${mode}-${module.id}`);
    try {
      const loader = () => loadDetail(module);
      if (mode === "open") {
        await openTeachingModulePdf(loader);
      } else {
        await downloadTeachingModulePdf(loader);
      }
    } catch (error) {
      message.error(
        error?.data?.message || error?.message || "Gagal membuat PDF modul.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const openModule = (module) => {
    if (module.source_type === "uploaded") {
      window.open(module.file_url, "_blank", "noopener");
      return;
    }
    runPdfAction(module, "open");
  };

  const downloadModule = (module) => {
    if (module.source_type === "uploaded") {
      triggerFileDownload(module.file_url, module.file_name);
      return;
    }
    runPdfAction(module, "download");
  };

  const isBusy = (module, mode) => busyKey === `${mode}-${module.id}`;

  return { openModule, downloadModule, isBusy };
};

export default useTeachingModuleActions;
