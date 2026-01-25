import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    UserPlus, Shield, Calendar, Edit, Trash2,
    Search, Loader2, User as UserIcon, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { PilotProfile, getCertificationStatus, CertificationStatus } from "@/types/pilot";
import AdminNav from "./components/AdminNav";

interface PilotWithRole extends PilotProfile {
    email?: string;
}

interface availableUser {
    id: string;
    email: string;
    full_name?: string;
}

const STATUS_CONFIG: Record<CertificationStatus, { label: string; color: string; bgColor: string }> = {
    valid: { label: "Active", color: "text-green-500", bgColor: "bg-green-500/10" },
    expiring_soon: { label: "Renew Soon", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    expiring_warning: { label: "Expiring", color: "text-orange-500", bgColor: "bg-orange-500/10" },
    expired: { label: "Expired", color: "text-red-500", bgColor: "bg-red-500/10" },
};

export default function PilotManagement() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [pilots, setPilots] = useState<PilotWithRole[]>([]);
    const [availableUsers, setAvailableUsers] = useState<availableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPilot, setSelectedPilot] = useState<PilotWithRole | null>(null);
    const [processing, setProcessing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        userId: "",
        fullName: "",
        part107Number: "",
        part107Expiry: "",
    });

    const fetchPilots = async () => {
        setLoading(true);

        // 1. Get all users with 'pilot' role
        const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "pilot" as any); // Cast for now until types updated

        if (roleError) {
            toast({ title: "Error fetching roles", description: roleError.message, variant: "destructive" });
            setLoading(false);
            return;
        }

        const pilotIds = roleData.map(r => r.user_id);

        if (pilotIds.length === 0) {
            setPilots([]);
            setLoading(false);
            return;
        }

        // 2. Get profile details for these pilots
        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, part_107_number, part_107_expiry")
            .in("id", pilotIds);

        if (profileError) {
            toast({ title: "Error fetching profiles", description: profileError.message, variant: "destructive" });
            setLoading(false);
            return;
        }

        // 3. Manually merge with email if possible (Wait, normal users typically can't see auth.users email)
        // We will relay on what we have. If we had a secure RPC to list users we'd use it.
        // For now, we'll just list them by name.

        setPilots(profileData as PilotWithRole[]);
        setLoading(false);
    };

    const fetchAvailableUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-list-users');

            if (error) throw error;
            if (!data || !data.users) throw new Error("No users returned");

            // Filter out existing pilots
            const pilotIds = pilots.map(p => p.id);
            const available = data.users.filter((u: any) => !pilotIds.includes(u.id));

            setAvailableUsers(available);
        } catch (error: any) {
            console.error("Error fetching users:", error);
            toast({
                title: "Error fetching users",
                description: error.message || "Failed to load users",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPilots();
    }, []);

    useEffect(() => {
        if (isAddDialogOpen) {
            fetchAvailableUsers();
        }
    }, [isAddDialogOpen, pilots]);

    const handleAddPilot = async () => {
        if (!formData.userId) {
            toast({ title: "Select a user", variant: "destructive" });
            return;
        }

        setProcessing(true);

        try {
            // 1. Add 'pilot' role
            const { error: roleError } = await supabase
                .from("user_roles")
                .insert({
                    user_id: formData.userId,
                    role: "pilot" as any
                });

            if (roleError) throw roleError;

            // 2. Update profile with Part 107 info
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    part_107_number: formData.part107Number || null,
                    part_107_expiry: formData.part107Expiry || null
                } as any)
                .eq("id", formData.userId);

            if (profileError) throw profileError;

            toast({ title: "Pilot added successfully" });
            setIsAddDialogOpen(false);
            setFormData({ userId: "", fullName: "", part107Number: "", part107Expiry: "" });
            fetchPilots();

        } catch (error: any) {
            toast({ title: "Error adding pilot", description: error.message, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const handleEditPilot = async () => {
        if (!selectedPilot) return;

        setProcessing(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.fullName || null,
                    part_107_number: formData.part107Number || null,
                    part_107_expiry: formData.part107Expiry || null
                } as any)
                .eq("id", selectedPilot.id);

            if (error) throw error;

            toast({ title: "Pilot updated successfully" });
            setIsEditDialogOpen(false);
            fetchPilots();

        } catch (error: any) {
            toast({ title: "Error updating pilot", description: error.message, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveRole = async (pilotId: string) => {
        if (!confirm("Are you sure? This user will lose access to the Pilot Portal.")) return;

        try {
            const { error } = await supabase
                .from("user_roles")
                .delete()
                .eq("user_id", pilotId)
                .eq("role", "pilot" as any);

            if (error) throw error;

            toast({ title: "Pilot role removed" });
            fetchPilots();

        } catch (error: any) {
            toast({ title: "Error removing role", description: error.message, variant: "destructive" });
        }
    };

    const openEditDialog = (pilot: PilotWithRole) => {
        setSelectedPilot(pilot);
        setFormData({
            userId: pilot.id,
            fullName: pilot.full_name || "",
            part107Number: pilot.part_107_number || "",
            part107Expiry: pilot.part_107_expiry || ""
        });
        setIsEditDialogOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminNav />
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pilot Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage drone pilots and Part 107 certifications
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Add Pilot
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Pilot</DialogTitle>
                                <DialogDescription>
                                    Select an existing user to assign the pilot role.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="user">Select User</Label>
                                    <Select
                                        onValueChange={(val) => setFormData({ ...formData, userId: val })}
                                        value={formData.userId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a user..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.full_name || "Unnamed"} ({u.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cert">Part 107 Number</Label>
                                    <Input
                                        id="cert"
                                        placeholder="e.g. 1234567"
                                        value={formData.part107Number}
                                        onChange={(e) => setFormData({ ...formData, part107Number: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry">Expiration Date</Label>
                                    <Input
                                        id="expiry"
                                        type="date"
                                        value={formData.part107Expiry}
                                        onChange={(e) => setFormData({ ...formData, part107Expiry: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddPilot} disabled={processing}>
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Add Pilot
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Pilot Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-cert">Part 107 Number</Label>
                                <Input
                                    id="edit-cert"
                                    value={formData.part107Number}
                                    onChange={(e) => setFormData({ ...formData, part107Number: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-expiry">Expiration Date</Label>
                                <Input
                                    id="edit-expiry"
                                    type="date"
                                    value={formData.part107Expiry}
                                    onChange={(e) => setFormData({ ...formData, part107Expiry: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleEditPilot} disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pilots.map((pilot) => {
                            const status = getCertificationStatus(pilot.part_107_expiry);
                            const statusConfig = STATUS_CONFIG[status];

                            return (
                                <Card key={pilot.id}>
                                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src="" />
                                                <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-base">{pilot.full_name || "Unknown Pilot"}</CardTitle>
                                                <CardDescription className="text-xs truncate max-w-[150px]">
                                                    ID: {pilot.id.substring(0, 8)}...
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(pilot)}>
                                                <Edit className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleRemoveRole(pilot.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                                <span className="text-muted-foreground flex items-center gap-2">
                                                    <Shield className="h-3.5 w-3.5" /> License
                                                </span>
                                                <span className="font-medium">{pilot.part_107_number || "N/A"}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                                <span className="text-muted-foreground flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" /> Expiry
                                                </span>
                                                <span>
                                                    {pilot.part_107_expiry
                                                        ? format(new Date(pilot.part_107_expiry), "MMM d, yyyy")
                                                        : "N/A"
                                                    }
                                                </span>
                                            </div>
                                            <div className="pt-2 flex justify-end">
                                                <Badge
                                                    variant="secondary"
                                                    className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                                                >
                                                    {status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                                    {statusConfig.label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {pilots.length === 0 && (
                            <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                                <p className="text-muted-foreground">No pilots found</p>
                                <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                                    Add your first pilot
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
