import Image from "next/image";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

function SchoolLogoImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  style,
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{
        width: "auto",
        height: "auto",
        maxWidth: "100%",
        maxHeight: "100%",
        ...style,
      }}
      sizes={`${width}px`}
    />
  );
}

export function resolveSchoolLogo(logoUrl) {
  const url = logoUrl?.trim() ?? "";
  return {
    logoUrl: url,
    hasLogo: isAppUploadUrl(url),
  };
}

/**
 * @param {{
 *   logoUrl?: string | null;
 *   schoolName?: string;
 *   hasLogo?: boolean;
 *   variant?: "mark" | "banner";
 *   markClassName?: string;
 *   bannerClassName?: string;
 *   priority?: boolean;
 * }} props
 */
export function SchoolBrandMark({
  logoUrl,
  schoolName = "Sekolah",
  hasLogo: hasLogoProp,
  variant = "mark",
  markClassName = "",
  bannerClassName = "",
  priority = true,
}) {
  const initial = schoolName.charAt(0).toUpperCase() || "E";
  const hasLogo = hasLogoProp ?? isAppUploadUrl(logoUrl);

  if (variant === "banner" && hasLogo && logoUrl) {
    return (
      <span className={`inline-flex h-10 max-w-[180px] shrink-0 items-center ${bannerClassName}`}>
        <SchoolLogoImage
          src={logoUrl}
          alt={schoolName}
          width={180}
          height={40}
          priority={priority}
          className="object-contain object-left"
          style={{ height: "2.5rem", width: "auto", maxWidth: "180px" }}
        />
      </span>
    );
  }

  if (hasLogo && logoUrl) {
    return (
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ${markClassName}`}
      >
        <SchoolLogoImage
          src={logoUrl}
          alt={schoolName}
          width={36}
          height={36}
          priority={priority}
          className="object-contain p-0.5"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-lg ${markClassName}`}
      style={{
        background: "var(--admin-primary, #2563eb)",
        color: "var(--admin-primary-foreground, #ffffff)",
        boxShadow: "0 8px 20px color-mix(in srgb, var(--admin-primary, #2563eb) 40%, transparent)",
      }}
    >
      {initial}
    </span>
  );
}

/**
 * @param {{
 *   logoUrl?: string | null;
 *   schoolName?: string;
 *   hasLogo?: boolean;
 *   context?: "navbar" | "footer";
 * }} props
 */
export function PublicSchoolBrand({
  logoUrl = "",
  schoolName = "Sekolah",
  hasLogo: hasLogoProp,
  context = "navbar",
}) {
  const hasLogo = hasLogoProp ?? isAppUploadUrl(logoUrl);
  const initial = schoolName.charAt(0).toUpperCase() || "E";

  if (hasLogo && logoUrl) {
    if (context === "footer") {
      return (
        <div className="rounded-xl bg-white/95 px-3 py-2">
          <SchoolLogoImage
            src={logoUrl}
            alt={schoolName}
            width={200}
            height={40}
            className="object-contain object-left"
            style={{ height: "2.5rem", width: "auto", maxWidth: "200px" }}
          />
        </div>
      );
    }

    return (
      <>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
          <SchoolLogoImage
            src={logoUrl}
            alt={schoolName}
            width={40}
            height={40}
            priority
            className="object-contain p-1"
          />
        </span>
        <span className="hidden font-bold text-slate-900 sm:block md:max-w-[220px] md:truncate lg:max-w-none">
          {schoolName}
        </span>
      </>
    );
  }

  if (context === "footer") {
    return (
      <>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">
          {initial}
        </span>
        <span className="text-lg font-bold text-white">{schoolName}</span>
      </>
    );
  }

  return (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">
        {initial}
      </span>
      <span className="hidden font-bold text-slate-900 sm:block md:max-w-[200px] md:truncate lg:max-w-none">
        {schoolName}
      </span>
    </>
  );
}
