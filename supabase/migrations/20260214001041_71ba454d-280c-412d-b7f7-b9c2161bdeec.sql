-- Create admin role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: Users can see their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create system_settings table for admin-editable config (like system prompt)
CREATE TABLE public.system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (edge functions need this)
CREATE POLICY "Settings are readable by all authenticated"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
ON public.system_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default system prompt setting
INSERT INTO public.system_settings (key, value, description) VALUES
('system_prompt', 'Du är AirLedger AI, en bokföringsassistent för svenska småföretag.

Svara på svenska. Var kort och tydlig.

REGLER:
- Använd alltid mallar när de finns — de är korrekta och auditerbara
- Om ingen mall passar, skapa en fri verifikation med save_general_transaction
- Debet MÅSTE alltid vara lika med Kredit i varje verifikation
- Om det är oklart om moms gäller (t.ex. köp begagnat): FRÅGA om det är från privatperson eller företag
- Visa alltid posterna för användaren innan bokföring
- Alla belopp i SEK, datum i YYYY-MM-DD', 'AI-assistentens system-prompt som styr beteendet');

-- Grant current demo user admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('b91566cf-502e-45c9-a059-6948d8f19498', 'admin');