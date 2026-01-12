import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Camera,
  Video,
  HardDrive,
  CheckCircle,
  MapPin,
  Calendar,
  Package,
  Image,
  Mail,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logoFull from "@/assets/logo-full.png";

interface JobData {
  id: string;
  job_number: string;
  property_address: string;
  property_city: string;
  property_state: string;
  property_type: string;
  delivered_at: string;
  package_name: string;
  package_description: string;
  package_features: string[];
  customer_name: string;
  company_name: string;
  photo_count: number;
  video_count: number;
  total_size_mb: number;
  has_download_url: boolean;
}

interface Deliverable {
  id: string;
  name: string;
  description: string;
  file_count: number;
  total_size_bytes: number;
}

interface GalleryItem {
  id: string;
  file_name: string;
  qa_score: number;
  thumbnail_url: string;
}

export default function ClientJobPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const validateToken = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('drone-customer-portal', {
        body: { action: 'validate', token }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Invalid token');

      setJob(data.job);
      setDeliverables(data.deliverables || []);

      // Load gallery in background
      loadGallery();
    } catch (err: unknown) {
      console.error('Validation error:', err);
      const message = err instanceof Error ? err.message : 'Unable to load your delivery';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token, validateToken]);

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('drone-customer-portal', {
        body: { action: 'get-gallery', token }
      });

      if (!error && data.success) {
        setGallery(data.gallery || []);
      }
    } catch (err) {
      console.error('Gallery load error:', err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDownload = async (deliverableId?: string) => {
    setDownloading(deliverableId || 'main');
    try {
      const { data, error } = await supabase.functions.invoke('drone-customer-portal', {
        body: {
          action: 'get-download-url',
          token,
          deliverable_id: deliverableId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Download not available');

      // Open download in new tab
      window.open(data.download_url, '_blank');
      toast.success('Download started');
    } catch (err: unknown) {
      console.error('Download error:', err);
      const message = err instanceof Error ? err.message : 'Unable to start download';
      toast.error(message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mx-auto mb-8" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Delivery Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'This delivery link is invalid or has expired.'}
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact us at{' '}
              <a href="mailto:hello@faithandharmony.com" className="text-primary hover:underline">
                hello@faithandharmony.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={logoFull} alt="Faith & Harmony" className="h-10" />
          </Link>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Delivered
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Job #{job.job_number}</p>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Your Photos Are Ready!
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.property_address}, {job.property_city}, {job.property_state}</span>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Delivered {format(new Date(job.delivered_at), 'MMMM d, yyyy')}
                </div>
                {job.company_name && (
                  <p className="text-sm font-medium">{job.company_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x border-t">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                <Camera className="h-5 w-5" />
                {job.photo_count}
              </div>
              <p className="text-sm text-muted-foreground">Photos</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                <Video className="h-5 w-5" />
                {job.video_count}
              </div>
              <p className="text-sm text-muted-foreground">Videos</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                <HardDrive className="h-5 w-5" />
                {job.total_size_mb}
              </div>
              <p className="text-sm text-muted-foreground">MB Total</p>
            </div>
          </div>
        </Card>

        {/* Download Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Your Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Download */}
            {job.has_download_url && (
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => handleDownload()}
                disabled={downloading === 'main'}
              >
                <Download className="h-5 w-5" />
                {downloading === 'main' ? 'Preparing Download...' : 'Download All Photos'}
              </Button>
            )}

            {/* Additional Deliverables */}
            {deliverables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Additional Downloads</p>
                {deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{deliverable.name}</p>
                      {deliverable.description && (
                        <p className="text-sm text-muted-foreground">{deliverable.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {deliverable.file_count} files • {Math.round(deliverable.total_size_bytes / (1024 * 1024))} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(deliverable.id)}
                      disabled={downloading === deliverable.id}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!job.has_download_url && deliverables.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Downloads are being prepared. Please check back shortly.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery Preview */}
        {(gallery.length > 0 || galleryLoading) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Photo Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {galleryLoading ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {gallery.slice(0, 12).map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={item.thumbnail_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              )}
              {gallery.length > 12 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  +{gallery.length - 12} more photos in download
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Package Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Package Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-lg">{job.package_name}</h3>
            {job.package_description && (
              <p className="text-muted-foreground mt-1">{job.package_description}</p>
            )}
            {job.package_features && job.package_features.length > 0 && (
              <ul className="mt-4 space-y-2">
                {job.package_features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Support Footer */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Have questions about your delivery or need the files resent?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:hello@faithandharmony.com"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  hello@faithandharmony.com
                </a>
                <a
                  href="tel:+17576093268"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  (757) 609-3268
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.</p>
          <p className="mt-1">
            Thank you for choosing us for your aerial photography needs.
          </p>
        </div>
      </footer>
    </div>
  );
}