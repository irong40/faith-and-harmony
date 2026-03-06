import { useState } from "react";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Megaphone, Trash2, Edit, RefreshCw } from "lucide-react";
import { 
  useAllAnnouncements, 
  useCreateAnnouncement, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement,
  useMissionControlApps,
  type AnnouncementFormData,
  type Announcement
} from "@/hooks/useMissionControlAdmin";

const TYPE_OPTIONS = [
  { value: "info", label: "ℹ️ Info", color: "bg-blue-100 text-blue-800" },
  { value: "warning", label: "⚠️ Warning", color: "bg-yellow-100 text-yellow-800" },
  { value: "maintenance", label: "🔧 Maintenance", color: "bg-orange-100 text-orange-800" },
  { value: "outage", label: "🚨 Outage", color: "bg-red-100 text-red-800" },
  { value: "resolved", label: "✅ Resolved", color: "bg-green-100 text-green-800" },
];

export default function Announcements() {
  const { data: announcements, isLoading, refetch } = useAllAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const { data: apps } = useMissionControlApps();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const defaultFormData: AnnouncementFormData = {
    title: "",
    message: "",
    type: "info",
    target_all_apps: true,
    target_app_ids: [],
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: null,
    is_active: true,
    priority: 0,
  };

  const [formData, setFormData] = useState<AnnouncementFormData>(defaultFormData);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingAnnouncement(null);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Title and message are required");
      return;
    }

    try {
      await createAnnouncement.mutateAsync(formData);
      toast.success("Announcement created");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create announcement");
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;
    
    try {
      await updateAnnouncement.mutateAsync({
        id: editingAnnouncement.id,
        data: formData,
      });
      toast.success("Announcement updated");
      setEditingAnnouncement(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update announcement");
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    try {
      await deleteAnnouncement.mutateAsync({ id: announcement.id, title: announcement.title });
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const openEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      target_all_apps: announcement.target_all_apps,
      target_app_ids: announcement.target_app_ids || [],
      starts_at: announcement.starts_at.slice(0, 16),
      ends_at: announcement.ends_at?.slice(0, 16) || null,
      is_active: announcement.is_active,
      priority: announcement.priority,
    });
    setEditingAnnouncement(announcement);
  };

  const toggleAppId = (appId: string) => {
    const current = formData.target_app_ids || [];
    const updated = current.includes(appId)
      ? current.filter((id) => id !== appId)
      : [...current, appId];
    setFormData({ ...formData, target_app_ids: updated });
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0];
    return <Badge className={typeConfig.color}>{typeConfig.label}</Badge>;
  };

  const getStatusBadge = (announcement: Announcement) => {
    const now = new Date();
    const starts = new Date(announcement.starts_at);
    const ends = announcement.ends_at ? new Date(announcement.ends_at) : null;

    if (!announcement.is_active) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (ends && ends < now) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (starts > now) {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const AnnouncementForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Scheduled Maintenance"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="We'll be performing scheduled maintenance..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as AnnouncementFormData["type"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            min={0}
            max={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Starts At</Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={formData.starts_at?.slice(0, 16) || ""}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ends_at">Ends At (optional)</Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={formData.ends_at?.slice(0, 16) || ""}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value || null })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="target_all"
            checked={formData.target_all_apps}
            onCheckedChange={(checked) => setFormData({ ...formData, target_all_apps: checked, target_app_ids: checked ? [] : formData.target_app_ids })}
          />
          <Label htmlFor="target_all">Target All Apps</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      {!formData.target_all_apps && (
        <div className="space-y-2">
          <Label>Target Apps</Label>
          {apps && apps.length > 0 ? (
            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
              {apps.map((app) => (
                <div key={app.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`app-${app.id}`}
                    checked={(formData.target_app_ids || []).includes(app.id)}
                    onCheckedChange={() => toggleAppId(app.id)}
                  />
                  <Label htmlFor={`app-${app.id}`} className="text-sm font-normal cursor-pointer">
                    {app.name} <span className="text-muted-foreground">({app.code})</span>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No apps registered yet</p>
          )}
          {(formData.target_app_ids || []).length === 0 && (
            <p className="text-sm text-yellow-600">Select at least one app to target</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Manage system announcements and maintenance windows</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>
                    Create a new system announcement or maintenance window
                  </DialogDescription>
                </DialogHeader>
                <AnnouncementForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createAnnouncement.isPending}>
                    {createAnnouncement.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
            </DialogHeader>
            <AnnouncementForm isEdit />
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateAnnouncement.isPending}>
                {updateAnnouncement.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Announcements List */}
        <div className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : announcements?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements yet</p>
                <p className="text-sm">Create your first announcement to notify satellite apps</p>
              </CardContent>
            </Card>
          ) : (
            announcements?.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeBadge(announcement.type)}
                      {getStatusBadge(announcement)}
                      {announcement.priority > 0 && (
                        <Badge variant="outline">Priority: {announcement.priority}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(announcement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{announcement.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(announcement)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{announcement.message}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      📅 {new Date(announcement.starts_at).toLocaleDateString()}
                      {announcement.ends_at && ` → ${new Date(announcement.ends_at).toLocaleDateString()}`}
                    </span>
                    <span>
                      {announcement.target_all_apps ? "🌐 All Apps" : `📱 ${announcement.target_app_ids.length} Apps`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}