-- Migration: Add notification_scheduled column to projects table
-- Run this in your Supabase SQL Editor if you already have the projects table

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS notification_scheduled BOOLEAN DEFAULT FALSE;

-- Update existing projects to set notification_scheduled based on notification_sent
UPDATE projects 
SET notification_scheduled = notification_sent 
WHERE notification_scheduled IS NULL;

