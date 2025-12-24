/**
 * Faith & Harmony LLC - Brand Constants
 * 
 * Centralized branding for consistent use across the application,
 * PDFs, emails, and all customer-facing documents.
 */

export const BRAND = {
  // Company Information
  name: "Faith & Harmony LLC",
  tagline: "Rooted in Purpose. Driven by Service.",
  email: "info@faithandharmonyllc.com",
  emailPayment: "faithandharmonyllc@gmail.com",
  phone: "(757) 555-0199", // Update with actual phone
  website: "faithandharmony.com",
  location: "Hampton Roads, Virginia",

  // Payment Options
  payments: {
    paypal: "faithandharmonyllc@gmail.com",
    cashApp: "$FaithandHarmony",
  },

  // Brand Colors - Hex format for edge functions/emails/PDFs
  colors: {
    purple: "#2b0a3d",      // Primary dark purple
    purpleLight: "#753679", // Lighter purple accent
    gold: "#dfae62",        // Primary gold accent
    cream: "#eae3d9",       // Background cream
    slate: "#5b657a",       // Muted slate
    white: "#ffffff",
    black: "#1a1a1a",
  },

  // HSL values for CSS (matches index.css)
  hsl: {
    purple: "280 73% 14%",
    purpleLight: "298 37% 34%",
    gold: "38 64% 63%",
    cream: "33 28% 89%",
    slate: "220 15% 42%",
  },

  // Social Links
  social: {
    facebook: "https://facebook.com/faithandharmonyllc",
    instagram: "https://instagram.com/faithandharmonyllc",
    linkedin: "https://linkedin.com/company/faithandharmonyllc",
  },

  // Copyright
  copyright: `© ${new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.`,
} as const;

// Edge function / Email specific brand object (mirrors send-order-invoice-email format)
export const EMAIL_BRAND = {
  purple: BRAND.colors.purple,
  gold: BRAND.colors.gold,
  cream: BRAND.colors.cream,
  companyName: BRAND.name,
  tagline: BRAND.tagline,
  email: BRAND.email,
  phone: BRAND.phone,
  website: BRAND.website,
} as const;

export default BRAND;
