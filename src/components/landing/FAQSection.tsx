export type FAQItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Do you need permission to fly near military bases in Hampton Roads?",
    answer: "Yes. Every flight near Norfolk Naval Station, NAS Oceana, and Langley Air Force Base requires LAANC authorization through the FAA. Sentinel holds active LAANC authorization for controlled airspace surrounding all three installations. We submit authorization requests before every flight and keep records on file.",
  },
  {
    question: "How long does it take to get edited photos after the shoot?",
    answer: "Most residential packages deliver within 48 hours of the shoot date. The Luxury Listing package delivers within 24 hours. Rush delivery is available at an additional cost. You receive a download link by email when your files are ready.",
  },
  {
    question: "What happens if weather cancels the shoot?",
    answer: "We monitor weather forecasts 48 hours before every scheduled flight. If wind speed exceeds safe operating limits or rain is expected, we contact you to reschedule at no charge. There is no cancellation fee when weather causes the postponement.",
  },
  {
    question: "Do you serve Virginia Beach, Chesapeake, and Norfolk?",
    answer: "Yes. The full service area covers Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, and Williamsburg. We also serve Maryland and Northern North Carolina. If your property is in Hampton Roads, we can reach it.",
  },
  {
    question: "What equipment do you use?",
    answer: "Primary operations use the DJI Matrice 4E, a commercial grade aircraft with a mechanical shutter, built in RTK positioning, and 49 minutes of flight time per battery. The Mavic 3 Enterprise serves as the secondary aircraft for residential work and as a backup. The Emlid Reach RS3 provides survey grade RTK corrections for mapping and photogrammetry jobs.",
  },
  {
    question: "Are you insured?",
    answer: "Yes. Sentinel carries $1,000,000 in liability insurance coverage per occurrence. A certificate of insurance is available on request for clients or property managers who require it before allowing operations on site.",
  },
  {
    question: "How much does drone photography cost?",
    answer: "Residential photography starts at $225 for the Listing Lite package (10 edited photos, next day delivery). The Listing Pro package is $450 and includes 25 photos, a 60 second video reel, and a 2D boundary overlay. Commercial packages start at $450 per visit for construction progress monitoring and go up to $1,200 for the full Inspection Data package.",
  },
  {
    question: "Can you fly thermal for roof inspections?",
    answer: "The Matrice 4E supports thermal imaging attachments. Thermal roof inspections identify moisture intrusion, insulation gaps, and electrical hotspots that are invisible in standard photography. Contact us to discuss your specific inspection requirements and confirm equipment availability for your job date.",
  },
  {
    question: "What is LAANC authorization and why does it matter?",
    answer: "LAANC stands for Low Altitude Authorization and Notification Capability. It is the FAA system that grants real time permission to fly in controlled airspace around airports and military installations. Without it, commercial drone flights in those areas are illegal. Hampton Roads has a dense network of controlled airspace. Sentinel maintains active LAANC authorization across the entire service area.",
  },
  {
    question: "What areas of Hampton Roads do you cover?",
    answer: "Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, and Williamsburg. Coverage extends into Maryland and Northern North Carolina. We routinely operate near the military installations that many operators avoid.",
  },
];

export default function FAQSection() {
  return (
    <section className="lp-faq" aria-label="Frequently asked questions" id="faq">
      <div className="lp-container">
        <h2 className="lp-section-title">FREQUENTLY ASKED QUESTIONS</h2>
        <div className="lp-faq-list">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="lp-faq-item">
              <h3 className="lp-faq-question">{item.question}</h3>
              <p className="lp-faq-answer">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
