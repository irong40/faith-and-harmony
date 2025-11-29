-- Create enums
CREATE TYPE public.contact_method AS ENUM ('email', 'phone', 'text');
CREATE TYPE public.request_status AS ENUM ('new', 'contacted', 'scoping', 'quoted', 'closed', 'declined');
CREATE TYPE public.pricing_unit AS ENUM ('per_project', 'per_hour', 'per_session', 'per_month', 'per_video', 'per_event', 'starting_at');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    short_description TEXT,
    starting_price NUMERIC(10, 2),
    pricing_unit public.pricing_unit DEFAULT 'per_project',
    detailed_description TEXT,
    packages JSONB,
    page_route TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create service_requests table
CREATE TABLE public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    preferred_contact_method public.contact_method DEFAULT 'email',
    company_name TEXT,
    project_title TEXT,
    project_description TEXT NOT NULL,
    budget_range TEXT,
    target_start_date DATE,
    target_end_date DATE,
    source TEXT,
    status public.request_status DEFAULT 'new',
    metadata JSONB DEFAULT '{}',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Services policies (public read for active services)
CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service requests policies
CREATE POLICY "Anyone can create service requests"
ON public.service_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all service requests"
ON public.service_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service requests"
ON public.service_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies (admin only)
CREATE POLICY "Admins can view user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for service_requests
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed services data
INSERT INTO public.services (code, name, category, short_description, starting_price, pricing_unit, page_route) VALUES
('AI_VIDEO', 'AI Video Creation & Content Automation', 'Digital Media', 'AI-powered video production and automated content workflows', 350.00, 'per_video', '/services/ai-video-creation'),
('MASONIC', 'Masonic & OES Digital Projects', 'Fraternal Organizations', 'Digital preservation and virtual meeting platforms for lodges', 250.00, 'per_project', '/services/masonic-digital-projects'),
('BLACK_HISTORY', 'Black History Storytelling Packages', 'Storytelling', 'Professional storytelling for Black history narratives', 300.00, 'per_project', '/services/black-history-storytelling'),
('CYBERSECURITY', 'Cybersecurity AI Tools (Sentinel AI)', 'Technology', 'AI-powered cybersecurity assessment and protection', 500.00, 'per_project', '/services/cybersecurity-ai'),
('VENDOR_ASSISTANT', 'Vendor Assistant Systems for Events', 'Event Services', 'Complete event management and automation tools', 450.00, 'per_event', '/services/vendor-assistant'),
('CHURCH_TECH', 'Church Tech & Gospel Saxophone Programs', 'Church Services', 'Audio/visual solutions and music instruction', 199.00, 'starting_at', '/services/church-tech'),
('FINANCIAL', 'Financial Freedom & Land Ownership Coaching', 'Coaching', 'Financial coaching and land acquisition guidance', 150.00, 'per_session', '/services/financial-coaching'),
('AERIAL', 'Aerial Photography & Inspections', 'Photography', 'Drone photography and inspection services', 250.00, 'per_project', '/services/aerial-photography'),
('WEBSITE', 'Website Hosting & Development', 'Web Services', 'Professional website design, development and hosting', 750.00, 'per_project', '/services/website-hosting');