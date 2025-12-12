-- Create apps table FIRST (no dependencies)
CREATE TABLE public.apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'degraded')),
  version TEXT,
  url TEXT,
  last_health_check TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_tickets table (depends on apps)
CREATE TABLE public.maintenance_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  app_id UUID REFERENCES public.apps(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature-request', 'break-fix', 'question')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT CHECK (category IN ('database', 'ui', 'api', 'performance', 'security', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  url TEXT,
  user_agent TEXT,
  error_stack TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  assigned_to UUID,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  time_spent_hours NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'user-reported' CHECK (source IN ('user-reported', 'auto-detected')),
  reporter_email TEXT,
  reporter_name TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_logs table (depends on apps and tickets)
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES public.apps(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bugfix', 'feature', 'upgrade', 'refactor', 'performance', 'security')),
  hours NUMERIC NOT NULL,
  description TEXT NOT NULL,
  module TEXT,
  affected_features TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table (depends on apps and tickets)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
  app_id UUID REFERENCES public.apps(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table (depends on conversations)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user', 'system')),
  sender_id UUID,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table (depends on apps)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  app_id UUID REFERENCES public.apps(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'ticket-update', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for apps
CREATE POLICY "Admins can manage apps" ON public.apps FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active apps" ON public.apps FOR SELECT USING (active = true);

-- RLS policies for maintenance_tickets
CREATE POLICY "Admins can manage tickets" ON public.maintenance_tickets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (true);

-- RLS policies for maintenance_logs
CREATE POLICY "Admins can manage maintenance logs" ON public.maintenance_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for conversations
CREATE POLICY "Admins can manage conversations" ON public.conversations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);

-- RLS policies for messages
CREATE POLICY "Admins can manage messages" ON public.messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (true);

-- RLS policies for notifications
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create indexes for performance
CREATE INDEX idx_conversations_customer_email ON public.conversations(customer_email);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_read_at ON public.messages(read_at);
CREATE INDEX idx_notifications_user_email ON public.notifications(user_email);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_maintenance_tickets_status ON public.maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_priority ON public.maintenance_tickets(priority);

-- Create function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_num INT;
  new_number TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ticket_number FROM 'TKT-' || year_part || '-(\d+)') AS INT)
  ), 0) + 1
  INTO sequence_num
  FROM public.maintenance_tickets
  WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
  
  new_number := 'TKT-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_number();

-- Create trigger to update last_message_at on conversations
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Add updated_at triggers
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();