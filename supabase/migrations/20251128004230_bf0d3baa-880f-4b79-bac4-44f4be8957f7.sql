-- Habilitar RLS em todas as tabelas do módulo financeiro
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_hours_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashby_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas para entities
CREATE POLICY "Authenticated users can view all entities" ON entities
  FOR SELECT TO authenticated USING (true);

-- Políticas para categories
CREATE POLICY "Authenticated users can view all categories" ON categories
  FOR SELECT TO authenticated USING (true);

-- Políticas para subcategories
CREATE POLICY "Authenticated users can view all subcategories" ON subcategories
  FOR SELECT TO authenticated USING (true);

-- Políticas para accounts
CREATE POLICY "Authenticated users can view all accounts" ON accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert accounts" ON accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update accounts" ON accounts
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete accounts" ON accounts
  FOR DELETE TO authenticated USING (true);

-- Políticas para transactions
CREATE POLICY "Authenticated users can view all transactions" ON transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transactions" ON transactions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transactions" ON transactions
  FOR DELETE TO authenticated USING (true);

-- Políticas para credit_cards
CREATE POLICY "Authenticated users can view all credit_cards" ON credit_cards
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert credit_cards" ON credit_cards
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update credit_cards" ON credit_cards
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete credit_cards" ON credit_cards
  FOR DELETE TO authenticated USING (true);

-- Políticas para credit_card_invoices
CREATE POLICY "Authenticated users can view all credit_card_invoices" ON credit_card_invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert credit_card_invoices" ON credit_card_invoices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update credit_card_invoices" ON credit_card_invoices
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete credit_card_invoices" ON credit_card_invoices
  FOR DELETE TO authenticated USING (true);

-- Políticas para credit_card_transactions
CREATE POLICY "Authenticated users can view all credit_card_transactions" ON credit_card_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert credit_card_transactions" ON credit_card_transactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update credit_card_transactions" ON credit_card_transactions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete credit_card_transactions" ON credit_card_transactions
  FOR DELETE TO authenticated USING (true);

-- Políticas para employees
CREATE POLICY "Authenticated users can view all employees" ON employees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert employees" ON employees
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON employees
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete employees" ON employees
  FOR DELETE TO authenticated USING (true);

-- Políticas para timesheet_entries
CREATE POLICY "Authenticated users can view all timesheet_entries" ON timesheet_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert timesheet_entries" ON timesheet_entries
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update timesheet_entries" ON timesheet_entries
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete timesheet_entries" ON timesheet_entries
  FOR DELETE TO authenticated USING (true);

-- Políticas para extra_hours_summary
CREATE POLICY "Authenticated users can view all extra_hours_summary" ON extra_hours_summary
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extra_hours_summary" ON extra_hours_summary
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update extra_hours_summary" ON extra_hours_summary
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete extra_hours_summary" ON extra_hours_summary
  FOR DELETE TO authenticated USING (true);

-- Políticas para ashby_orders
CREATE POLICY "Authenticated users can view all ashby_orders" ON ashby_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ashby_orders" ON ashby_orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ashby_orders" ON ashby_orders
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete ashby_orders" ON ashby_orders
  FOR DELETE TO authenticated USING (true);

-- Políticas para recorrencias
CREATE POLICY "Authenticated users can view all recorrencias" ON recorrencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recorrencias" ON recorrencias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recorrencias" ON recorrencias
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recorrencias" ON recorrencias
  FOR DELETE TO authenticated USING (true);