INSERT INTO user_module_permissions (user_id, module_key, is_visible) VALUES
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'dashboard', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'clientes', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'crm', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'pedidos', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'barris', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'estoque', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'financeiro', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'contabilidade', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'whatsapp', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'suporte', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'marketing', true),
('6b7ceb4f-f28e-4547-a4a6-6103799e4d1f', 'agente-ia', true)
ON CONFLICT (user_id, module_key) DO UPDATE SET is_visible = true;