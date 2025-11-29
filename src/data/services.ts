export const SERVICE_CODES = {
  AI_VIDEO: 'AI_VIDEO',
  MASONIC: 'MASONIC',
  BLACK_HISTORY: 'BLACK_HISTORY',
  CYBERSECURITY: 'CYBERSECURITY',
  VENDOR_ASSISTANT: 'VENDOR_ASSISTANT',
  CHURCH_TECH: 'CHURCH_TECH',
  AERIAL: 'AERIAL',
  WEBSITE: 'WEBSITE',
} as const;

export type ServiceCode = typeof SERVICE_CODES[keyof typeof SERVICE_CODES];

export interface ServiceOption {
  code: ServiceCode;
  name: string;
  category: string;
  startingPrice: number;
  pricingUnit: string;
  route: string;
}

export const SERVICES: ServiceOption[] = [
  {
    code: 'AI_VIDEO',
    name: 'AI Video Creation & Content Automation',
    category: 'Digital Media',
    startingPrice: 350,
    pricingUnit: 'per video',
    route: '/services/ai-video-creation',
  },
  {
    code: 'MASONIC',
    name: 'Masonic & OES Digital Projects',
    category: 'Fraternal Organizations',
    startingPrice: 250,
    pricingUnit: 'per project',
    route: '/services/masonic-digital-projects',
  },
  {
    code: 'BLACK_HISTORY',
    name: 'Black History Storytelling Packages',
    category: 'Storytelling',
    startingPrice: 300,
    pricingUnit: 'per project',
    route: '/services/black-history-storytelling',
  },
  {
    code: 'CYBERSECURITY',
    name: 'Cybersecurity Services',
    category: 'Technology',
    startingPrice: 500,
    pricingUnit: 'per project',
    route: '/services/cybersecurity-ai',
  },
  {
    code: 'VENDOR_ASSISTANT',
    name: 'Vendor Assistant Systems for Events',
    category: 'Event Services',
    startingPrice: 450,
    pricingUnit: 'per event',
    route: '/services/vendor-assistant',
  },
  {
    code: 'CHURCH_TECH',
    name: 'Church Tech & Gospel Saxophone Programs',
    category: 'Church Services',
    startingPrice: 199,
    pricingUnit: 'starting at',
    route: '/services/church-tech',
  },
  {
    code: 'AERIAL',
    name: 'Aerial Photography & Inspections',
    category: 'Photography',
    startingPrice: 250,
    pricingUnit: 'per project',
    route: '/services/aerial-photography',
  },
  {
    code: 'WEBSITE',
    name: 'Website Hosting & Development',
    category: 'Web Services',
    startingPrice: 750,
    pricingUnit: 'per project',
    route: '/services/website-hosting',
  },
];

export const BUDGET_RANGES = [
  'Under $500',
  '$500 – $1,500',
  '$1,500 – $3,000',
  'Over $3,000',
];

export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text Message' },
];

export const HOW_HEARD_OPTIONS = [
  'Google Search',
  'Social Media',
  'Referral from a Friend',
  'Church or Community Event',
  'LinkedIn',
  'YouTube',
  'Other',
];

export function getServiceByCode(code: string): ServiceOption | undefined {
  return SERVICES.find(s => s.code === code);
}
