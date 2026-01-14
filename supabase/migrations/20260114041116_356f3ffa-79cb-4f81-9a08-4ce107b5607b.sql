-- Drop existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can manage clientes" ON public.clientes;

CREATE POLICY "Authenticated users can manage clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);