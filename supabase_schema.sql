-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text,
  role text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create spaces table
CREATE TABLE public.spaces (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  rules text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_private boolean DEFAULT false,
  host_id uuid REFERENCES public.users(id),
  effective_temp integer,
  is_ai_analyzed boolean DEFAULT false,
  image_url text,
  images text[],
  maintained_temp double precision,
  maintained_temp_unit text,
  cooldown_factor double precision,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create access_requests table
CREATE TABLE public.access_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  space_id uuid REFERENCES public.spaces(id) NOT NULL,
  requester_id uuid REFERENCES public.users(id),
  answers_text text,
  photo_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setup Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow read access to all spaces (you can modify this to hide private space coordinates if needed)
CREATE POLICY "Spaces are viewable by everyone."
  ON public.spaces FOR SELECT
  USING ( true );

-- Allow anyone to insert a space (for anonymous functionality)
CREATE POLICY "Anyone can insert a space."
  ON public.spaces FOR INSERT
  WITH CHECK ( true );

-- Access Requests Policies
CREATE POLICY "Anyone can insert an access request."
  ON public.access_requests FOR INSERT
  WITH CHECK ( true );

CREATE POLICY "Access requests are viewable by everyone for now."
  ON public.access_requests FOR SELECT
  USING ( true );
