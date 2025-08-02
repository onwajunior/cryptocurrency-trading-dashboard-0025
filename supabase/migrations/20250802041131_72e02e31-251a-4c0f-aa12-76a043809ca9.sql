-- Add missing columns to assessments table for enhanced analysis functionality
ALTER TABLE public.assessments 
ADD COLUMN analysis_seed INTEGER DEFAULT NULL,
ADD COLUMN analysis_mode TEXT DEFAULT 'quick',
ADD COLUMN consistency_level TEXT DEFAULT 'standard',
ADD COLUMN analysis_metadata JSONB DEFAULT NULL;

-- Add index for better performance on analysis queries
CREATE INDEX idx_assessments_analysis_mode ON public.assessments(analysis_mode);
CREATE INDEX idx_assessments_consistency_level ON public.assessments(consistency_level);