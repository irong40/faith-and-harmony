import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SOP_CHECKLIST_ITEMS } from "@/types/pilot";
import type { ChecklistData, ChecklistItem, PreFlightData } from "@/types/pilot";
import { Shield, Cloud, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface SOPChecklistProps {
    missionId: string;
    onComplete: (data: ChecklistData) => void;
    onIncomplete: () => void;
    disabled?: boolean;
    preFlightData?: PreFlightData;
}

export default function SOPChecklist({
    missionId,
    onComplete,
    onIncomplete,
    disabled = false,
    preFlightData,
}: SOPChecklistProps) {
    const [items, setItems] = useState<Record<string, ChecklistItem>>({});
    const storageKey = `trestle_checklist_${missionId}`;

    // Initialize checklist state from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setItems(parsed.items || {});
            } catch {
                initializeItems();
            }
        } else {
            initializeItems();
        }
    }, [missionId]);

    const initializeItems = () => {
        const initial: Record<string, ChecklistItem> = {};
        SOP_CHECKLIST_ITEMS.forEach(item => {
            initial[item.key] = {
                key: item.key,
                label: item.label,
                checked: false,
                checked_at: null,
            };
        });
        setItems(initial);
    };

    // Check completion status whenever items change
    useEffect(() => {
        const allChecked = SOP_CHECKLIST_ITEMS.every(item => items[item.key]?.checked);

        if (allChecked && Object.keys(items).length > 0) {
            const checklistData: ChecklistData = {
                version: "2.0",
                completed_at: new Date().toISOString(),
                items,
                equipment_id: preFlightData?.equipment?.id || null,
                weather_log_id: preFlightData?.weatherLog?.id || null,
                authorization_id: preFlightData?.authorization?.id || null,
            };
            onComplete(checklistData);
        } else {
            onIncomplete();
        }
    }, [items, preFlightData]);

    // Item-level enable/disable logic
    const isItemDisabled = (key: string): boolean => {
        if (disabled) return true;

        // LAANC: only checkable after airspace authorization exists
        if (key === 'laanc_authorization' && !preFlightData?.authorization) return true;

        // Weather: disabled on NO_GO without override (unless already saved with override)
        if (key === 'weather_conditions') {
            if (!preFlightData?.weatherLog) return true;
            // NO_GO blocks the checkbox — but the weather panel handles overrides
            // If a weatherLog exists, it's either GO/CAUTION or an overridden NO_GO
        }

        return false;
    };

    const handleToggle = (key: string) => {
        if (isItemDisabled(key)) return;

        const newItems = { ...items };
        const item = newItems[key];

        if (item.checked) {
            newItems[key] = { ...item, checked: false, checked_at: null, data_source: null };
        } else {
            // Determine data source
            let dataSource: ChecklistItem['data_source'] = 'manual';
            if (key === 'laanc_authorization' && preFlightData?.authorization) dataSource = 'system';
            if (key === 'weather_conditions' && preFlightData?.weatherLog) dataSource = 'system';

            newItems[key] = { ...item, checked: true, checked_at: new Date().toISOString(), data_source: dataSource };
        }

        setItems(newItems);

        // Persist to localStorage
        const checklistData: ChecklistData = {
            version: "2.0",
            completed_at: null,
            items: newItems,
        };
        localStorage.setItem(storageKey, JSON.stringify(checklistData));
    };

    // Inline enrichment data for items 1 and 5
    const renderInlineData = (key: string) => {
        if (key === 'laanc_authorization' && preFlightData?.authorization) {
            const auth = preFlightData.authorization;
            return (
                <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">
                        Class {auth.airspace_class}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {auth.requires_laanc ? 'LAANC Required' : 'No LAANC Required'}
                    </span>
                </div>
            );
        }

        if (key === 'weather_conditions' && preFlightData?.weatherLog) {
            const wx = preFlightData.weatherLog;
            const det = wx.determination;
            return (
                <div className="flex items-center gap-2 mt-1">
                    <Cloud className="h-3 w-3 text-muted-foreground" />
                    <Badge
                        className={`text-xs ${
                            det === 'GO' ? 'bg-green-600 text-white' :
                            det === 'CAUTION' ? 'bg-amber-500 text-white' :
                            'bg-red-600 text-white'
                        }`}
                    >
                        {det === 'GO' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {det === 'CAUTION' && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {det === 'NO_GO' && <XCircle className="mr-1 h-3 w-3" />}
                        {det}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {wx.station}
                    </span>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-3">
            {SOP_CHECKLIST_ITEMS.map((item, index) => {
                const checkItem = items[item.key];
                const isChecked = checkItem?.checked || false;
                const itemDisabled = isItemDisabled(item.key);

                return (
                    <div
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isChecked
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-card border-border"
                            } ${itemDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => handleToggle(item.key)}
                    >
                        <Checkbox
                            id={item.key}
                            checked={isChecked}
                            disabled={itemDisabled}
                            className={`mt-0.5 ${isChecked ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : ""}`}
                        />
                        <div className="flex-1">
                            <Label
                                htmlFor={item.key}
                                className={`cursor-pointer ${isChecked ? "text-green-600" : "text-foreground"}`}
                            >
                                <span className="font-medium">{index + 1}.</span> {item.label}
                            </Label>
                            {renderInlineData(item.key)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
