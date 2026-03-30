/**
 * Brand Constants for both entities
 *
 * SAI (Sentinel Aerial Inspections) = drone services brand
 * F&H (Faith & Harmony LLC) = parent company / general services
 *
 * Use SAI_BRAND for all drone, aerial, inspection, and proposal work.
 * Use FH_BRAND for parent company pages and general business.
 */

export const SAI_BRAND = {
  name: "Sentinel Aerial Inspections",
  dba: "Sentinel Aerial Inspections",
  tagline: "Professional Drone Services",
  email: "info@sentinelaerialinspections.com",
  emailPayment: "faithandharmonyllc@gmail.com",
  phone: "(757) 609-3268",
  website: "sentinelaerialinspections.com",
  location: "Hampton Roads, Virginia",
  app: "Trestle",

  payments: {
    paypal: "faithandharmonyllc@gmail.com",
    cashApp: "$FaithandHarmony",
  },

  colors: {
    primary: "#e85d26",       // Orange 500
    primaryDark: "#c44a1a",   // Orange 600
    primaryLight: "#f07040",  // Orange 400
    accent: "#f4976c",        // Orange 300
    bg: "#0a0a0a",            // Dark 950
    bgCard: "#0f0f0f",        // Dark 900
    bgElevated: "#1a1a1a",    // Dark 800
    border: "#252525",        // Dark 700
    muted: "#333333",         // Dark 600
    textMuted: "#666666",     // Dark 400
    textSecondary: "#999999", // Dark 300
    cream: "#f0ebe4",         // Cream 100
    creamDim: "#d9d0c4",      // Cream 200
    white: "#ffffff",
    black: "#0a0a0a",
  },

  copyright: `\u00a9 ${new Date().getFullYear()} Sentinel Aerial Inspections. All rights reserved.`,
} as const;

export const FH_BRAND = {
  name: "Faith & Harmony LLC",
  tagline: "Veteran-Owned Professional Services",
  email: "info@faithandharmonyllc.com",
  emailPayment: "faithandharmonyllc@gmail.com",
  phone: "(757) 843-8772",
  website: "faithandharmonyllc.com",
  location: "Hampton Roads, Virginia",

  payments: {
    paypal: "faithandharmonyllc@gmail.com",
    cashApp: "$FaithandHarmony",
  },

  colors: {
    primary: "#dfae62",       // Gold
    primaryDark: "#2b0a3d",   // Purple
    primaryLight: "#e8c88a",  // Gold light
    accent: "#753679",        // Purple light
    bg: "#110820",            // Dark purple bg
    bgCard: "#1a0628",        // Purple dark
    bgElevated: "#3d1555",    // Purple light
    border: "#3a2050",        // Purple border
    muted: "#64607a",         // Slate
    textMuted: "#b5a99a",     // Cream dim
    textSecondary: "#64607a", // Slate
    cream: "#e8ddd0",         // Cream
    creamDim: "#b5a99a",      // Cream dim
    white: "#ffffff",
    black: "#1a1a1a",
  },

  hsl: {
    purple: "280 73% 14%",
    purpleLight: "298 37% 34%",
    gold: "38 64% 63%",
    cream: "33 28% 89%",
    slate: "220 15% 42%",
  },

  copyright: `\u00a9 ${new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.`,
} as const;

// Default BRAND points to SAI (most customer-facing documents are SAI)
export const BRAND = SAI_BRAND;

// Edge function / Email brand object (SAI by default)
export const EMAIL_BRAND = {
  primary: SAI_BRAND.colors.primary,
  primaryDark: SAI_BRAND.colors.primaryDark,
  bg: SAI_BRAND.colors.bg,
  cream: SAI_BRAND.colors.cream,
  companyName: SAI_BRAND.name,
  tagline: SAI_BRAND.tagline,
  email: SAI_BRAND.email,
  phone: SAI_BRAND.phone,
  website: SAI_BRAND.website,
} as const;

export default BRAND;
