import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SOP_CHECKLIST_ITEMS, ChecklistData, ChecklistItem } from "@/types/pilot";

interface SOPChecklistProps {
    missionId: string;
    onComplete: (data: ChecklistData) => void;
    onIncomplete: () => void;
    disabled?: boolean;
}

export default function SOPChecklist({
    missionId,
    onComplete,
    onIncomplete,
    disabled = false
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
                version: "1.0",
                completed_at: new Date().toISOString(),
                items,
            };
            onComplete(checklistData);
        } else {
            onIncomplete();
        }
    }, [items]);

    const handleToggle = (key: string) => {
        if (disabled) return;

        const newItems = { ...items };
        const item = newItems[key];

        if (item.checked) {
            // Unchecking
            newItems[key] = { ...item, checked: false, checked_at: null };
        } else {
            // Checking
            newItems[key] = { ...item, checked: true, checked_at: new Date().toISOString() };
        }

        setItems(newItems);

        // Persist to localStorage
        const checklistData: ChecklistData = {
            version: "1.0",
            completed_at: null,
            items: newItems,
        };
        localStorage.setItem(storageKey, JSON.stringify(checklistData));
    };

    return (
        <div className="space-y-3">
            {SOP_CHECKLIST_ITEMS.map((item, index) => {
                const checkItem = items[item.key];
                const isChecked = checkItem?.checked || false;

                return (
                    <div
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isChecked
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-card border-border"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => handleToggle(item.key)}
                    >
                        <Checkbox
                            id={item.key}
                            checked={isChecked}
                            disabled={disabled}
                            className={`mt-0.5 ${isChecked ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : ""}`}
                        />
                        <div className="flex-1">
                            <Label
                                htmlFor={item.key}
                                className={`cursor-pointer ${isChecked ? "text-green-600" : "text-foreground"}`}
                            >
                                <span className="font-medium">{index + 1}.</span> {item.label}
                            </Label>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
