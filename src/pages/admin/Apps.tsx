import { useState } from "react";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Key, KeyRound, Trash2, ExternalLink, Copy, RefreshCw, Server } from "lucide-react";
import { 
  useMissionControlApps, 
  useCreateApp, 
  useUpdateApp, 
  useDeleteApp,
  useGenerateApiKey,
  useRevokeApiKey,
  type AppFormData,
  type AppStatusOverview
} from "@/hooks/useMissionControlAdmin";

export default function Apps() {
  const { data: apps, isLoading, refetch } = useMissionControlApps();
  const createApp = useCreateApp();
  const updateApp = useUpdateApp();
  const deleteApp = useDeleteApp();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppStatusOverview | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKeyFor, setShowApiKeyFor] = useState<string | null>(null);

  const [formData, setFormData] = useState<AppFormData>({
    name: "",
    code: "",
    url: "",
    owner_email: "",
    owner_name: "",
    heartbeat_interval_seconds: 300,
    alert_on_failure: true,
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      url: "",
      owner_email: "",
      owner_name: "",
      heartbeat_interval_seconds: 300,
      alert_on_failure: true,
      active: true,
    });
  };

  const handleCreateApp = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Name and code are required");
      return;
    }

    try {
      await createApp.mutateAsync(formData);
      toast.success("App registered successfully");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to register app");
    }
  };

  const handleGenerateKey = async (app: AppStatusOverview) => {
    try {
      const key = await generateApiKey.mutateAsync({ appId: app.id, appName: app.name });
      setNewApiKey(key);
      setShowApiKeyFor(app.id);
      toast.success("API key generated - copy it now!");
    } catch (error) {
      toast.error("Failed to generate API key");
    }
  };

  const handleRevokeKey = async (app: AppStatusOverview) => {
    try {
      await revokeApiKey.mutateAsync({ appId: app.id, appName: app.name });
      toast.success("API key revoked");
    } catch (error) {
      toast.error("Failed to revoke API key");
    }
  };

  const handleDeleteApp = async (app: AppStatusOverview) => {
    try {
      await deleteApp.mutateAsync({ id: app.id, name: app.name });
      toast.success("App deleted");
    } catch (error) {
      toast.error("Failed to delete app");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (app: AppStatusOverview) => {
    const statusColors = {
      recent: "bg-green-500",
      stale: "bg-yellow-500",
      offline: "bg-red-500",
      never: "bg-muted",
    };

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[app.heartbeat_status]}`} />
        <span className="capitalize text-sm text-muted-foreground">{app.heartbeat_status}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Apps</h1>
            <p className="text-muted-foreground">Manage satellite apps connected to Mission Control</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register App
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New App</DialogTitle>
                  <DialogDescription>
                    Add a satellite app to Mission Control. You'll get an API key after registration.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">App Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="My Awesome App"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="my-awesome-app"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">App URL</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://my-app.lovable.app"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner_name">Owner Name</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner_email">Owner Email</Label>
                      <Input
                        id="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateApp} disabled={createApp.isPending}>
                    {createApp.isPending ? "Registering..." : "Register App"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* API Key Display Modal */}
        <Dialog open={!!newApiKey} onOpenChange={() => { setNewApiKey(null); setShowApiKeyFor(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Key className="h-5 w-5" />
                API Key Generated
              </DialogTitle>
              <DialogDescription>
                Copy this key now! It will only be shown once and cannot be retrieved later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                <code className="flex-1">{newApiKey}</code>
                <Button size="icon" variant="ghost" onClick={() => newApiKey && copyToClipboard(newApiKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Add this to your app's environment: <code className="bg-muted px-1">VITE_MISSION_CONTROL_API_KEY</code>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => { setNewApiKey(null); setShowApiKeyFor(null); }}>
                I've Copied the Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apps Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Registered Apps
            </CardTitle>
            <CardDescription>
              {apps?.length || 0} apps connected to Mission Control
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : apps?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No apps registered yet</p>
                <p className="text-sm">Click "Register App" to add your first satellite app</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Last Heartbeat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apps?.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{app.name}</div>
                          <div className="text-sm text-muted-foreground">{app.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app)}</TableCell>
                      <TableCell>
                        {app.has_api_key ? (
                          <Badge variant="secondary" className="font-mono">
                            {app.api_key_created_at ? `mc_****` : "Active"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Key</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {app.open_ticket_count > 0 ? (
                          <Badge variant="destructive">{app.open_ticket_count} open</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {app.last_heartbeat_at ? (
                          <span className="text-sm">
                            {new Date(app.last_heartbeat_at).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.url && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(app.url!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {app.has_api_key ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will immediately invalidate the current API key for "{app.name}". 
                                    The app will no longer be able to communicate with Mission Control until a new key is generated.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleRevokeKey(app)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Revoke Key
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleGenerateKey(app)}
                              disabled={generateApiKey.isPending}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete App?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{app.name}" and all its health history. 
                                  Tickets will be preserved but unlinked.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteApp(app)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}