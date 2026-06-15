-- Create contact_queries table
CREATE TABLE IF NOT EXISTS contact_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'resolved', 'closed')),
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_queries_user_id ON contact_queries(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_contact_queries_created_at ON contact_queries(created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_contact_queries_status ON contact_queries(status);

-- Enable RLS
ALTER TABLE contact_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own queries
CREATE POLICY "Users can insert their own contact queries"
ON contact_queries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Authenticated users can view their own queries
CREATE POLICY "Users can view their own contact queries"
ON contact_queries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- Policy: Allow admin users to view all queries (if needed, adjust based on your admin role)
CREATE POLICY "Admins can view all contact queries"
ON contact_queries
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

-- Policy: Admins can update contact queries
CREATE POLICY "Admins can update contact queries"
ON contact_queries
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));
