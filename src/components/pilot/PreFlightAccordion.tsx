import { useState, useCallback } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Plane, Shield, Cloud, CheckCircle2, Circle, Lock } from 'lucide-react';
import EquipmentSelector from './EquipmentSelector';
import AirspacePanel from './AirspacePanel';
import WeatherBriefingPanel from './WeatherBriefingPanel';
import type { PreFlightData } from '@/types/pilot';

interface PreFlightAccordionProps {
  missionId: string;
  packageId: string | null;
  packageCode: string | null;
  latitude: number | null;
  longitude: number | null;
  nearestStation: string | null;
  onPreFlightData: (data: PreFlightData) => void;
}

export default function PreFlightAccordion({
  missionId,
  packageId,
  packageCode,
  latitude,
  longitude,
  nearestStation,
  onPreFlightData,
}: PreFlightAccordionProps) {
  const [equipment, setEquipment] = useState<PreFlightData['equipment']>(null);
  const [authorization, setAuthorization] = useState<PreFlightData['authorization']>(null);
  const [weatherLog, setWeatherLog] = useState<PreFlightData['weatherLog']>(null);

  const notifyParent = useCallback(
    (eq: typeof equipment, auth: typeof authorization, wx: typeof weatherLog) => {
      onPreFlightData({ equipment: eq, weatherLog: wx, authorization: auth });
    },
    [onPreFlightData]
  );

  const handleEquipmentSelected = (data: { id: string; aircraft_model: string }) => {
    const eq = data;
    setEquipment(eq);
    notifyParent(eq, authorization, weatherLog);
  };

  const handleEquipmentCleared = () => {
    setEquipment(null);
    setWeatherLog(null); // Weather depends on equipment
    notifyParent(null, authorization, null);
  };

  const handleAuthorizationReady = (data: { id: string; airspace_class: string; requires_laanc: boolean }) => {
    const auth = data;
    setAuthorization(auth);
    notifyParent(equipment, auth, weatherLog);
  };

  const handleWeatherDetermination = (data: { id: string; determination: string; station: string }) => {
    const wx = data;
    setWeatherLog(wx);
    notifyParent(equipment, authorization, wx);
  };

  // Status indicators
  const equipmentStatus = equipment ? 'complete' : 'pending';
  const airspaceStatus = authorization ? 'complete' : 'pending';
  const weatherStatus = !equipment ? 'locked' : weatherLog ? 'complete' : 'pending';

  const StatusIcon = ({ status }: { status: 'complete' | 'pending' | 'locked' }) => {
    if (status === 'complete') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'locked') return <Lock className="h-4 w-4 text-muted-foreground" />;
    return <Circle className="h-4 w-4 text-amber-400" />;
  };

  return (
    <Accordion type="multiple" defaultValue={['equipment']} className="space-y-2">
      {/* Equipment Selection */}
      <AccordionItem value="equipment" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <StatusIcon status={equipmentStatus} />
            <Plane className="h-4 w-4" />
            <span className="font-medium">Equipment Selection</span>
            {equipment && (
              <Badge variant="secondary" className="text-xs">{equipment.aircraft_model}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <EquipmentSelector
            missionId={missionId}
            packageId={packageId}
            packageCode={packageCode}
            onEquipmentSelected={handleEquipmentSelected}
            onEquipmentCleared={handleEquipmentCleared}
          />
        </AccordionContent>
      </AccordionItem>

      {/* Airspace Authorization */}
      <AccordionItem value="airspace" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <StatusIcon status={airspaceStatus} />
            <Shield className="h-4 w-4" />
            <span className="font-medium">Airspace Authorization</span>
            {authorization && (
              <Badge variant="secondary" className="text-xs">
                Class {authorization.airspace_class}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <AirspacePanel
            missionId={missionId}
            latitude={latitude}
            longitude={longitude}
            onAuthorizationReady={handleAuthorizationReady}
          />
        </AccordionContent>
      </AccordionItem>

      {/* Weather Briefing */}
      <AccordionItem value="weather" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline" disabled={weatherStatus === 'locked'}>
          <div className="flex items-center gap-3">
            <StatusIcon status={weatherStatus} />
            <Cloud className="h-4 w-4" />
            <span className="font-medium">Weather Briefing</span>
            {weatherLog && (
              <Badge
                variant="secondary"
                className={`text-xs ${
                  weatherLog.determination === 'GO'
                    ? 'bg-green-100 text-green-700'
                    : weatherLog.determination === 'CAUTION'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {weatherLog.determination}
              </Badge>
            )}
            {weatherStatus === 'locked' && (
              <span className="text-xs text-muted-foreground">Select equipment first</span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <WeatherBriefingPanel
            missionId={missionId}
            aircraftModel={equipment?.aircraft_model || null}
            packageCode={packageCode}
            latitude={latitude}
            longitude={longitude}
            nearestStation={nearestStation}
            onDetermination={handleWeatherDetermination}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
