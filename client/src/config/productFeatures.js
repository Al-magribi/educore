const FEATURES = {
  CBT: "cbt",
  LMS: "lms",
  DB: "db",
  TAHFIZ: "tahfiz",
  FINANCE: "finance",
  ATTENDANCE: "attendance",
  RAPORT: "raport",
};

const PRODUCT_PROFILES = {
  "educore-cbt-only": [FEATURES.CBT],
  "educore-cbt-lms": [FEATURES.CBT, FEATURES.LMS],
  "educore-cbt-db": [FEATURES.CBT, FEATURES.DB],
  "educore-cbt-tahfiz": [FEATURES.CBT, FEATURES.TAHFIZ],
  "educore-cbt-finance": [FEATURES.CBT, FEATURES.FINANCE],
  "educore-cbt-db-lms-finance": [
    FEATURES.CBT,
    FEATURES.DB,
    FEATURES.LMS,
    FEATURES.FINANCE,
  ],
  "educore-cbt-db-lms-tahfiz": [
    FEATURES.CBT,
    FEATURES.DB,
    FEATURES.LMS,
    FEATURES.TAHFIZ,
  ],
  "educore-cbt-db-lms-finance-tahfiz": [
    FEATURES.CBT,
    FEATURES.DB,
    FEATURES.LMS,
    FEATURES.FINANCE,
    FEATURES.TAHFIZ,
  ],
  "educore-cbt-lms-raport-attendance": [
    FEATURES.CBT,
    FEATURES.LMS,
    FEATURES.RAPORT,
    FEATURES.ATTENDANCE,
  ],
  "educore-full": [
    FEATURES.CBT,
    FEATURES.LMS,
    FEATURES.DB,
    FEATURES.TAHFIZ,
    FEATURES.FINANCE,
    FEATURES.ATTENDANCE,
    FEATURES.RAPORT,
  ],
};

const PRODUCT_PROFILE = import.meta.env.VITE_PRODUCT_PROFILE || "educore-full";

const customFeatures = (import.meta.env.VITE_CUSTOM_FEATURES || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const profileFeatures =
  PRODUCT_PROFILE === "educore-custom"
    ? customFeatures
    : PRODUCT_PROFILES[PRODUCT_PROFILE] || PRODUCT_PROFILES["educore-full"];

const enabledFeatures = new Set(profileFeatures);

const hasFeature = (featureKey) => enabledFeatures.has(featureKey);
const isProductProfile = (...profileNames) => profileNames.includes(PRODUCT_PROFILE);

export {
  FEATURES,
  PRODUCT_PROFILE,
  PRODUCT_PROFILES,
  enabledFeatures,
  hasFeature,
  isProductProfile,
};
