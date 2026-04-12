
-- Fix legacy imported order items where quantity = total liters instead of number of barrels
DO $$
DECLARE
  r RECORD;
  regex_match TEXT[];
  parsed_qty INTEGER;
  new_unit_price NUMERIC;
BEGIN
  FOR r IN
    SELECT pi.id AS item_id, pi.quantidade, pi.subtotal, pi.preco_unitario,
           p.valor_total, p.observacoes, p.numero_pedido
    FROM pedido_itens pi
    JOIN pedidos p ON p.id = pi.pedido_id
    WHERE p.observacoes ~ '\d+\s*x\s*\d+'
      AND pi.quantidade > 20
  LOOP
    regex_match := regexp_match(r.observacoes, '(\d+)\s*x\s*(\d+)');
    IF regex_match IS NOT NULL THEN
      parsed_qty := (regex_match[1])::INTEGER;
      IF parsed_qty > 0 AND parsed_qty < r.quantidade THEN
        new_unit_price := ROUND(r.valor_total / parsed_qty, 2);
        UPDATE pedido_itens
        SET quantidade = parsed_qty,
            preco_unitario = new_unit_price,
            subtotal = r.valor_total
        WHERE id = r.item_id;
      END IF;
    END IF;
  END LOOP;
END $$;
