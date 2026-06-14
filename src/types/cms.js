/**
 * @typedef {Object} HeroContent
 * @property {string|null} [imageUrl] — jika ada, hero bergambar; jika tidak, gradient default
 * @property {string} [imageAlt]
 * @property {number} [overlayOpacity]
 * @property {string} [badge]
 * @property {string} title
 * @property {string} [subtitle]
 */

/**
 * @typedef {Object} AchievementItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} [imageAlt]
 */

/**
 * @typedef {Object} ExtracurricularItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} [imageAlt]
 */

/**
 * @typedef {Object} TestimonialItem
 * @property {string} id
 * @property {string} quote
 * @property {string} author
 * @property {string} role
 * @property {string} [year]
 * @property {string|null} [imageUrl]
 * @property {string} [imageAlt]
 */

/**
 * @typedef {Object} HomeSection
 * @property {string} id
 * @property {'hero'|'achievements'|'extracurricular'|'alumni_testimonials'|'spmb_cta'} type
 * @property {number} order
 * @property {boolean} isPublished
 * @property {Object} [content]
 */

/**
 * @typedef {Object} NewsPost
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} body
 * @property {string} [coverUrl]
 * @property {string} publishedAt
 */

export {};
