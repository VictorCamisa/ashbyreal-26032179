
DO $$
DECLARE
  ped RECORD;
  new_tx_id UUID;
  client_name TEXT;
BEGIN
  FOR ped IN 
    SELECT p.id, p.numero_pedido, p.valor_total, p.status, p.data_pedido, p.data_pagamento, p.metodo_pagamento, p.cliente_id
    FROM pedidos p
    WHERE p.transaction_id IS NULL
  LOOP
    SELECT nome INTO client_name FROM clientes WHERE id = ped.cliente_id;
    
    INSERT INTO transactions (description, amount, tipo, status, due_date, payment_date, origin, origin_reference_id, notes, reference_month)
    VALUES (
      'Pedido #' || ped.numero_pedido || ' - ' || COALESCE(client_name, 'Cliente'),
      ped.valor_total,
      'RECEBER'::transaction_type,
      (CASE 
        WHEN ped.status IN ('entregue', 'pago') THEN 'PAGO'
        WHEN ped.status = 'cancelado' THEN 'CANCELADO'
        ELSE 'PREVISTO'
      END)::transaction_status,
      COALESCE(ped.data_pedido::date, CURRENT_DATE),
      CASE WHEN ped.status IN ('entregue', 'pago') THEN COALESCE(ped.data_pagamento::date, ped.data_pedido::date) ELSE NULL END,
      'PEDIDO'::transaction_origin,
      ped.id,
      'Método: ' || COALESCE(ped.metodo_pagamento, 'não informado'),
      DATE_TRUNC('month', COALESCE(ped.data_pedido, now()))::date
    )
    RETURNING id INTO new_tx_id;
    
    UPDATE pedidos SET transaction_id = new_tx_id WHERE id = ped.id;
  END LOOP;
END $$;
