/** @typedef {import('@/types/cms.js').HomeSection} HomeSection */

// TODO: home-sections, news, about, contact services

export { getPublicHomeData, getAdminHomeSections } from "../home/index.js";
export {
  getPublishedNewsPosts,
  listAdminNewsPosts,
} from "../news/index.js";
export { getPublicAboutData, getAboutPageForAdmin, updateAboutPage } from "../about/index.js";
