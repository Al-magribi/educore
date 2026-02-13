import React, { useEffect, useMemo } from "react";
import { useGetPublicConfigQuery } from "../../service/center/ApiApp";
import { useLocation } from "react-router-dom";

const AppMetadata = () => {
  const { data: config } = useGetPublicConfigQuery();
  const location = useLocation();

  const routeTitle = useMemo(() => {
    if (location.pathname !== "/computer-based-test/start") return null;
    const searchParams = new URLSearchParams(location.search);
    const examNameParam = searchParams.get("exam_name");
    if (!examNameParam) return null;
    return decodeURIComponent(examNameParam).replaceAll("-", " ");
  }, [location.pathname, location.search]);

  const defaultFavicon = "/favicon.ico";
  const fallbackTitle = "Education Core";
  const fallbackDescription = "Sistem manajemen sekolah.";
  const fallbackKeywords = "lms, sekolah, cbt, tahfiz";

  const normalizedDomain = useMemo(() => {
    const rawDomain = config?.domain?.trim();
    if (rawDomain) {
      return rawDomain.replace(/\/+$/, "");
    }
    return window.location.origin;
  }, [config?.domain]);

  const toAbsoluteUrl = useMemo(
    () => (value) => {
      if (!value) return "";
      if (/^https?:\/\//i.test(value)) return value;
      return `${normalizedDomain}/${value.replace(/^\/+/, "")}`;
    },
    [normalizedDomain],
  );

  const meta = useMemo(() => {
    const appTitle = config?.meta_title || config?.app_name || fallbackTitle;
    const title = routeTitle || appTitle;
    const description = config?.meta_description || fallbackDescription;
    const keywords = config?.meta_keywords || fallbackKeywords;
    const favicon = config?.app_favicon || defaultFavicon;
    const ogTitle = routeTitle || config?.og_title || title;
    const ogDescription = config?.og_description || description;
    const ogImage = toAbsoluteUrl(
      config?.og_image || config?.app_logo || defaultFavicon,
    );
    const canonical = `${normalizedDomain}${location.pathname}${location.search}`;

    return {
      title,
      description,
      keywords,
      favicon,
      ogTitle,
      ogDescription,
      ogImage,
      canonical,
    };
  }, [
    config?.app_favicon,
    config?.app_logo,
    config?.app_name,
    config?.meta_description,
    config?.meta_keywords,
    config?.meta_title,
    config?.og_description,
    config?.og_image,
    config?.og_title,
    defaultFavicon,
    fallbackDescription,
    fallbackKeywords,
    fallbackTitle,
    location.pathname,
    location.search,
    normalizedDomain,
    routeTitle,
    toAbsoluteUrl,
  ]);

  useEffect(() => {
    const upsertMeta = (attr, key, content) => {
      let element = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content || "");
    };

    const upsertLink = (rel, href, attrs = {}) => {
      let element = document.head.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      Object.entries(attrs).forEach(([key, value]) => {
        if (value) {
          element.setAttribute(key, value);
        }
      });
      element.setAttribute("href", href || "");
    };

    document.title = meta.title;

    upsertMeta("name", "title", meta.title);
    upsertMeta("name", "description", meta.description);
    upsertMeta("name", "keywords", meta.keywords);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", meta.canonical);
    upsertMeta("property", "og:title", meta.ogTitle);
    upsertMeta("property", "og:description", meta.ogDescription);
    upsertMeta("property", "og:image", meta.ogImage);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:url", meta.canonical);
    upsertMeta("name", "twitter:title", meta.ogTitle);
    upsertMeta("name", "twitter:description", meta.ogDescription);
    upsertMeta("name", "twitter:image", meta.ogImage);

    upsertLink("icon", meta.favicon, { type: "image/png" });
    upsertLink("shortcut icon", meta.favicon);
    upsertLink("apple-touch-icon", meta.favicon);
    upsertLink("canonical", meta.canonical);
  }, [meta]);

  return null;
};

export default AppMetadata;
