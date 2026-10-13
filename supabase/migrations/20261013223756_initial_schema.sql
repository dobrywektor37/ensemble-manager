
BEGIN;

-- ==========================================
-- 1. TEAMS - zespoly muzyczne
-- ==========================================

CREATE TABLE public.teams (
                              id UUID PRIMARY KEY
                                                              DEFAULT auth.uid()
                                  REFERENCES auth.users(id)
                                      ON DELETE CASCADE,

                              name TEXT NOT NULL
                                  CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),

                              created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. EVENTS - proby i koncerty
-- ==========================================

CREATE TABLE public.events (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                               team_id UUID NOT NULL
                                                   DEFAULT auth.uid()
                                   REFERENCES public.teams(id)
                                       ON DELETE CASCADE,

                               title TEXT NOT NULL
                                   CHECK (char_length(btrim(title)) BETWEEN 3 AND 150),

                               type TEXT NOT NULL DEFAULT 'rehearsal'
                                   CHECK (type IN ('rehearsal', 'concert', 'other')),

                               starts_at TIMESTAMPTZ NOT NULL,
                               ends_at TIMESTAMPTZ NOT NULL,

                               location TEXT,
                               description TEXT,

                               created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                               CONSTRAINT valid_event_dates
                                   CHECK (ends_at > starts_at)
);

-- ==========================================
-- 3. ABSENCES - zgloszenia nieobecnosci
-- ==========================================

CREATE TABLE public.absences (
                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

                                 event_id UUID NOT NULL
                                     REFERENCES public.events(id)
                                         ON DELETE CASCADE,

                                 member_name TEXT NOT NULL
                                     CHECK (char_length(btrim(member_name)) BETWEEN 2 AND 100),

                                 reason TEXT,

                                 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. INDEKSY
-- ==========================================

CREATE INDEX events_team_date_idx
    ON public.events(team_id, starts_at);

CREATE INDEX absences_event_idx
    ON public.absences(event_id);

-- ==========================================
-- 5. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. UPRAWNIENIA BAZY DANYCH
-- ==========================================

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE
    public.teams,
    public.events,
    public.absences
    FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE
    ON public.teams TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
      ON public.events, public.absences
          TO authenticated;

-- ==========================================
-- 7. POLITYKI RLS - TEAMS
-- ==========================================

CREATE POLICY "teams_select_own"
ON public.teams
FOR SELECT TO authenticated
               USING (id = (SELECT auth.uid()));

CREATE POLICY "teams_insert_own"
ON public.teams
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "teams_update_own"
ON public.teams
FOR UPDATE TO authenticated
                      USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- ==========================================
-- 8. POLITYKI RLS - EVENTS
-- ==========================================

CREATE POLICY "events_select_own"
ON public.events
FOR SELECT TO authenticated
               USING (team_id = (SELECT auth.uid()));

CREATE POLICY "events_insert_own"
ON public.events
FOR INSERT TO authenticated
WITH CHECK (team_id = (SELECT auth.uid()));

CREATE POLICY "events_update_own"
ON public.events
FOR UPDATE TO authenticated
                      USING (team_id = (SELECT auth.uid()))
    WITH CHECK (team_id = (SELECT auth.uid()));

CREATE POLICY "events_delete_own"
ON public.events
FOR DELETE TO authenticated
USING (team_id = (SELECT auth.uid()));

-- ==========================================
-- 9. POLITYKI RLS - ABSENCES
-- ==========================================

CREATE POLICY "absences_select_own"
ON public.absences
FOR SELECT TO authenticated
                                 USING (
                                 EXISTS (
                                 SELECT 1
                                 FROM public.events e
                                 WHERE e.id = absences.event_id
                                 AND e.team_id = (SELECT auth.uid())
                                 )
                                 );

CREATE POLICY "absences_insert_own"
ON public.absences
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = absences.event_id
          AND e.team_id = (SELECT auth.uid())
    )
);

CREATE POLICY "absences_update_own"
ON public.absences
FOR UPDATE TO authenticated
                      USING (
                      EXISTS (
                      SELECT 1
                      FROM public.events e
                      WHERE e.id = absences.event_id
                      AND e.team_id = (SELECT auth.uid())
                      )
                      )
    WITH CHECK (
                      EXISTS (
                      SELECT 1
                      FROM public.events e
                      WHERE e.id = absences.event_id
                      AND e.team_id = (SELECT auth.uid())
                      )
                      );

CREATE POLICY "absences_delete_own"
ON public.absences
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id = absences.event_id
          AND e.team_id = (SELECT auth.uid())
    )
);

COMMIT;
