-- Add consistency_score column for storing analysis consistency metrics
ALTER TABLE public.assessments 
ADD COLUMN consistency_score INTEGER DEFAULT NULL;

-- Add index for consistency score queries
CREATE INDEX idx_assessments_consistency_score ON public.assessments(consistency_score);