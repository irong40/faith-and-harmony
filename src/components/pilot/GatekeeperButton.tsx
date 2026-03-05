import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GatekeeperButtonProps {
    enabled: boolean;
    loading?: boolean;
    onLogFlight: () => void;
}

export default function GatekeeperButton({
    enabled,
    loading = false,
    onLogFlight
}: GatekeeperButtonProps) {
    // Trigger haptic feedback when button becomes enabled
    // Note: This requires user gesture and may not work on all devices
    const triggerHaptic = () => {
        if ("vibrate" in navigator) {
            navigator.vibrate(50);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="lg"
                    className={`w-full h-14 text-lg font-semibold transition-all duration-300 ${enabled
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                    disabled={!enabled || loading}
                    onClick={() => enabled && triggerHaptic()}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Logging Flight...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Log Flight
                        </>
                    )}
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Log This Flight?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will record your pre-flight checklist and mark the mission as complete.
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onLogFlight}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging...
                            </>
                        ) : (
                            "Confirm & Log Flight"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
