-- Migration: Add skill_check column to secrets table
-- Date: 2024
-- Description: Adds a skill_check field to store skill check requirements for secrets (e.g., "Wahrnehmung DC 15" or "Geschichte")

ALTER TABLE secrets
ADD COLUMN IF NOT EXISTS skill_check TEXT;

COMMENT ON COLUMN secrets.skill_check IS 'Skill check requirement for discovering this secret (e.g., "Wahrnehmung DC 15" or "Geschichte")';


