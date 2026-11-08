export type FAQItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Do you need permission to fly near military bases in Hampton Roads?",
    answer: "Yes. Commercial drone flights near Norfolk Naval Station, NAS Oceana, and Langley Air Force Base require LAANC clearance through the FAA. Every Sentinel flight is flown by an FAA Part 107 certified remote pilot, who requests airspace clearance for each flight through the LAANC system. Approval is typically near-instant for pre-approved grid altitudes. For operations outside standard grids, we submit further coordination requests in advance.",
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
    answer: "Yes. The full service area covers Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, and Williamsburg. We also serve Northern North Carolina. If your property is in Hampton Roads, we can reach it.",
  },
  {
    question: "What equipment do you use?",
    answer: "Primary operations use the DJI Matrice 4E.",
  },
  {
    question: "Are you insured?",
    answer: "Yes. Sentinel carries $1,000,000 in liability insurance coverage per occurrence. A certificate of insurance is available on request for clients or property managers who require it before allowing operations on site.",
  },
  {
    question: "How much does drone photography cost?",
    answer: "Residential photography starts at $450 for the Listing Pro package, which includes 25 photos, a 60 second video reel, and a 2D boundary overlay. Commercial packages start at $450 per visit for construction progress monitoring. Roof and Facility Inspection is starting at $1,200.",
  },
  {
    question: "What is LAANC authorization and why does it matter?",
    answer: "LAANC stands for Low Altitude Authorization and Notification Capability. It is the FAA system that grants real time permission to fly in controlled airspace around airports and military installations. Without it, commercial drone flights in those areas are illegal. Hampton Roads has a dense network of controlled airspace. Sentinel requests FAA airspace authorization through LAANC for each flight in controlled airspace.",
  },
  {
    question: "What areas of Hampton Roads do you cover?",
    answer: "Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, and Williamsburg. Coverage extends into Northern North Carolina.",
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
