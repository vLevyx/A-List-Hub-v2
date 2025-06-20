/*
  # Middleman Market System

  1. New Tables
    - `middleman_requests` - Stores all middleman requests
    - `scam_list` - Stores known scammers
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own requests
    - Add admin-only policies for scam list management
*/

-- Create middleman_requests table
CREATE TABLE IF NOT EXISTS middleman_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_discord_id text NOT NULL,
  item_name text NOT NULL,
  price text NOT NULL,
  trade_details text,
  trade_role text NOT NULL,
  urgency text NOT NULL,
  specific_time text,
  preferred_middleman text NOT NULL,
  negotiable boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  claimed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Create scam_list table
CREATE TABLE IF NOT EXISTS scam_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  in_game_name text NOT NULL,
  discord_name text,
  discord_id text,
  description text,
  evidence_url text,
  verified boolean DEFAULT false,
  added_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable RLS
ALTER TABLE middleman_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_list ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_middleman_requests_user_discord_id ON middleman_requests(user_discord_id);
CREATE INDEX IF NOT EXISTS idx_middleman_requests_status ON middleman_requests(status);
CREATE INDEX IF NOT EXISTS idx_middleman_requests_created_at ON middleman_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scam_list_in_game_name ON scam_list(in_game_name);
CREATE INDEX IF NOT EXISTS idx_scam_list_discord_id ON scam_list(discord_id);

-- Policies for middleman_requests
CREATE POLICY "Users can view their own requests"
  ON middleman_requests
  FOR SELECT
  TO authenticated
  USING (user_discord_id = get_discord_id());

CREATE POLICY "Users can insert their own requests"
  ON middleman_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_discord_id = get_discord_id());

CREATE POLICY "Admins can view all requests"
  ON middleman_requests
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all requests"
  ON middleman_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for scam_list
CREATE POLICY "Anyone can view scam list"
  ON scam_list
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert to scam list"
  ON scam_list
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update scam list"
  ON scam_list
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete from scam list"
  ON scam_list
  FOR DELETE
  TO authenticated
  USING (is_admin());