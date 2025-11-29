import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SERVICES, BUDGET_RANGES, CONTACT_METHODS, HOW_HEARD_OPTIONS, ServiceCode, getServiceByCode } from "@/data/services";
import { ConditionalFields } from "@/components/service-request/ConditionalFields";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RequestService() {
  const [searchParams] = useSearchParams();
  const preselectedService = searchParams.get('service') as ServiceCode | null;
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCode | null>(preselectedService);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    preferredContactMethod: 'email',
    companyName: '',
    projectTitle: '',
    projectDescription: '',
    budgetRange: '',
    targetStartDate: '',
    targetEndDate: '',
    source: '',
    additionalNotes: '',
  });

  useEffect(() => {
    if (preselectedService) {
      setSelectedService(preselectedService);
    }
  }, [preselectedService]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService) {
      toast({ title: "Please select a service", variant: "destructive" });
      return;
    }

    if (!formData.clientName || !formData.clientEmail || !formData.clientPhone || !formData.projectDescription) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get service ID from database
      const { data: serviceData } = await supabase
        .from('services')
        .select('id, name')
        .eq('code', selectedService)
        .single();

      if (!serviceData) {
        throw new Error('Service not found');
      }

      // Create service request
      const { error: insertError } = await supabase
        .from('service_requests')
        .insert({
          service_id: serviceData.id,
          client_name: formData.clientName,
          client_email: formData.clientEmail,
          client_phone: formData.clientPhone,
          preferred_contact_method: formData.preferredContactMethod as 'email' | 'phone' | 'text',
          company_name: formData.companyName || null,
          project_title: formData.projectTitle || null,
          project_description: formData.projectDescription,
          budget_range: formData.budgetRange || null,
          target_start_date: formData.targetStartDate || null,
          target_end_date: formData.targetEndDate || null,
          source: formData.source || null,
          metadata: { ...metadata, additionalNotes: formData.additionalNotes },
        });

      if (insertError) throw insertError;

      // Send confirmation emails via edge function
      await supabase.functions.invoke('send-service-request-emails', {
        body: {
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientPhone: formData.clientPhone,
          preferredContactMethod: formData.preferredContactMethod,
          serviceName: serviceData.name,
          projectTitle: formData.projectTitle,
          projectDescription: formData.projectDescription,
          budgetRange: formData.budgetRange,
          targetStartDate: formData.targetStartDate,
          targetEndDate: formData.targetEndDate,
          metadata,
        },
      });

      setIsSubmitted(true);
      toast({ title: "Request submitted successfully!" });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ 
        title: "Error submitting request", 
        description: "Please try again or contact us directly.",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <CheckCircle className="w-20 h-20 text-accent mx-auto" />
          <h1 className="text-3xl font-bold text-primary font-display">Request Received!</h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your interest in our services. We'll review your request and contact you within 24-48 hours via your preferred method.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button variant="outline">Return Home</Button>
            </Link>
            <Link to="/services">
              <Button>View All Services</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedServiceData = selectedService ? getServiceByCode(selectedService) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary font-display mb-4">Request a Service</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us about your project and we'll get back to you within 24-48 hours to discuss how we can help.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Selection */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
            <h2 className="text-2xl font-bold text-primary font-display mb-6">Select Your Service</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service">Service Category *</Label>
                <Select value={selectedService || ''} onValueChange={(v) => setSelectedService(v as ServiceCode)}>
                  <SelectTrigger id="service">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICES.map(service => (
                      <SelectItem key={service.code} value={service.code}>
                        {service.name} — Starting at ${service.startingPrice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedServiceData && (
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-primary">{selectedServiceData.name}</strong> — {selectedServiceData.category}
                  </p>
                  <p className="text-accent font-semibold mt-1">
                    Starting at ${selectedServiceData.startingPrice} {selectedServiceData.pricingUnit}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
            <h2 className="text-2xl font-bold text-primary font-display mb-6">Contact Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clientName">Full Name *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company/Organization</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email Address *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone Number *</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select 
                  value={formData.preferredContactMethod} 
                  onValueChange={(v) => handleInputChange('preferredContactMethod', v)}
                >
                  <SelectTrigger id="preferredContactMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Project Details */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
            <h2 className="text-2xl font-bold text-primary font-display mb-6">Project Details</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project Title</Label>
                <Input
                  id="projectTitle"
                  value={formData.projectTitle}
                  onChange={(e) => handleInputChange('projectTitle', e.target.value)}
                  placeholder="Brief title for your project"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description *</Label>
                <Textarea
                  id="projectDescription"
                  value={formData.projectDescription}
                  onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                  placeholder="Tell us about your project, goals, and what you're hoping to achieve..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">How did you hear about Faith & Harmony?</Label>
                <Select value={formData.source} onValueChange={(v) => handleInputChange('source', v)}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOW_HEARD_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Conditional Fields */}
          {selectedService && (
            <ConditionalFields
              serviceCode={selectedService}
              metadata={metadata}
              onMetadataChange={handleMetadataChange}
            />
          )}

          {/* Timeline & Budget */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
            <h2 className="text-2xl font-bold text-primary font-display mb-6">Timeline & Budget</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="targetStartDate">Target Start Date</Label>
                <Input
                  id="targetStartDate"
                  type="date"
                  value={formData.targetStartDate}
                  onChange={(e) => handleInputChange('targetStartDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetEndDate">Target Completion Date</Label>
                <Input
                  id="targetEndDate"
                  type="date"
                  value={formData.targetEndDate}
                  onChange={(e) => handleInputChange('targetEndDate', e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select value={formData.budgetRange} onValueChange={(v) => handleInputChange('budgetRange', v)}>
                  <SelectTrigger id="budgetRange">
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map(range => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="additionalNotes">Anything else we should know?</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  placeholder="Additional details, questions, or requirements..."
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="text-center">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isSubmitting}
              className="px-12 py-6 text-lg"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              We'll respond within 24-48 hours via your preferred contact method.
            </p>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
