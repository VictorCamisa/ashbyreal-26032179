-- Update policy to allow both authenticated and anon roles for internal system
DROP POLICY IF EXISTS "Authenticated users can manage clientes" ON public.clientes;

-- Create permissive policy for anon and authenticated
CREATE POLICY "Allow all access to clientes"
ON public.clientes
FOR ALL
USING (true)
WITH CHECK (true);