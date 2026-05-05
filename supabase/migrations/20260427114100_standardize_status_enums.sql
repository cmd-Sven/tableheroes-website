-- Standardize status values before adding CHECK constraints.
-- Existing live data is normalized first so constraints can be applied safely.

-- ---------------------------------------------------------------------------
-- campaigns.status -> Active | Paused | Archived
-- ---------------------------------------------------------------------------
UPDATE public.campaigns
SET status = CASE
  WHEN lower(trim(coalesce(status, ''))) = 'active' THEN 'Active'
  WHEN lower(trim(coalesce(status, ''))) = 'paused' THEN 'Paused'
  WHEN lower(trim(coalesce(status, ''))) = 'archived' THEN 'Archived'
  ELSE 'Active'
END;

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('Active', 'Paused', 'Archived'));

-- ---------------------------------------------------------------------------
-- campaign_members.status
-- Applied | In_Review | Drafting | Changes_Proposed | Approved | Active | Rejected | Removed
-- ---------------------------------------------------------------------------
UPDATE public.campaign_members
SET status = CASE
  WHEN status IN ('Applied', 'In_Review', 'Drafting', 'Changes_Proposed', 'Approved', 'Active', 'Rejected', 'Removed')
    THEN status
  WHEN lower(trim(coalesce(status, ''))) = 'pending' THEN 'Applied'
  WHEN lower(trim(coalesce(status, ''))) = 'accepted' THEN 'Approved'
  WHEN lower(trim(coalesce(status, ''))) = 'approved' THEN 'Approved'
  WHEN lower(trim(coalesce(status, ''))) = 'applied' THEN 'Applied'
  WHEN lower(trim(coalesce(status, ''))) = 'drafting' THEN 'Drafting'
  WHEN lower(trim(coalesce(status, ''))) = 'in_review' THEN 'In_Review'
  WHEN lower(trim(coalesce(status, ''))) = 'changes_proposed' THEN 'Changes_Proposed'
  WHEN lower(trim(coalesce(status, ''))) = 'active' THEN 'Active'
  WHEN lower(trim(coalesce(status, ''))) = 'rejected' THEN 'Rejected'
  WHEN lower(trim(coalesce(status, ''))) = 'removed' THEN 'Removed'
  ELSE 'Applied'
END;

ALTER TABLE public.campaign_members
  DROP CONSTRAINT IF EXISTS campaign_members_status_check;

ALTER TABLE public.campaign_members
  ADD CONSTRAINT campaign_members_status_check
  CHECK (status IN ('Applied', 'In_Review', 'Drafting', 'Changes_Proposed', 'Approved', 'Active', 'Rejected', 'Removed'));

-- ---------------------------------------------------------------------------
-- characters.status
-- Draft | Pending_Approval | Approved | Active | Archived | Dead | Rejected
-- ---------------------------------------------------------------------------
UPDATE public.characters
SET status = CASE
  WHEN status IN ('Draft', 'Pending_Approval', 'Approved', 'Active', 'Archived', 'Dead', 'Rejected')
    THEN status
  WHEN lower(trim(coalesce(status, ''))) IN ('alive', 'active') THEN 'Active'
  WHEN lower(trim(coalesce(status, ''))) IN ('approved') THEN 'Approved'
  WHEN lower(trim(coalesce(status, ''))) IN ('pending_approval', 'in_review') THEN 'Pending_Approval'
  WHEN lower(trim(coalesce(status, ''))) IN ('draft', 'drafting') THEN 'Draft'
  WHEN lower(trim(coalesce(status, ''))) IN ('dead', 'deceased') THEN 'Dead'
  WHEN lower(trim(coalesce(status, ''))) IN ('archived', 'paused', 'missing', 'unknown') THEN 'Archived'
  WHEN lower(trim(coalesce(status, ''))) = 'rejected' THEN 'Rejected'
  ELSE 'Draft'
END;

ALTER TABLE public.characters
  DROP CONSTRAINT IF EXISTS characters_status_check;

ALTER TABLE public.characters
  ADD CONSTRAINT characters_status_check
  CHECK (status IN ('Draft', 'Pending_Approval', 'Approved', 'Active', 'Archived', 'Dead', 'Rejected'));

-- ---------------------------------------------------------------------------
-- sessions.status -> Scheduled | Live | Completed | Cancelled
-- ---------------------------------------------------------------------------
UPDATE public.sessions
SET status = CASE
  WHEN status IN ('Scheduled', 'Live', 'Completed', 'Cancelled') THEN status
  WHEN lower(trim(coalesce(status, ''))) = 'scheduled' THEN 'Scheduled'
  WHEN lower(trim(coalesce(status, ''))) IN ('live', 'in progress', 'in_progress') THEN 'Live'
  WHEN lower(trim(coalesce(status, ''))) IN ('completed', 'ended', 'end') THEN 'Completed'
  WHEN lower(trim(coalesce(status, ''))) IN ('cancelled', 'canceled') THEN 'Cancelled'
  ELSE 'Scheduled'
END;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('Scheduled', 'Live', 'Completed', 'Cancelled'));

-- ---------------------------------------------------------------------------
-- npcs.status -> Alive | Deceased | Missing | Unknown
-- ---------------------------------------------------------------------------
UPDATE public.npcs
SET status = CASE
  WHEN status IN ('Alive', 'Deceased', 'Missing', 'Unknown') THEN status
  WHEN lower(trim(coalesce(status, ''))) IN ('alive', 'active') THEN 'Alive'
  WHEN lower(trim(coalesce(status, ''))) IN ('deceased', 'dead') THEN 'Deceased'
  WHEN lower(trim(coalesce(status, ''))) = 'missing' THEN 'Missing'
  WHEN lower(trim(coalesce(status, ''))) = 'unknown' THEN 'Unknown'
  ELSE 'Unknown'
END;

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_status_check;

ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_status_check
  CHECK (status IN ('Alive', 'Deceased', 'Missing', 'Unknown'));
