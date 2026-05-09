import React, { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import katex from "katex";
import "katex/dist/katex.min.css";

const QL_FORMULA_REGEX =
  /<span([^>]*)class=["']([^"']*\bql-formula\b[^"']*)["']([^>]*)data-value=["']([^"']+)["']([^>]*)><\/span>/gi;

const INLINE_FORMULA_REGEX = /\$([^$]+)\$/g;

const MATH_TEXT_PATTERN =
  /\\[a-zA-Z]+|[\^_=]|[+\-*/]|[(){}\[\]]|\d+\s*(?:x|×|÷|\/|\+|\-|\*|=)\s*\d+/;

const NON_MATH_LETTER_PATTERN = /[A-Za-z]{2,}/;

const looksLikeStandaloneMath = (text = "") => {
  const trimmed = String(text).replace(/\u00a0/g, " ").trim();
  if (!trimmed) return false;
  if (!MATH_TEXT_PATTERN.test(trimmed)) return false;
  if (NON_MATH_LETTER_PATTERN.test(trimmed) && !trimmed.includes("\\")) {
    return false;
  }

  const normalized = trimmed.replace(/\s+/g, "");
  return /^[0-9A-Za-z\\^_=+\-*/().,{}[\]|<>:%×÷]+$/.test(normalized);
};

const prepareHtmlContent = (value) => {
  if (typeof value !== "string" || !value) return "";

  const normalizedFormulaSpans = value.replace(
    QL_FORMULA_REGEX,
    (_, beforeClass, classValue, betweenAttrs, formula, afterAttrs) =>
      `<span${beforeClass}class="${classValue}"${betweenAttrs}data-value="${formula}"${afterAttrs}></span>`,
  );

  if (normalizedFormulaSpans.includes('class="ql-formula"')) {
    return normalizedFormulaSpans;
  }

  return normalizedFormulaSpans.replace(
    INLINE_FORMULA_REGEX,
    (_, formula) => `<span class="ql-formula" data-value="${formula}"></span>`,
  );
};

const RichContentViewer = ({ value, className = "", style }) => {
  const containerRef = useRef(null);
  const html = useMemo(() => prepareHtmlContent(value), [value]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderKatexNode = (node) => {
      const formula = node.getAttribute("data-value") || "";
      try {
        katex.render(formula, node, {
          throwOnError: false,
          displayMode: false,
          strict: "ignore",
        });
      } catch {
        node.textContent = formula;
      }
    };

    const candidateElements = container.querySelectorAll("p, li, div, span");
    candidateElements.forEach((element) => {
      if (element.querySelector(".ql-formula, img, audio, video, iframe")) {
        return;
      }

      const childElements = Array.from(element.children);
      if (childElements.length > 0) return;

      const textContent = element.textContent || "";
      if (!looksLikeStandaloneMath(textContent)) return;

      element.innerHTML = `<span class="ql-formula" data-value="${textContent.trim()}"></span>`;
    });

    const formulaNodes = container.querySelectorAll(".ql-formula[data-value]");
    formulaNodes.forEach(renderKatexNode);
  }, [html]);

  return (
    <div className={`rich-content-viewer ${className}`.trim()} style={style}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .rich-content-viewer {
              width: 100%;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            .rich-content-viewer p {
              margin: 0 0 8px;
              line-height: 1.6;
            }
            .rich-content-viewer p:last-child {
              margin-bottom: 0;
            }
            .rich-content-viewer img,
            .rich-content-viewer video,
            .rich-content-viewer iframe {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 10px 0;
            }
            .rich-content-viewer audio {
              width: 100%;
              max-width: 100%;
              display: block;
              margin: 10px 0;
            }
            .rich-content-viewer ul,
            .rich-content-viewer ol {
              padding-left: 24px;
              margin: 0 0 8px;
            }
            .rich-content-viewer .ql-align-center {
              text-align: center;
            }
            .rich-content-viewer .ql-align-right {
              text-align: right;
            }
            .rich-content-viewer .ql-align-justify {
              text-align: justify;
            }
            .rich-content-viewer .katex {
              white-space: normal;
            }
          `,
        }}
      />
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

RichContentViewer.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default RichContentViewer;
