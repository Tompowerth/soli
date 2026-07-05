-- ============================================================
-- SOLI — Supabase Schema v1.0
-- The AI advisor that sees you, hears you, knows you.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS — Core user profile
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_choice TEXT DEFAULT 'female' CHECK (avatar_choice IN ('female', 'male')),
  display_mode TEXT DEFAULT 'avatar' CHECK (display_mode IN ('avatar', 'orb')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'he', 'es', 'pt', 'fr', 'de')),
  timezone TEXT DEFAULT 'UTC',
  birth_date DATE,
  zodiac_sign TEXT,
  zodiac_element TEXT,
  zodiac_modality TEXT,
  moon_sign TEXT,
  rising_sign TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  graphology_complete BOOLEAN DEFAULT FALSE,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'pro', 'premium')),
  trial_end_date TIMESTAMPTZ,
  voice_minutes_used INTEGER DEFAULT 0,
  voice_minutes_limit INTEGER DEFAULT 70,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_session_at TIMESTAMPTZ
);

-- ============================================================
-- 2. USER_PROFILE — Deep personality & emotional profile
-- ============================================================
CREATE TABLE public.user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Graphology results
  graphology_data JSONB DEFAULT '{}',
  -- { slant, pressure, size, spacing, baseline, letter_shapes, connections, signature }
  
  -- Personality assessment
  personality_traits JSONB DEFAULT '{}',
  -- { openness, conscientiousness, extraversion, agreeableness, neuroticism }
  
  -- Emotional baseline
  baseline_voice JSONB DEFAULT '{}',
  -- { avg_pitch, avg_pace, avg_volume, typical_pauses, baseline_emotion }
  
  baseline_face JSONB DEFAULT '{}',
  -- { resting_expression, typical_fatigue_level, skin_tone_baseline }
  
  -- Attachment style
  attachment_style TEXT,
  -- secure, anxious, avoidant, disorganized
  
  -- Communication preferences
  preferred_response_style TEXT DEFAULT 'balanced',
  -- validation, challenge, humor, direct, gentle, balanced
  
  -- What works for this user
  effective_techniques JSONB DEFAULT '[]',
  -- ["cbt_reframing", "act_defusion", "grounding", "humor", "silence", "validation"]
  
  -- Values (from ACT values clarification)
  core_values JSONB DEFAULT '[]',
  -- ["family", "creativity", "growth", "connection", "freedom"]
  
  -- Key people in their life
  key_people JSONB DEFAULT '[]',
  -- [{ name, relationship, sentiment, recurring_topics }]
  
  -- Recurring themes & patterns
  patterns JSONB DEFAULT '[]',
  -- [{ pattern, frequency, first_detected, examples }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CONVERSATIONS — Each session
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  voice_minutes_used NUMERIC(6,2) DEFAULT 0,
  
  -- Session summary (generated at end)
  summary TEXT,
  key_topics JSONB DEFAULT '[]',
  dominant_emotion TEXT,
  emotion_arc JSONB DEFAULT '[]',
  -- [{ timestamp, emotion, intensity }] — how emotion changed during session
  
  -- AI engine usage
  haiku_calls INTEGER DEFAULT 0,
  sonnet_calls INTEGER DEFAULT 0,
  opus_calls INTEGER DEFAULT 0,
  vision_calls INTEGER DEFAULT 0,
  
  -- Session quality
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MESSAGES — Individual messages within conversations
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'soli', 'system')),
  content TEXT NOT NULL,
  
  -- Mode
  input_mode TEXT DEFAULT 'text' CHECK (input_mode IN ('text', 'voice', 'voice_camera')),
  
  -- AI engine used for this response
  engine TEXT CHECK (engine IN ('haiku', 'sonnet', 'opus')),
  
  -- Voice analysis (from Hume AI)
  voice_emotion JSONB DEFAULT '{}',
  -- { primary_emotion, confidence, pitch_avg, pace, volume, tremor_detected, 
  --   secondary_emotions: [{ emotion, confidence }] }
  
  -- Face analysis (from Claude Vision)
  face_analysis JSONB DEFAULT '{}',
  -- { fatigue_level, stress_level, expression, micro_expressions: [],
  --   behavioral_signals: [], comparison_to_baseline }
  
  -- Token usage
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd NUMERIC(8,6),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. EMOTIONAL_FINGERPRINT — Aggregated emotional data over time
-- ============================================================
CREATE TABLE public.emotional_fingerprint (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Time-based patterns
  day_of_week INTEGER, -- 0=Sunday
  hour_of_day INTEGER, -- 0-23
  
  -- Emotional state
  primary_emotion TEXT,
  emotion_intensity NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Voice metrics
  pitch_deviation NUMERIC(6,2), -- deviation from baseline
  pace_deviation NUMERIC(6,2),
  volume_deviation NUMERIC(6,2),
  tremor_detected BOOLEAN DEFAULT FALSE,
  
  -- Face metrics
  fatigue_level NUMERIC(3,2),
  stress_level NUMERIC(3,2),
  micro_expressions JSONB DEFAULT '[]',
  
  -- Context
  topic_discussed TEXT,
  trigger_identified TEXT,
  
  -- What SOLI did and how it worked
  response_technique TEXT,
  response_effectiveness NUMERIC(3,2) -- 0.00 to 1.00 (did the user feel better after?)
);

-- ============================================================
-- 6. TAROT_READINGS — Tarot sessions
-- ============================================================
CREATE TABLE public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id),
  question TEXT,
  spread_type TEXT DEFAULT 'single' CHECK (spread_type IN ('single', 'three_card', 'celtic_cross')),
  cards JSONB NOT NULL,
  -- [{ position, card_name, orientation: "upright"|"reversed", interpretation }]
  reading_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ASTRO_EVENTS — Astrological events & forecasts
-- ============================================================
CREATE TABLE public.astro_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT, -- transit, period, forecast
  description TEXT,
  starts_at DATE,
  ends_at DATE,
  relevance_to_user TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. INSIGHTS — SOLI's observations about the user over time
-- ============================================================
CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id),
  insight_type TEXT NOT NULL,
  -- pattern, breakthrough, concern, growth, observation, trigger, recommendation
  content TEXT NOT NULL,
  confidence NUMERIC(3,2), -- how confident SOLI is in this insight
  shared_with_user BOOLEAN DEFAULT FALSE,
  user_confirmed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. GOALS — User goals and tracking
-- ============================================================
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- health, career, relationship, personal, financial
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  progress_notes JSONB DEFAULT '[]',
  -- [{ date, note, progress_pct }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. USAGE_TRACKING — For billing and heavy-usage detection
-- ============================================================
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  text_messages INTEGER DEFAULT 0,
  voice_seconds INTEGER DEFAULT 0,
  camera_seconds INTEGER DEFAULT 0,
  total_session_seconds INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  haiku_tokens INTEGER DEFAULT 0,
  sonnet_tokens INTEGER DEFAULT 0,
  opus_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(8,4) DEFAULT 0,
  heavy_usage_flag BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, date)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_user ON public.messages(user_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_conversations_user ON public.conversations(user_id);
CREATE INDEX idx_conversations_started ON public.conversations(started_at DESC);
CREATE INDEX idx_emotional_fp_user ON public.emotional_fingerprint(user_id);
CREATE INDEX idx_emotional_fp_time ON public.emotional_fingerprint(user_id, day_of_week, hour_of_day);
CREATE INDEX idx_insights_user ON public.insights(user_id);
CREATE INDEX idx_usage_user_date ON public.usage_tracking(user_id, date);

-- ============================================================
-- ROW LEVEL SECURITY — Users can only see their own data
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotional_fingerprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their own data
CREATE POLICY "Users see own data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own profile" ON public.user_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own messages" ON public.messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own fingerprint" ON public.emotional_fingerprint FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own tarot" ON public.tarot_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own astro" ON public.astro_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own insights" ON public.insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own usage" ON public.usage_tracking FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_profile_updated BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_goals_updated BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-calculate zodiac from birth_date
CREATE OR REPLACE FUNCTION public.calculate_zodiac()
RETURNS TRIGGER AS $$
DECLARE
  m INTEGER;
  d INTEGER;
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    m := EXTRACT(MONTH FROM NEW.birth_date);
    d := EXTRACT(DAY FROM NEW.birth_date);
    NEW.zodiac_sign := CASE
      WHEN (m=3 AND d>=21) OR (m=4 AND d<=19) THEN 'aries'
      WHEN (m=4 AND d>=20) OR (m=5 AND d<=20) THEN 'taurus'
      WHEN (m=5 AND d>=21) OR (m=6 AND d<=20) THEN 'gemini'
      WHEN (m=6 AND d>=21) OR (m=7 AND d<=22) THEN 'cancer'
      WHEN (m=7 AND d>=23) OR (m=8 AND d<=22) THEN 'leo'
      WHEN (m=8 AND d>=23) OR (m=9 AND d<=22) THEN 'virgo'
      WHEN (m=9 AND d>=23) OR (m=10 AND d<=22) THEN 'libra'
      WHEN (m=10 AND d>=23) OR (m=11 AND d<=21) THEN 'scorpio'
      WHEN (m=11 AND d>=22) OR (m=12 AND d<=21) THEN 'sagittarius'
      WHEN (m=12 AND d>=22) OR (m=1 AND d<=19) THEN 'capricorn'
      WHEN (m=1 AND d>=20) OR (m=2 AND d<=18) THEN 'aquarius'
      WHEN (m=2 AND d>=19) OR (m=3 AND d<=20) THEN 'pisces'
    END;
    NEW.zodiac_element := CASE NEW.zodiac_sign
      WHEN 'aries' THEN 'fire' WHEN 'leo' THEN 'fire' WHEN 'sagittarius' THEN 'fire'
      WHEN 'taurus' THEN 'earth' WHEN 'virgo' THEN 'earth' WHEN 'capricorn' THEN 'earth'
      WHEN 'gemini' THEN 'air' WHEN 'libra' THEN 'air' WHEN 'aquarius' THEN 'air'
      WHEN 'cancer' THEN 'water' WHEN 'scorpio' THEN 'water' WHEN 'pisces' THEN 'water'
    END;
    NEW.zodiac_modality := CASE NEW.zodiac_sign
      WHEN 'aries' THEN 'cardinal' WHEN 'cancer' THEN 'cardinal' WHEN 'libra' THEN 'cardinal' WHEN 'capricorn' THEN 'cardinal'
      WHEN 'taurus' THEN 'fixed' WHEN 'leo' THEN 'fixed' WHEN 'scorpio' THEN 'fixed' WHEN 'aquarius' THEN 'fixed'
      WHEN 'gemini' THEN 'mutable' WHEN 'virgo' THEN 'mutable' WHEN 'sagittarius' THEN 'mutable' WHEN 'pisces' THEN 'mutable'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_zodiac BEFORE INSERT OR UPDATE OF birth_date ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.calculate_zodiac();

-- Auto-create profile when user registers
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_create_profile AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Check heavy usage
CREATE OR REPLACE FUNCTION public.check_heavy_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_session_seconds > 7200 THEN -- 2+ hours
    NEW.heavy_usage_flag := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_heavy_usage BEFORE INSERT OR UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.check_heavy_usage();

-- ============================================================
-- VIEWS
-- ============================================================

-- User dashboard view
CREATE VIEW public.v_user_dashboard AS
SELECT 
  u.id,
  u.name,
  u.plan,
  u.voice_minutes_used,
  u.voice_minutes_limit,
  u.zodiac_sign,
  u.last_session_at,
  COUNT(DISTINCT c.id) as total_sessions,
  COUNT(DISTINCT m.id) as total_messages,
  MAX(c.started_at) as last_conversation
FROM public.users u
LEFT JOIN public.conversations c ON c.user_id = u.id
LEFT JOIN public.messages m ON m.user_id = u.id
GROUP BY u.id;

-- Emotional trends (last 30 days)
CREATE VIEW public.v_emotional_trends AS
SELECT 
  user_id,
  day_of_week,
  hour_of_day,
  primary_emotion,
  AVG(emotion_intensity) as avg_intensity,
  COUNT(*) as occurrences
FROM public.emotional_fingerprint
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, day_of_week, hour_of_day, primary_emotion;
