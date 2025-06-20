/*
  # Middleman Market System

  1. New Tables
    - `middleman_requests` - Stores all middleman requests
    - `scam_list` - Stores known scammers
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create middleman_requests table
CREATE TABLE IF NOT EXISTS middleman_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_discord_id text NOT NULL,
  item_name text NOT NULL,
  price_details text NOT NULL,
  trade_role text NOT NULL,
  urgency text NOT NULL,
  specific_time text,
  preferred_middleman text NOT NULL,
  negotiable boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  claimed_by text,
  claimed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone
);

-- Create scam_list table
CREATE TABLE IF NOT EXISTS scam_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  in_game_name text NOT NULL,
  discord_id text,
  discord_name text,
  description text,
  evidence_url text,
  reported_by text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE middleman_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_list ENABLE ROW LEVEL SECURITY;

-- Create policies for middleman_requests
CREATE POLICY "Users can view their own requests"
  ON middleman_requests
  FOR SELECT
  TO authenticated
  USING (user_discord_id = get_discord_id());

CREATE POLICY "Users can create their own requests"
  ON middleman_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_discord_id = get_discord_id());

-- Create policies for scam_list
CREATE POLICY "Anyone can view scam list"
  ON scam_list
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage scam list"
  ON scam_list
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_middleman_requests_user_discord_id ON middleman_requests(user_discord_id);
CREATE INDEX IF NOT EXISTS idx_middleman_requests_status ON middleman_requests(status);
CREATE INDEX IF NOT EXISTS idx_middleman_requests_created_at ON middleman_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scam_list_in_game_name ON scam_list(in_game_name);
CREATE INDEX IF NOT EXISTS idx_scam_list_discord_id ON scam_list(discord_id);