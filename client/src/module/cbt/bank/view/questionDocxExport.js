import katex from "katex";
import katexStyles from "katex/dist/katex.min.css?inline";
import htmlToDocxBrowserUrl from "@turbodocx/html-to-docx/dist/html-to-docx.browser.js?url";

const QUESTION_TYPE_META = {
  1: { label: "PG Tunggal" },
  2: { label: "PG Multi" },
  3: { label: "Essay Uraian" },
  4: { label: "Essay Singkat" },
  5: { label: "Benar / Salah" },
  6: { label: "Mencocokkan" },
};

const BLOOM_LEVEL_META = {
  1: { short: "C1", label: "Remembering" },
  2: { short: "C2", label: "Understanding" },
  3: { short: "C3", label: "Applying" },
  4: { short: "C4", label: "Analyzing" },
  5: { short: "C5", label: "Evaluating" },
  6: { short: "C6", label: "Creating" },
};

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

let htmlToDocxLoaderPromise;

const loadBrowserScript = (src) =>
  new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[data-html-to-docx="true"][src="${src}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      if (existingScript.dataset.loaded === "true") {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.htmlToDocx = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

const loadHtmlToDocx = async () => {
  if (!htmlToDocxLoaderPromise) {
    htmlToDocxLoaderPromise = (async () => {
      if (typeof globalThis.global === "undefined") {
        globalThis.global = globalThis;
      }
      await loadBrowserScript(htmlToDocxBrowserUrl);
      const resolved = resolveHtmlToDocx(globalThis.HTMLToDOCX);

      if (!resolved) {
        console.error("html-to-docx global shape:", {
          globalType: typeof globalThis.HTMLToDOCX,
          globalKeys:
            globalThis.HTMLToDOCX && typeof globalThis.HTMLToDOCX === "object"
              ? Object.keys(globalThis.HTMLToDOCX)
              : [],
        });
        throw new TypeError("Unable to resolve html-to-docx export");
      }

      return resolved;
    })().catch((error) => {
      htmlToDocxLoaderPromise = null;
      throw error;
    });
  }

  return htmlToDocxLoaderPromise;
};

const resolveHtmlToDocx = (moduleExports) => {
  const candidates = [
    moduleExports,
    moduleExports?.default,
    moduleExports?.["module.exports"],
    moduleExports?.HTMLToDOCX,
    moduleExports?.default?.default,
    moduleExports?.default?.["module.exports"],
    moduleExports?.default?.HTMLToDOCX,
  ];

  return candidates.find((candidate) => typeof candidate === "function") || null;
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeFileName = (value = "bank-soal") =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll(" ", "-")
    .toLowerCase() || "bank-soal";

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^(data:|blob:|https?:)/i.test(url)) return url;
  return new URL(url, window.location.origin).href;
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const fetchAsDataUrl = async (url, imageCache) => {
  const absoluteUrl = toAbsoluteUrl(url);
  if (!absoluteUrl) return "";
  if (imageCache.has(absoluteUrl)) return imageCache.get(absoluteUrl);

  const promise = fetch(absoluteUrl, { credentials: "include" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      return response.blob();
    })
    .then(blobToDataUrl)
    .catch(() => absoluteUrl);

  imageCache.set(absoluteUrl, promise);
  return promise;
};

const waitForFonts = async () => {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness failures and continue with fallback rendering.
    }
  }
};

const renderFormulaToDataUrl = async (formula, formulaCache) => {
  const key = formula.trim();
  if (!key) return "";
  if (formulaCache.has(key)) return formulaCache.get(key);

  const promise = (async () => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.padding = "6px 8px";
    container.style.background = "#ffffff";
    container.style.color = "#111827";
    container.style.display = "inline-block";
    container.style.fontSize = "18px";
    container.style.lineHeight = "1.4";
    container.innerHTML = katex.renderToString(key, {
      throwOnError: false,
      output: "html",
      displayMode: false,
      strict: "ignore",
    });

    document.body.appendChild(container);
    await waitForFonts();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const rect = container.getBoundingClientRect();
    const width = Math.max(Math.ceil(rect.width), 8);
    const height = Math.max(Math.ceil(rect.height), 8);
    const renderedHtml = container.innerHTML;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <style>${katexStyles}</style>
            <div style="padding:6px 8px;background:#ffffff;color:#111827;display:inline-block;font-size:18px;line-height:1.4;">
              ${renderedHtml}
            </div>
          </div>
        </foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = svgUrl;
      });

      const ratio = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context is unavailable");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(ratio, ratio);
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(svgUrl);
      document.body.removeChild(container);
    }
  })().catch(() => "");

  formulaCache.set(key, promise);
  return promise;
};

const replaceEmbeddedMedia = (root) => {
  root.querySelectorAll("audio, video, iframe").forEach((element) => {
    const src = element.getAttribute("src") || "";
    const replacement = document.createElement("p");
    replacement.textContent = src ? `Media: ${toAbsoluteUrl(src)}` : "Media";
    element.replaceWith(replacement);
  });
};

const prepareRichHtml = async (value, imageCache, formulaCache) => {
  if (!value) return "";

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(
    `<div>${value}</div>`,
    "text/html",
  );
  const root = documentFragment.body.firstElementChild;

  if (!root) return "";

  replaceEmbeddedMedia(root);

  const formulaNodes = [...root.querySelectorAll(".ql-formula[data-value]")];
  for (const node of formulaNodes) {
    const formula = node.getAttribute("data-value") || "";
    const dataUrl = await renderFormulaToDataUrl(formula, formulaCache);

    if (dataUrl) {
      const image = document.createElement("img");
      image.setAttribute("src", dataUrl);
      image.setAttribute("alt", formula);
      image.setAttribute("title", formula);
      image.setAttribute(
        "style",
        "display:inline-block;vertical-align:middle;max-height:28px;",
      );
      node.replaceWith(image);
    } else {
      const fallback = document.createElement("span");
      fallback.textContent = formula;
      node.replaceWith(fallback);
    }
  }

  const images = [...root.querySelectorAll("img[src]")];
  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src) continue;

    const dataUrl = await fetchAsDataUrl(src, imageCache);
    if (dataUrl) {
      image.setAttribute("src", dataUrl);
    }

    const style = image.getAttribute("style") || "";
    image.setAttribute(
      "style",
      `${style};max-width:100%;height:auto;object-fit:contain;`.trim(),
    );
  }

  return root.innerHTML;
};

const buildMetaLine = (question) => {
  const typeMeta = QUESTION_TYPE_META[question.q_type] || { label: "Unknown" };
  const bloomMeta = BLOOM_LEVEL_META[question.bloom_level];
  const bloomText = bloomMeta
    ? `${bloomMeta.short} ${bloomMeta.label}`
    : "Belum Diatur";

  return `
    <p>
      <strong>Tipe:</strong> ${escapeHtml(typeMeta.label)}<br />
      <strong>Bloom Level:</strong> ${escapeHtml(bloomText)}<br />
      <strong>Poin:</strong> ${escapeHtml(question.score_point || 0)}
    </p>
  `;
};

const buildOptionsHtml = (question, preparedOptions) => {
  if (!preparedOptions.length) {
    return `<p class="muted">Tidak ada opsi jawaban.</p>`;
  }

  if (question.q_type === 6) {
    const rows = preparedOptions
      .map(
        (option, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${option.content || "-"}</td>
            <td>${option.label || "-"}</td>
          </tr>
        `,
      )
      .join("");

    return `
      <p><strong>Opsi:</strong></p>
      <table class="plain-table">
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const items = preparedOptions
    .map((option, index) => {
      const marker =
        question.q_type === 4
          ? `${index + 1}.`
          : `${String.fromCharCode(65 + index)}.`;

      return `
        <li>
          <span class="option-marker">${marker}</span>
          <div class="option-content">${option.content || "-"}</div>
        </li>
      `;
    })
    .join("");

  return `
    <p><strong>Opsi:</strong></p>
    <ol class="options-list">${items}</ol>
  `;
};

const buildAnswerKeyHtml = (question, preparedOptions) => {
  if (question.q_type === 3) {
    return `<p class="answer-key">Kunci Jawaban: Penilaian manual</p>`;
  }

  if (question.q_type === 6) {
    if (!preparedOptions.length) {
      return `<p class="answer-key">Kunci Jawaban: Tidak tersedia</p>`;
    }

    const items = preparedOptions
      .map(
        (option, index) => `
          <li>${index + 1}. ${option.content || "-"} - ${option.label || "-"}</li>
        `,
      )
      .join("");

    return `
      <div class="answer-key">
        <strong>Kunci Jawaban:</strong>
        <ol>${items}</ol>
      </div>
    `;
  }

  const correctOptions = preparedOptions.filter(
    (_, index) => question.options?.[index]?.is_correct,
  );

  if (!correctOptions.length) {
    return `<p class="answer-key">Kunci Jawaban: Tidak tersedia</p>`;
  }

  if (question.q_type === 4) {
    const answers = correctOptions
      .map((option) => option.content || "-")
      .join(", ");
    return `<p class="answer-key"><strong>Kunci Jawaban:</strong> ${answers}</p>`;
  }

  const answers = correctOptions
    .map((option, index) => {
      const actualIndex = preparedOptions.indexOf(option);
      return `${String.fromCharCode(65 + actualIndex)} (${option.content || "-"})`;
    })
    .join(", ");

  return `<p class="answer-key"><strong>Kunci Jawaban:</strong> ${answers}</p>`;
};

const buildDocumentHtml = ({ bankName, generatedAt, questions }) => {
  const sections = questions
    .map(
      (question, index) => `
        <section class="question-section">
          <p><strong>Soal ${index + 1}</strong></p>
          ${buildMetaLine(question)}
          <p><strong>Pertanyaan:</strong></p>
          <div class="question-content">${question.preparedContent || ""}</div>
          ${buildOptionsHtml(question, question.preparedOptions || [])}
          ${buildAnswerKeyHtml(question, question.preparedOptions || [])}
        </section>
      `,
    )
    .join('<p class="question-separator"></p>');

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(bankName)}</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.6;
            margin: 0;
          }
          h1 {
            margin: 0 0 10px;
            color: #0f172a;
          }
          h1 {
            font-size: 18px;
          }
          p {
            margin: 0 0 8px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .document-header {
            margin-bottom: 18px;
          }
          .document-subtitle {
            color: #475569;
          }
          .question-section {
            margin-bottom: 16px;
          }
          .question-content {
            margin-bottom: 10px;
          }
          .options-list {
            margin: 0 0 10px 20px;
            padding-left: 0;
          }
          .options-list li {
            margin-bottom: 6px;
          }
          .plain-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 10px;
          }
          .plain-table td {
            padding: 4px 6px 4px 0;
            vertical-align: top;
            text-align: left;
          }
          .answer-key {
            margin-top: 8px;
          }
          .answer-key ol {
            margin: 6px 0 0 18px;
            padding: 0;
          }
          .muted {
            color: #64748b;
          }
          .question-separator {
            margin: 0 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <h1>Bank Soal ${escapeHtml(bankName)}</h1>
          <p class="document-subtitle">Jumlah soal: ${questions.length}</p>
          <p class="document-subtitle">Dibuat pada: ${escapeHtml(generatedAt)}</p>
        </div>
        ${sections || '<p class="muted">Belum ada soal untuk diexport.</p>'}
      </body>
    </html>
  `;
};

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportQuestionsToDocx = async ({ bankName, questions }) => {
  const imageCache = new Map();
  const formulaCache = new Map();

  const preparedQuestions = await Promise.all(
    questions.map(async (question) => {
      const preparedContent = await prepareRichHtml(
        question.content,
        imageCache,
        formulaCache,
      );
      const preparedOptions = await Promise.all(
        (question.options || []).map(async (option) => ({
          ...option,
          content: await prepareRichHtml(option.content, imageCache, formulaCache),
          label: await prepareRichHtml(option.label, imageCache, formulaCache),
        })),
      );

      return {
        ...question,
        preparedContent,
        preparedOptions,
      };
    }),
  );

  const html = buildDocumentHtml({
    bankName: bankName?.replaceAll("-", " ") || "Bank Soal",
    generatedAt: new Date().toLocaleString("id-ID"),
    questions: preparedQuestions,
  });

  const htmlToDocx = await loadHtmlToDocx();
  const result = await htmlToDocx(html, null, {
    title: bankName?.replaceAll("-", " ") || "Bank Soal",
    creator: "Educore",
    table: {
      row: {
        cantSplit: true,
      },
    },
    footer: false,
    pageNumber: true,
  });

  const blob =
    result instanceof Blob ? result : new Blob([result], { type: DOCX_MIME });
  const fileName = `${sanitizeFileName(bankName || "bank-soal")}.docx`;
  triggerDownload(blob, fileName);
};
