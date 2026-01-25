-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;

-- Create a permissive policy that allows authenticated users full access
CREATE POLICY "Authenticated users can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also allow public read access for categories (they're reference data)
CREATE POLICY "Anyone can read categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);