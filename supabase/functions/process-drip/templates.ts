// Email templates for all drip sequences.
// Each template returns { subject, html } given a context object and brand config.
//
// Template variables come from the scheduled_emails.context JSONB column
// and from the drone_leads row (company_name, email, etc.).

export type BrandConfig = {
  navy: string;
  sky: string;
  accent: string;
  light: string;
  companyName: string;
  tagline: string;
  fromEmail: string;
  replyTo: string;
  phone: string;
  website: string;
};

export type TemplateContext = {
  recipient_name: string;
  recipient_email: string;
  lead_id: string;
  context: Record<string, unknown>;
};

type TemplateResult = {
  subject: string;
  html: string;
};

type TemplateKey = `${string}_${number}`;

// Wrap email body in branded shell
export function wrap(brand: BrandConfig, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${brand.navy};padding:30px 40px;text-align:center;">
            <h1 style="color:${brand.accent};margin:0;font-size:22px;font-weight:700;letter-spacing:1px;">${brand.companyName}</h1>
            <p style="color:#ffffff;margin:6px 0 0;font-size:12px;opacity:0.85;">${brand.tagline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280;font-size:13px;margin:0;">
              <a href="tel:${brand.phone}" style="color:${brand.sky};text-decoration:none;">${brand.phone}</a>
              &nbsp;&bull;&nbsp;
              <a href="https://${brand.website}" style="color:${brand.sky};text-decoration:none;">${brand.website}</a>
            </p>
            <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">${brand.companyName} &bull; Hampton Roads, VA</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function ctaButton(brand: BrandConfig, text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background-color:${brand.sky};border-radius:6px;padding:14px 28px;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${text}</a>
    </td></tr>
  </table>`;
}

export function p(text: string): string {
  return `<p style="color:#374151;margin:0 0 14px;line-height:1.7;font-size:15px;">${text}</p>`;
}

// ---------------------------------------------------------------------------
// OUTREACH DRIP (3 emails: Day 1, Day 4, Day 10)
// Target: roofers, GCs, military base contractors in Hampton Roads
// ---------------------------------------------------------------------------

function outreach1(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  const focus = (ctx.context.service_focus as string) || 'aerial inspection and documentation';
  return {
    subject: `Drone inspections for ${name}`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`I'm Dr. Adam Pierce, owner of ${brand.companyName}. We provide ${focus} services for contractors across Hampton Roads.`)}
      ${p(`A few things that set us apart from other drone operators in the area:`)}
      <ul style="color:#374151;line-height:1.8;font-size:15px;padding-left:20px;margin:0 0 14px;">
        <li>100% veteran owned (U.S. Army, 9 years active duty)</li>
        <li>Military airspace authorization expertise (Norfolk Naval Station, NAS Oceana, Langley AFB)</li>
        <li>AI quality assurance validates every image before delivery</li>
        <li>Enterprise equipment (DJI Matrice 4E with RTK positioning)</li>
      </ul>
      ${p(`I'd like to offer you a complimentary drone inspection on one of your active job sites. No strings attached. You see the quality firsthand and decide if it makes sense to work together.`)}
      ${p(`Interested? Call or text anytime. Our line is staffed around the clock.`)}
      ${ctaButton(brand, 'Call ' + brand.phone, 'tel:' + brand.phone)}
      ${p(`Best,<br/>Dr. Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

function outreach2(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  return {
    subject: `Quick example of what we deliver`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`Following up on my note from a few days ago. Wanted to share a quick example of what a typical roof inspection delivery looks like.`)}
      <table width="100%" cellpadding="16" style="background-color:#f8fafc;border-radius:6px;margin:0 0 20px;">
        <tr><td>
          <p style="color:${brand.navy};font-weight:600;font-size:15px;margin:0 0 8px;">Sample Inspection Report</p>
          <p style="color:#374151;font-size:14px;margin:0 0 6px;line-height:1.6;">25+ high resolution images covering every roof face and flashing detail. Each image passes through our automated quality check before you see it.</p>
          <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">GPS coordinates embedded in every photo. Date stamped for your records. Delivered within 48 hours.</p>
        </td></tr>
      </table>
      ${p(`Roofers we work with tell us this saves them 2 to 3 hours per property versus climbing up with a phone camera. And the documentation holds up better with adjusters.`)}
      ${p(`Happy to run a free demo on one of your current projects. Just reply to this email or call us.`)}
      ${ctaButton(brand, 'Call ' + brand.phone, 'tel:' + brand.phone)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

function outreach3(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  return {
    subject: `Last note from me`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`This is my last follow up. I know your inbox is busy and you have jobs to run.`)}
      ${p(`If drone inspections or aerial documentation ever make sense for your projects, we are here. We serve the entire Hampton Roads area and can usually schedule within 48 hours.`)}
      <table width="100%" cellpadding="16" style="background-color:#f8fafc;border-radius:6px;margin:0 0 20px;">
        <tr><td>
          <p style="color:${brand.navy};font-weight:600;font-size:15px;margin:0 0 8px;">Quick Reference</p>
          <p style="color:#374151;font-size:14px;margin:0 0 4px;">Roof inspections start at $225</p>
          <p style="color:#374151;font-size:14px;margin:0 0 4px;">Construction progress documentation from $450/visit</p>
          <p style="color:#374151;font-size:14px;margin:0;">Call or text anytime: ${brand.phone}</p>
        </td></tr>
      </table>
      ${p(`Wishing you a strong season ahead.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// POST-DELIVERY DRIP (4 emails: Day 1, Day 7, Day 14, Day 30)
// Target: clients who just received their deliverables
// ---------------------------------------------------------------------------

function postDelivery1(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  return {
    subject: `Your deliverables are ready`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`Your aerial deliverables have been processed and are ready for download. Every image passed our automated quality validation before being included in your package.`)}
      ${p(`If anything needs adjustment (brightness, cropping, additional angles from the raw footage), just reply to this email. We handle revisions at no extra charge within the first 7 days.`)}
      ${ctaButton(brand, 'View Your Deliverables', `https://${brand.website}/delivery`)}
      ${p(`Thank you for choosing ${brand.companyName}.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

function postDelivery2(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  return {
    subject: `How did the images work out?`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`Just checking in. You received your aerial deliverables about a week ago and I wanted to make sure everything worked as expected.`)}
      ${p(`A few questions that help us improve:`)}
      <ul style="color:#374151;line-height:1.8;font-size:15px;padding-left:20px;margin:0 0 14px;">
        <li>Did the image quality meet your needs?</li>
        <li>Was the coverage area sufficient?</li>
        <li>Any angles or details you wish we had captured?</li>
      </ul>
      ${p(`Your feedback helps us dial in exactly what works best for your projects. Reply to this email or call anytime.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

function postDelivery3(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  const reviewUrl = 'https://g.page/r/sentinel-aerial-inspections/review';
  return {
    subject: `Would you leave us a quick review?`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`If you were happy with our work, a Google review would mean a lot to us. We are a small veteran owned business and reviews are the single biggest driver of new clients finding us.`)}
      ${p(`It takes about 30 seconds. Just click below and share your honest experience.`)}
      ${ctaButton(brand, 'Leave a Google Review', reviewUrl)}
      ${p(`Thank you for your support. It genuinely makes a difference.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

function postDelivery4(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  return {
    subject: `Ready for your next project?`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`It has been about a month since your last drone inspection. If you have new projects coming up, we would love to work with you again.`)}
      ${p(`Repeat clients get priority scheduling. Most jobs can be booked within 48 hours.`)}
      <table width="100%" cellpadding="16" style="background-color:#f8fafc;border-radius:6px;margin:0 0 20px;">
        <tr><td>
          <p style="color:${brand.navy};font-weight:600;font-size:15px;margin:0 0 8px;">Retainer Option</p>
          <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">Need regular flights? Ask about our monthly retainer at $1,500/month for 5 jobs. Guaranteed availability and priority scheduling.</p>
        </td></tr>
      </table>
      ${ctaButton(brand, 'Request a Quote', `https://${brand.website}/quote`)}
      ${p(`Looking forward to it.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// VAPI FOLLOWUP (1 email: immediate after qualified call)
// Target: callers who spoke with the AI receptionist
// ---------------------------------------------------------------------------

function vapiFollowup1(ctx: TemplateContext, brand: BrandConfig): TemplateResult {
  const name = ctx.recipient_name || 'there';
  const serviceType = (ctx.context.service_type as string) || 'drone services';
  return {
    subject: `Thanks for calling ${brand.companyName}`,
    html: wrap(brand, `
      ${p(`Hi ${name},`)}
      ${p(`Thank you for calling us about ${serviceType}. We appreciate your interest and wanted to follow up with a few helpful details.`)}
      <table width="100%" cellpadding="16" style="background-color:#f8fafc;border-radius:6px;margin:0 0 20px;">
        <tr><td>
          <p style="color:${brand.navy};font-weight:600;font-size:15px;margin:0 0 8px;">What Happens Next</p>
          <p style="color:#374151;font-size:14px;margin:0 0 6px;line-height:1.6;">1. We review the details from your call</p>
          <p style="color:#374151;font-size:14px;margin:0 0 6px;line-height:1.6;">2. You receive a personalized quote within one business day</p>
          <p style="color:#374151;font-size:14px;margin:0;line-height:1.6;">3. Once approved, we schedule your flight (usually within 48 hours)</p>
        </td></tr>
      </table>
      ${p(`Want to get a head start? Fill out our quick quote form and we can have your proposal ready even sooner.`)}
      ${ctaButton(brand, 'Request a Quote', `https://${brand.website}/quote`)}
      ${p(`Questions? Reply to this email or call us back anytime at ${brand.phone}. Our line is staffed around the clock.`)}
      ${p(`Adam Pierce<br/>${brand.companyName}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

const TEMPLATES: Record<TemplateKey, (ctx: TemplateContext, brand: BrandConfig) => TemplateResult> = {
  'outreach_drip_1': outreach1,
  'outreach_drip_2': outreach2,
  'outreach_drip_3': outreach3,
  'post_delivery_1': postDelivery1,
  'post_delivery_2': postDelivery2,
  'post_delivery_3': postDelivery3,
  'post_delivery_4': postDelivery4,
  'vapi_followup_1': vapiFollowup1,
};

export function getTemplate(
  sequenceType: string,
  step: number,
  ctx: TemplateContext,
  brand: BrandConfig,
): TemplateResult | null {
  const key: TemplateKey = `${sequenceType}_${step}`;
  const fn = TEMPLATES[key];
  if (!fn) return null;
  return fn(ctx, brand);
}
