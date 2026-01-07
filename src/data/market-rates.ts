// Market Rates Reference (2024-2025)

export interface RateRange {
  min: number;
  max: number;
}

export interface HourlyRate {
  role: string;
  category: 'design' | 'development' | 'content' | 'specialized';
  junior: RateRange;
  mid: RateRange;
  senior: RateRange;
}

export interface AgencyRate {
  type: string;
  rate: RateRange;
}

export interface ProjectRate {
  type: string;
  category: string;
  budget: RateRange;
  standard: RateRange;
  premium: RateRange;
  notes?: string;
}

export interface TaskEstimate {
  task: string;
  category: 'development' | 'design' | 'content';
  hoursMin: number;
  hoursMax: number;
  rateMin: number;
  rateMax: number;
}

export interface Modifier {
  name: string;
  type: 'geographic' | 'discount' | 'rush';
  multiplier: number;
  description: string;
}

// Hourly Rates by Role
export const HOURLY_RATES: HourlyRate[] = [
  // Design
  { role: 'UI Designer', category: 'design', junior: { min: 35, max: 55 }, mid: { min: 60, max: 90 }, senior: { min: 95, max: 140 } },
  { role: 'UX Designer', category: 'design', junior: { min: 40, max: 60 }, mid: { min: 70, max: 100 }, senior: { min: 110, max: 160 } },
  { role: 'Brand Designer', category: 'design', junior: { min: 45, max: 65 }, mid: { min: 75, max: 110 }, senior: { min: 120, max: 175 } },
  { role: 'Motion Designer', category: 'design', junior: { min: 50, max: 70 }, mid: { min: 80, max: 120 }, senior: { min: 130, max: 180 } },
  
  // Development
  { role: 'Frontend Developer', category: 'development', junior: { min: 50, max: 75 }, mid: { min: 85, max: 125 }, senior: { min: 125, max: 200 } },
  { role: 'Backend Developer', category: 'development', junior: { min: 55, max: 80 }, mid: { min: 90, max: 135 }, senior: { min: 135, max: 210 } },
  { role: 'Full-Stack Developer', category: 'development', junior: { min: 60, max: 90 }, mid: { min: 100, max: 150 }, senior: { min: 150, max: 225 } },
  { role: 'Mobile Developer', category: 'development', junior: { min: 60, max: 85 }, mid: { min: 95, max: 145 }, senior: { min: 145, max: 220 } },
  { role: 'DevOps Engineer', category: 'development', junior: { min: 65, max: 95 }, mid: { min: 105, max: 155 }, senior: { min: 155, max: 230 } },
  
  // Content & Marketing
  { role: 'Copywriter', category: 'content', junior: { min: 30, max: 50 }, mid: { min: 55, max: 85 }, senior: { min: 90, max: 140 } },
  { role: 'Content Strategist', category: 'content', junior: { min: 40, max: 60 }, mid: { min: 70, max: 100 }, senior: { min: 110, max: 160 } },
  { role: 'SEO Specialist', category: 'content', junior: { min: 35, max: 55 }, mid: { min: 60, max: 95 }, senior: { min: 100, max: 150 } },
  { role: 'Social Media Manager', category: 'content', junior: { min: 30, max: 50 }, mid: { min: 55, max: 80 }, senior: { min: 85, max: 130 } },
  
  // Specialized
  { role: 'AI/ML Engineer', category: 'specialized', junior: { min: 70, max: 100 }, mid: { min: 120, max: 175 }, senior: { min: 180, max: 280 } },
  { role: 'Data Scientist', category: 'specialized', junior: { min: 65, max: 95 }, mid: { min: 110, max: 160 }, senior: { min: 165, max: 250 } },
  { role: 'Security Engineer', category: 'specialized', junior: { min: 70, max: 100 }, mid: { min: 115, max: 170 }, senior: { min: 175, max: 260 } },
  { role: 'Prompt Engineer', category: 'specialized', junior: { min: 50, max: 75 }, mid: { min: 85, max: 130 }, senior: { min: 135, max: 200 } },
];

// Agency Blended Rates
export const AGENCY_RATES: AgencyRate[] = [
  { type: 'Boutique', rate: { min: 100, max: 150 } },
  { type: 'Mid-Size', rate: { min: 150, max: 200 } },
  { type: 'Large/Enterprise', rate: { min: 200, max: 350 } },
];

// Project-Based Rates
export const PROJECT_RATES: ProjectRate[] = [
  // Websites
  { type: 'Landing Page (1 page)', category: 'websites', budget: { min: 300, max: 600 }, standard: { min: 800, max: 1500 }, premium: { min: 2000, max: 4000 } },
  { type: 'Brochure Site (3-5 pages)', category: 'websites', budget: { min: 800, max: 1500 }, standard: { min: 2000, max: 4000 }, premium: { min: 5000, max: 10000 } },
  { type: 'Business Site (5-10 pages)', category: 'websites', budget: { min: 1500, max: 3000 }, standard: { min: 4000, max: 8000 }, premium: { min: 10000, max: 20000 } },
  { type: 'E-commerce (basic)', category: 'websites', budget: { min: 2500, max: 5000 }, standard: { min: 6000, max: 15000 }, premium: { min: 18000, max: 40000 } },
  { type: 'Custom Web App', category: 'websites', budget: { min: 5000, max: 15000 }, standard: { min: 20000, max: 50000 }, premium: { min: 60000, max: 150000 } },
  
  // Nonprofit Websites
  { type: 'Single Page', category: 'nonprofit', budget: { min: 500, max: 1200 }, standard: { min: 500, max: 1200 }, premium: { min: 500, max: 1200 }, notes: 'Basic info, contact' },
  { type: 'Standard (3-5 pages)', category: 'nonprofit', budget: { min: 1500, max: 3500 }, standard: { min: 1500, max: 3500 }, premium: { min: 1500, max: 3500 }, notes: 'About, programs, team, contact' },
  { type: 'With Donations', category: 'nonprofit', budget: { min: 2500, max: 6000 }, standard: { min: 2500, max: 6000 }, premium: { min: 2500, max: 6000 }, notes: 'Includes payment integration' },
  { type: 'Full Platform', category: 'nonprofit', budget: { min: 5000, max: 15000 }, standard: { min: 5000, max: 15000 }, premium: { min: 5000, max: 15000 }, notes: 'Events, member portal, CMS' },
  
  // Mobile Apps
  { type: 'Simple (1 platform)', category: 'mobile', budget: { min: 5000, max: 15000 }, standard: { min: 20000, max: 40000 }, premium: { min: 50000, max: 100000 } },
  { type: 'Medium (1 platform)', category: 'mobile', budget: { min: 15000, max: 35000 }, standard: { min: 45000, max: 80000 }, premium: { min: 100000, max: 200000 } },
  { type: 'Complex (cross-platform)', category: 'mobile', budget: { min: 40000, max: 80000 }, standard: { min: 100000, max: 200000 }, premium: { min: 250000, max: 500000 } },
  
  // Branding & Identity
  { type: 'Logo Only', category: 'branding', budget: { min: 200, max: 500 }, standard: { min: 800, max: 2500 }, premium: { min: 5000, max: 15000 } },
  { type: 'Logo + Basic Guidelines', category: 'branding', budget: { min: 500, max: 1200 }, standard: { min: 2000, max: 5000 }, premium: { min: 8000, max: 25000 } },
  { type: 'Full Brand Identity', category: 'branding', budget: { min: 2000, max: 5000 }, standard: { min: 8000, max: 20000 }, premium: { min: 30000, max: 100000 } },
  
  // Documents & Presentations
  { type: 'Pitch Deck (10-15 slides)', category: 'documents', budget: { min: 300, max: 600 }, standard: { min: 800, max: 1500 }, premium: { min: 2000, max: 5000 } },
  { type: 'Investor Deck', category: 'documents', budget: { min: 500, max: 1000 }, standard: { min: 1500, max: 3000 }, premium: { min: 4000, max: 10000 } },
  { type: 'Report/Whitepaper', category: 'documents', budget: { min: 500, max: 1200 }, standard: { min: 1500, max: 3500 }, premium: { min: 4000, max: 8000 } },
  { type: 'Proposal Template', category: 'documents', budget: { min: 200, max: 500 }, standard: { min: 600, max: 1200 }, premium: { min: 1500, max: 3000 } },
  
  // Automation & Integration
  { type: 'Simple Workflow (Zapier/n8n)', category: 'automation', budget: { min: 200, max: 500 }, standard: { min: 600, max: 1200 }, premium: { min: 1500, max: 3000 } },
  { type: 'API Integration', category: 'automation', budget: { min: 500, max: 1500 }, standard: { min: 2000, max: 5000 }, premium: { min: 6000, max: 15000 } },
  { type: 'Custom Automation Suite', category: 'automation', budget: { min: 2000, max: 5000 }, standard: { min: 8000, max: 20000 }, premium: { min: 25000, max: 60000 } },
];

// Task-Based Estimates
export const TASK_ESTIMATES: TaskEstimate[] = [
  // Web Development Tasks
  { task: 'Responsive single page', category: 'development', hoursMin: 4, hoursMax: 8, rateMin: 400, rateMax: 1000 },
  { task: 'Contact form with validation', category: 'development', hoursMin: 1, hoursMax: 2, rateMin: 100, rateMax: 250 },
  { task: 'Mobile navigation', category: 'development', hoursMin: 1, hoursMax: 3, rateMin: 100, rateMax: 375 },
  { task: 'CMS integration (basic)', category: 'development', hoursMin: 4, hoursMax: 8, rateMin: 400, rateMax: 1000 },
  { task: 'Payment integration', category: 'development', hoursMin: 4, hoursMax: 12, rateMin: 400, rateMax: 1500 },
  { task: 'Email template', category: 'development', hoursMin: 2, hoursMax: 4, rateMin: 200, rateMax: 500 },
  { task: 'Performance optimization', category: 'development', hoursMin: 3, hoursMax: 8, rateMin: 300, rateMax: 1000 },
  { task: 'Accessibility audit + fixes', category: 'development', hoursMin: 4, hoursMax: 12, rateMin: 400, rateMax: 1500 },
  
  // Design Tasks
  { task: 'Wireframes (per page)', category: 'design', hoursMin: 1, hoursMax: 2, rateMin: 75, rateMax: 200 },
  { task: 'High-fidelity mockup (per page)', category: 'design', hoursMin: 2, hoursMax: 4, rateMin: 150, rateMax: 400 },
  { task: 'Icon set (10-20 icons)', category: 'design', hoursMin: 3, hoursMax: 6, rateMin: 225, rateMax: 600 },
  { task: 'Style guide creation', category: 'design', hoursMin: 4, hoursMax: 10, rateMin: 300, rateMax: 1000 },
  { task: 'Design system', category: 'design', hoursMin: 20, hoursMax: 60, rateMin: 1500, rateMax: 6000 },
  
  // Content Tasks
  { task: 'Homepage copy', category: 'content', hoursMin: 2, hoursMax: 4, rateMin: 150, rateMax: 350 },
  { task: 'About page', category: 'content', hoursMin: 1, hoursMax: 3, rateMin: 75, rateMax: 250 },
  { task: 'Blog post (1000 words)', category: 'content', hoursMin: 2, hoursMax: 4, rateMin: 150, rateMax: 350 },
  { task: 'Email sequence (5 emails)', category: 'content', hoursMin: 4, hoursMax: 8, rateMin: 300, rateMax: 700 },
  { task: 'SEO optimization (per page)', category: 'content', hoursMin: 1, hoursMax: 2, rateMin: 75, rateMax: 175 },
];

// Geographic Adjustments
export const GEOGRAPHIC_MODIFIERS: Modifier[] = [
  { name: 'SF/NYC/Seattle', type: 'geographic', multiplier: 1.4, description: '1.3-1.5x baseline' },
  { name: 'Other US Major Cities', type: 'geographic', multiplier: 1.0, description: 'Baseline rate' },
  { name: 'US Midwest/South', type: 'geographic', multiplier: 0.85, description: '0.8-0.9x baseline' },
  { name: 'Western Europe', type: 'geographic', multiplier: 1.0, description: '0.9-1.1x baseline' },
  { name: 'Eastern Europe', type: 'geographic', multiplier: 0.5, description: '0.4-0.6x baseline' },
  { name: 'South America', type: 'geographic', multiplier: 0.5, description: '0.4-0.6x baseline' },
  { name: 'South Asia', type: 'geographic', multiplier: 0.33, description: '0.25-0.4x baseline' },
  { name: 'Southeast Asia', type: 'geographic', multiplier: 0.4, description: '0.3-0.5x baseline' },
];

// Discount Guidelines
export const DISCOUNT_MODIFIERS: Modifier[] = [
  { name: 'Nonprofit', type: 'discount', multiplier: 0.775, description: '15-30% discount' },
  { name: 'Startup (equity consideration)', type: 'discount', multiplier: 0.825, description: '10-25% discount' },
  { name: 'Long-term retainer', type: 'discount', multiplier: 0.85, description: '10-20% discount' },
  { name: 'Referral', type: 'discount', multiplier: 0.925, description: '5-10% discount' },
  { name: 'Friend/Family', type: 'discount', multiplier: 0.625, description: '25-50% discount' },
  { name: 'Pro Bono', type: 'discount', multiplier: 0, description: '100% discount' },
];

// Rush Fee Guidelines
export const RUSH_MODIFIERS: Modifier[] = [
  { name: 'Standard (2-4 weeks)', type: 'rush', multiplier: 1.0, description: 'Normal timeline' },
  { name: 'Expedited (1-2 weeks)', type: 'rush', multiplier: 1.375, description: '1.25-1.5x rate' },
  { name: 'Rush (< 1 week)', type: 'rush', multiplier: 1.75, description: '1.5-2.0x rate' },
  { name: 'Emergency (< 48 hrs)', type: 'rush', multiplier: 2.5, description: '2.0-3.0x rate' },
];

// Helper functions
export function getMidRate(range: RateRange): number {
  return Math.round((range.min + range.max) / 2);
}

export function formatRateRange(range: RateRange): string {
  return `$${range.min.toLocaleString()} - $${range.max.toLocaleString()}`;
}

export function getHourlyRatesByCategory(category: HourlyRate['category']): HourlyRate[] {
  return HOURLY_RATES.filter(rate => rate.category === category);
}

export function getProjectRatesByCategory(category: string): ProjectRate[] {
  return PROJECT_RATES.filter(rate => rate.category === category);
}

export function getTaskEstimatesByCategory(category: TaskEstimate['category']): TaskEstimate[] {
  return TASK_ESTIMATES.filter(task => task.category === category);
}

export const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design',
  development: 'Development',
  content: 'Content & Marketing',
  specialized: 'Specialized',
  websites: 'Websites',
  nonprofit: 'Nonprofit Websites',
  mobile: 'Mobile Apps',
  branding: 'Branding & Identity',
  documents: 'Documents & Presentations',
  automation: 'Automation & Integration',
};
