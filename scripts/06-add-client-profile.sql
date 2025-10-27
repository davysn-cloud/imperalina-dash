-- ============================================
-- CLIENT PROFILE - Behavioral preferences
-- ============================================

-- Create enum types for client preferences
CREATE TYPE coffee_strength AS ENUM ('WEAK', 'MEDIUM', 'STRONG', 'VERY_STRONG');
CREATE TYPE water_temp AS ENUM ('COLD', 'ROOM_TEMP', 'WARM');
CREATE TYPE music_volume AS ENUM ('OFF', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE temperature_preference AS ENUM ('PREFERS_WARM', 'PREFERS_COOL', 'NO_PREFERENCE');
CREATE TYPE lighting_preference AS ENUM ('BRIGHT', 'SOFT', 'DIM', 'NO_PREFERENCE');
CREATE TYPE conversation_style AS ENUM ('VERY_TALKATIVE', 'TALKATIVE', 'NEUTRAL', 'QUIET', 'VERY_QUIET');
CREATE TYPE skin_sensitivity AS ENUM ('NONE', 'MILD', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- Client Profile table
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Beverage Preferences
  likes_coffee BOOLEAN,
  coffee_strength coffee_strength,
  likes_tea BOOLEAN,
  tea_type TEXT,
  likes_water BOOLEAN DEFAULT true,
  water_temp water_temp,
  
  -- Music Preferences
  music_genres TEXT[] DEFAULT '{}',
  favorite_songs TEXT[] DEFAULT '{}',
  music_volume music_volume,
  
  -- Environment Preferences
  temperature_preference temperature_preference,
  lighting_preference lighting_preference,
  conversation_style conversation_style,
  
  -- Health/Care Information
  allergies TEXT[] DEFAULT '{}',
  skin_sensitivity skin_sensitivity,
  special_needs TEXT,
  
  -- General Notes
  general_notes TEXT,
  vip_client BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for client lookups
CREATE INDEX idx_client_profiles_client_id ON client_profiles(client_id);

-- Add trigger for updated_at
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
