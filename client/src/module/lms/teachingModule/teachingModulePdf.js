import {
  APPENDIX_SECTIONS,
  CORE_SECTIONS,
  GENERAL_SECTIONS,
  IDENTITY_FIELDS,
  MEETING_PARTS,
  formatSignatureDate,
  normalizeContent,
} from "./moduleSchema";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGINS = [72, 60, 64, 60];
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGINS[0] - PAGE_MARGINS[2];
const COVER_MAX_PIXEL_WIDTH = 2480;
const SECTION_INDENT = 18;
const PDF_TIMEOUT_MS = 45000;

let pdfLibsPromise = null;

const loadPdfLibs = () => {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([
      import("pdfmake/build/pdfmake"),
      import("html-to-pdfmake"),
    ])
      .then(([pdfMakeModule, htmlToPdfmakeModule]) => {
        const pdfMake = pdfMakeModule.default || pdfMakeModule;
        const origin = window.location.origin;
        pdfMake.vfs = pdfMake.vfs || {};
        pdfMake.fonts = {
          Tinos: {
            normal: `${origin}/fonts/tinos/Tinos-Regular.ttf`,
            bold: `${origin}/fonts/tinos/Tinos-Bold.ttf`,
            italics: `${origin}/fonts/tinos/Tinos-Italic.ttf`,
            bolditalics: `${origin}/fonts/tinos/Tinos-BoldItalic.ttf`,
          },
        };
        return {
          pdfMake,
          htmlToPdfmake: htmlToPdfmakeModule.default || htmlToPdfmakeModule,
        };
      })
      .catch((error) => {
        pdfLibsPromise = null;
        throw error;
      });
  }
  return pdfLibsPromise;
};

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .trim();

export const isHtmlEmpty = (html) =>
  !stripHtml(html) && !/<(img|table)\b/i.test(String(html || ""));

// Quill 2 getSemanticHTML mengganti setiap spasi menjadi &nbsp; sehingga baris
// tidak bisa di-wrap oleh pdfmake; gambar relatif harus absolut agar bisa diunduh.
const prepareHtml = (html) =>
  String(html || "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/(<img[^>]*\bsrc=["'])(\/[^"']+)/gi, `$1${window.location.origin}$2`);

const toAbsoluteUrl = (url) =>
  /^\//.test(url) ? `${window.location.origin}${url}` : url;

const loadImageElement = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Gambar gagal dimuat: ${url}`));
    image.src = toAbsoluteUrl(url);
  });

// pdfmake (pdfkit) hanya mengenali PNG & JPEG, jadi format lain dikonversi lewat canvas.
const imageToDataUrl = (image, { type = "image/png", maxWidth } = {}) => {
  const scale =
    maxWidth && image.naturalWidth > maxWidth
      ? maxWidth / image.naturalWidth
      : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (type === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.92);
};

const loadCoverImage = async (coverUrl) => {
  if (!coverUrl) return null;
  try {
    const image = await loadImageElement(coverUrl);
    return {
      dataUrl: imageToDataUrl(image, {
        type: "image/jpeg",
        maxWidth: COVER_MAX_PIXEL_WIDTH,
      }),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch (error) {
    console.warn("[Modul Ajar] Cover dilewati:", error);
    return null;
  }
};

const convertUnsupportedImages = async (images) => {
  await Promise.all(
    Object.entries(images).map(async ([key, src]) => {
      if (typeof src !== "string" || !/\.webp(\?|#|$)/i.test(src)) return;
      images[key] = imageToDataUrl(await loadImageElement(src));
    }),
  );
};

const buildCoverBackground = (cover) => {
  const scale = Math.min(PAGE_WIDTH / cover.width, PAGE_HEIGHT / cover.height);
  const width = cover.width * scale;
  const height = cover.height * scale;
  return {
    image: "cover",
    width,
    height,
    absolutePosition: {
      x: (PAGE_WIDTH - width) / 2,
      y: (PAGE_HEIGHT - height) / 2,
    },
  };
};

const limitImageWidth = (node, maxWidth) => {
  if (Array.isArray(node)) {
    node.forEach((item) => limitImageWidth(item, maxWidth));
    return;
  }
  if (!node || typeof node !== "object") return;
  if (node.image) {
    node.maxWidth = maxWidth;
  }
  ["stack", "ul", "ol", "columns"].forEach((key) => {
    if (node[key]) limitImageWidth(node[key], maxWidth);
  });
  if (node.text && Array.isArray(node.text)) limitImageWidth(node.text, maxWidth);
  if (node.table?.body) {
    node.table.body.forEach((row) => limitImageWidth(row, maxWidth / 2));
  }
};

const createHtmlConverter = (htmlToPdfmake) => {
  const images = {};
  const convert = (html, indent = SECTION_INDENT) => {
    if (isHtmlEmpty(html)) {
      return { text: "-", margin: [indent, 0, 0, 6] };
    }
    const result = htmlToPdfmake(prepareHtml(html), {
      imagesByReference: true,
      removeExtraBlanks: true,
      defaultStyles: {
        p: { margin: [0, 0, 0, 3] },
        ul: { marginBottom: 3, marginLeft: 0 },
        ol: { marginBottom: 3 },
        li: { marginBottom: 1 },
        table: { marginBottom: 6 },
        th: { bold: true, fillColor: "#f1f5f9" },
        h1: { fontSize: 14, bold: true, marginBottom: 4 },
        h2: { fontSize: 13, bold: true, marginBottom: 4 },
        h3: { fontSize: 12, bold: true, marginBottom: 3 },
        a: { color: "#1d4ed8", decoration: "underline" },
      },
    });
    Object.assign(images, result.images || {});
    limitImageWidth(result.content, CONTENT_WIDTH - indent);
    return {
      stack: Array.isArray(result.content) ? result.content : [result.content],
      margin: [indent, 0, 0, 6],
    };
  };
  return { convert, images };
};

const sectionHeading = (text, extra = {}) => ({
  text,
  style: "sectionHeading",
  ...extra,
});

const subHeading = (text, indent = 0) => ({
  text,
  style: "subHeading",
  margin: [indent, 4, 0, 3],
});

const buildIdentity = (identity) => ({
  stack: IDENTITY_FIELDS.map(({ key, label }) => ({
    columns: [
      { width: 150, text: label },
      { width: 12, text: ":" },
      { width: "*", text: identity[key] || "-" },
    ],
    columnGap: 0,
    margin: [SECTION_INDENT, 0, 0, 2],
  })),
  margin: [0, 0, 0, 8],
});

const buildPancasilaProfile = (items) =>
  items.length > 0
    ? {
        ul: items,
        type: "square",
        margin: [SECTION_INDENT, 0, 0, 6],
      }
    : { text: "-", margin: [SECTION_INDENT, 0, 0, 6] };

const buildMeetings = (meetings, convert) =>
  meetings.flatMap((meeting, index) => [
    {
      text: meeting.title || `Pertemuan ${index + 1}`,
      bold: true,
      margin: [SECTION_INDENT, index === 0 ? 0 : 6, 0, 3],
    },
    ...MEETING_PARTS.flatMap((part, partIndex) => [
      subHeading(
        `${String.fromCharCode(97 + partIndex)}. ${part.label}`,
        SECTION_INDENT + 12,
      ),
      convert(meeting[part.key], SECTION_INDENT + 24),
    ]),
  ]);

const buildSignature = (signature) => {
  const signer = (lines, name, nip) => ({
    width: "*",
    stack: [
      ...lines.map((text) => ({ text })),
      { text: " ", margin: [0, 0, 0, 48] },
      { text: name || "( ........................................ )", bold: true },
      { text: `NIP. ${nip || "-"}` },
    ],
    alignment: "center",
  });
  const place = [signature.city, formatSignatureDate(signature.date)]
    .filter(Boolean)
    .join(", ");

  return {
    columns: [
      signer(
        ["Mengetahui,", "Kepala Sekolah"],
        signature.principal_name,
        signature.principal_nip,
      ),
      signer(
        [place || " ", "Guru Mata Pelajaran"],
        signature.teacher_name,
        signature.teacher_nip,
      ),
    ],
    columnGap: 40,
    margin: [0, 24, 0, 0],
    unbreakable: true,
  };
};

export const buildTeachingModuleDoc = (
  module,
  htmlToPdfmake,
  { cover = null } = {},
) => {
  const content = normalizeContent(module?.content);
  const { convert, images } = createHtmlConverter(htmlToPdfmake);
  const { general, core, appendix } = content;

  const generalBody = GENERAL_SECTIONS.flatMap(({ key, letter, label }) => [
    subHeading(`${letter}. ${label.toUpperCase()}`),
    key === "pancasila_profile"
      ? buildPancasilaProfile(general.pancasila_profile)
      : convert(general[key]),
  ]);

  const coreBody = CORE_SECTIONS.flatMap(({ key, letter, label }) => {
    const heading = subHeading(`${letter}. ${label.toUpperCase()}`);
    if (key !== "meetings") return [heading, convert(core[key])];
    return [
      heading,
      ...buildMeetings(core.meetings, convert),
      ...(isHtmlEmpty(core.learning_notes)
        ? []
        : [convert(core.learning_notes)]),
    ];
  });

  const hasAppendix = APPENDIX_SECTIONS.some(
    ({ key }) => !isHtmlEmpty(appendix[key]),
  );
  const appendixBody = hasAppendix
    ? [
        sectionHeading("LAMPIRAN", { pageBreak: "before" }),
        ...APPENDIX_SECTIONS.filter(({ key }) => !isHtmlEmpty(appendix[key]))
          .flatMap(({ key, label }, index) => [
            subHeading(
              `${String.fromCharCode(65 + index)}. ${label.toUpperCase()}`,
            ),
            convert(appendix[key]),
          ]),
      ]
    : [];

  const pageOffset = cover ? 1 : 0;

  return {
    pageSize: "A4",
    pageMargins: PAGE_MARGINS,
    info: {
      title: module?.title || "Modul Ajar",
      author: content.identity.author || "",
      subject: content.identity.subject || "",
    },
    background: cover
      ? (currentPage) => (currentPage === 1 ? buildCoverBackground(cover) : null)
      : undefined,
    content: [
      ...(cover ? [{ text: "", pageBreak: "after" }] : []),
      { text: content.heading, style: "docTitle" },
      {
        text: String(module?.title || "").toUpperCase(),
        style: "docSubtitle",
      },
      sectionHeading("INFORMASI UMUM"),
      subHeading("A. IDENTITAS MODUL"),
      buildIdentity(content.identity),
      ...generalBody,
      sectionHeading("KOMPONEN INTI"),
      ...coreBody,
      ...appendixBody,
      buildSignature(content.signature),
    ],
    images: cover ? { ...images, cover: cover.dataUrl } : images,
    footer: (currentPage, pageCount) =>
      currentPage <= pageOffset
        ? null
        : {
            text: `${currentPage - pageOffset} / ${pageCount - pageOffset}`,
            alignment: "right",
            fontSize: 9,
            color: "#64748b",
            margin: [0, 20, PAGE_MARGINS[2], 0],
          },
    defaultStyle: {
      font: "Tinos",
      fontSize: 12,
      lineHeight: 1.25,
      alignment: "justify",
    },
    styles: {
      docTitle: { fontSize: 14, bold: true, alignment: "center" },
      docSubtitle: {
        fontSize: 13,
        bold: true,
        alignment: "center",
        margin: [0, 2, 0, 16],
      },
      sectionHeading: { bold: true, margin: [0, 8, 0, 4], alignment: "left" },
      subHeading: { bold: true, alignment: "left" },
      "ql-align-center": { alignment: "center" },
      "ql-align-right": { alignment: "right" },
      "ql-align-justify": { alignment: "justify" },
    },
  };
};

const buildFileName = (module) => {
  const base = String(module?.title || "modul-ajar")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `Modul Ajar - ${base || "Tanpa Judul"}.pdf`;
};

const createPdfBlob = async (module) => {
  const [{ pdfMake, htmlToPdfmake }, cover] = await Promise.all([
    loadPdfLibs(),
    loadCoverImage(module?.content?.cover_url),
  ]);
  const docDefinition = buildTeachingModuleDoc(module, htmlToPdfmake, {
    cover,
  });
  await convertUnsupportedImages(docDefinition.images);
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Pembuatan PDF melebihi batas waktu.")),
      PDF_TIMEOUT_MS,
    );
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        window.clearTimeout(timer);
        resolve(blob);
      });
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  });
};

const resolveModule = (moduleOrLoader) =>
  typeof moduleOrLoader === "function" ? moduleOrLoader() : moduleOrLoader;

export const downloadTeachingModulePdf = async (moduleOrLoader) => {
  const module = await resolveModule(moduleOrLoader);
  const blob = await createPdfBlob(module);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildFileName(module);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// Tab dibuka sinkron sebelum proses async agar tidak diblokir popup blocker.
export const openTeachingModulePdf = async (moduleOrLoader) => {
  const previewWindow = window.open("", "_blank");
  try {
    const module = await resolveModule(moduleOrLoader);
    const blob = await createPdfBlob(module);
    const url = URL.createObjectURL(blob);
    if (previewWindow) {
      previewWindow.location.href = url;
    } else {
      window.open(url, "_blank");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};
