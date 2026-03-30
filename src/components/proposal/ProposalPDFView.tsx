import { forwardRef } from "react";
import { SAI_BRAND } from "@/lib/brand";

interface Deliverable {
  name: string;
  description: string;
}

interface PricingItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

interface ProposalPDFViewProps {
  proposal: {
    title: string;
    proposalNumber?: string;
    clientName: string;
    clientEmail?: string;
    companyName?: string;
    scopeOfWork: string;
    deliverables: Deliverable[];
    pricingItems: PricingItem[];
    subtotal: number;
    discount: number;
    total: number;
    validUntil: string;
    terms: string;
    clientType?: 'standard' | 'nonprofit';
    marketRateSubtotal?: number;
  };
}

export const ProposalPDFView = forwardRef<HTMLDivElement, ProposalPDFViewProps>(
  ({ proposal }, ref) => {
    const discountPercent = proposal.clientType === 'nonprofit' ? 20 : 10;

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-screen font-sans">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: `2px solid ${SAI_BRAND.colors.primary}` }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SAI_BRAND.colors.bg }}>{SAI_BRAND.name}</h1>
            <p className="text-sm mt-1" style={{ color: SAI_BRAND.colors.primary }}>{SAI_BRAND.tagline}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">
              {proposal.proposalNumber || 'DRAFT'}
            </p>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold text-gray-700 mb-2">Prepared For:</p>
          <p className="font-bold text-lg">{proposal.clientName}</p>
          {proposal.companyName && (
            <p className="text-gray-600">{proposal.companyName}</p>
          )}
          {proposal.clientEmail && (
            <p className="text-gray-500 text-sm">{proposal.clientEmail}</p>
          )}
          {proposal.clientType === 'nonprofit' && (
            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Nonprofit Discount Applied (20% off)
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold mb-4 text-gray-900">{proposal.title}</h2>

        {/* Scope of Work */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3 text-gray-800">
            Scope of Work
          </h3>
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {proposal.scopeOfWork}
          </p>
        </section>

        {/* Deliverables */}
        {proposal.deliverables.filter(d => d.name).length > 0 && (
          <section className="mb-6">
            <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3 text-gray-800">
              Deliverables
            </h3>
            <ul className="space-y-2">
              {proposal.deliverables
                .filter(d => d.name)
                .map((d, i) => (
                  <li key={i} className="flex">
                    <span className="text-green-600 mr-2">✓</span>
                    <div>
                      <span className="font-medium">{d.name}</span>
                      {d.description && (
                        <span className="text-gray-600"> — {d.description}</span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Pricing Table */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3 text-gray-800">
            Investment
          </h3>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 font-semibold text-gray-700">Description</th>
                <th className="text-right p-3 font-semibold text-gray-700 w-20">Qty</th>
                <th className="text-center p-3 font-semibold text-gray-700 w-20">Unit</th>
                <th className="text-right p-3 font-semibold text-gray-700 w-24">Rate</th>
                <th className="text-right p-3 font-semibold text-gray-700 w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {proposal.pricingItems
                .filter(item => item.description)
                .map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-3 text-gray-700">{item.description}</td>
                    <td className="text-right p-3 text-gray-600">{item.quantity}</td>
                    <td className="text-center p-3 text-gray-600">{item.unit}</td>
                    <td className="text-right p-3 text-gray-600">
                      ${item.rate.toLocaleString()}
                    </td>
                    <td className="text-right p-3 font-medium">
                      ${(item.quantity * item.rate).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              {proposal.marketRateSubtotal && proposal.marketRateSubtotal > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Market Rate:</span>
                  <span className="line-through">
                    ${proposal.marketRateSubtotal.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>${proposal.subtotal.toLocaleString()}</span>
              </div>
              {proposal.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${proposal.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${proposal.total.toLocaleString()}</span>
              </div>
              {proposal.marketRateSubtotal && proposal.marketRateSubtotal > 0 && (
                <p className="text-xs text-green-600 text-right">
                  {discountPercent}% below market rate
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Valid Until */}
        <p className="text-sm text-gray-600 mb-6 italic">
          This proposal is valid until{' '}
          {new Date(proposal.validUntil).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        {/* Terms */}
        {proposal.terms && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3 text-gray-800">
              Terms & Conditions
            </h3>
            <pre className="text-sm whitespace-pre-wrap font-sans text-gray-600 leading-relaxed">
              {proposal.terms}
            </pre>
          </section>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 text-center text-sm text-gray-500" style={{ borderTop: `2px solid ${SAI_BRAND.colors.primary}` }}>
          <p className="font-medium" style={{ color: SAI_BRAND.colors.bg }}>{SAI_BRAND.name}</p>
          <p>{SAI_BRAND.website}</p>
          <p className="mt-2 italic">Thank you for considering us for your project.</p>
        </div>
      </div>
    );
  }
);

ProposalPDFView.displayName = "ProposalPDFView";
