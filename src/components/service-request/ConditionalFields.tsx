import { ServiceCode } from "@/data/services";
import { AIVideoFields } from "./fields/AIVideoFields";
import { MasonicFields } from "./fields/MasonicFields";
import { BlackHistoryFields } from "./fields/BlackHistoryFields";
import { CybersecurityFields } from "./fields/CybersecurityFields";
import { VendorAssistantFields } from "./fields/VendorAssistantFields";
import { ChurchTechFields } from "./fields/ChurchTechFields";
import { AerialFields } from "./fields/AerialFields";
import { WebsiteFields } from "./fields/WebsiteFields";

export type MetadataValue = string | number | boolean | string[];

interface ConditionalFieldsProps {
  serviceCode: ServiceCode | null;
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

export function ConditionalFields({ serviceCode, metadata, onMetadataChange }: ConditionalFieldsProps) {
  if (!serviceCode) return null;

  const fieldProps = { metadata, onMetadataChange };

  switch (serviceCode) {
    case 'AI_VIDEO':
      return <AIVideoFields {...fieldProps} />;
    case 'MASONIC':
      return <MasonicFields {...fieldProps} />;
    case 'BLACK_HISTORY':
      return <BlackHistoryFields {...fieldProps} />;
    case 'CYBERSECURITY':
      return <CybersecurityFields {...fieldProps} />;
    case 'VENDOR_ASSISTANT':
      return <VendorAssistantFields {...fieldProps} />;
    case 'CHURCH_TECH':
      return <ChurchTechFields {...fieldProps} />;
    case 'AERIAL':
      return <AerialFields {...fieldProps} />;
    case 'WEBSITE':
      return <WebsiteFields {...fieldProps} />;
    default:
      return null;
  }
}
