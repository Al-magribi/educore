import React, { useMemo, useEffect } from "react";
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

  const defaultTitle = config?.app_name || "LMS School System";

  // Default values
  const meta = {
    title: routeTitle || defaultTitle,
    description: config?.meta_description,
    keywords: config?.meta_keywords,
    favicon: config?.app_favicon || defaultFavicon,
    logo: config?.app_logo,

    // Open Graph
    ogTitle: routeTitle || defaultTitle,
    ogDesc: config?.meta_description,
    ogImage: config?.app_logo,
  };

  useEffect(() => {
    const currentTitle = document.title;
    if (!currentTitle || currentTitle === defaultTitle) {
      document.title = meta.title;
    }
  }, [defaultTitle, meta.title]);

  return (
    <>
      {/* React 19 otomatis memindahkan ini ke <head> */}
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords} />
      <meta name="author" content="ALMADEV" />

      {/* Dynamic Favicon */}
      <link rel="icon" type="image/png" href={meta.favicon} />
      <link rel="shortcut icon" href={meta.favicon} />
      <link rel="apple-touch-icon" href={meta.favicon} />

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDesc} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.ogTitle} />
      <meta name="twitter:description" content={meta.ogDesc} />
      <meta name="twitter:image" content={meta.ogImage} />
    </>
  );
};

export default AppMetadata;
