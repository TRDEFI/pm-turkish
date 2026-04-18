-- Create votes table for EVET/HAYIR voting
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('EVET', 'HAYIR')),
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS votes_event_id_idx ON public.votes(event_id);
CREATE INDEX IF NOT EXISTS votes_user_id_idx ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS votes_created_at_idx ON public.votes(created_at);

-- Enable RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: anyone can insert votes, anyone can view votes
CREATE POLICY "votes_insert_anyone" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_select_anyone" ON public.votes FOR SELECT USING (true);

-- Add check constraint to prevent duplicate votes from same user on same event
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_voter_event ON public.votes(event_id, user_id) WHERE user_id != 'anonymous';