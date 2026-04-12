
-- Delete related pedido_itens first
DELETE FROM pedido_itens WHERE pedido_id IN (
  'ca840ac7-20bc-44ef-b678-43004183d1be',
  'a3c9be94-bd96-494c-b4e4-24e64bbd9018',
  '9cb8c4c6-5560-47f1-ad0a-7af374bd64e7',
  '216e4f13-7d04-4547-982c-1cdae06703a5',
  'f76216a7-281d-4a4b-9355-5aca9b92fccb'
);

-- Delete related delivery_receipts
DELETE FROM delivery_receipts WHERE pedido_id IN (
  'ca840ac7-20bc-44ef-b678-43004183d1be',
  'a3c9be94-bd96-494c-b4e4-24e64bbd9018',
  '9cb8c4c6-5560-47f1-ad0a-7af374bd64e7',
  '216e4f13-7d04-4547-982c-1cdae06703a5',
  'f76216a7-281d-4a4b-9355-5aca9b92fccb'
);

-- Delete related barril_movimentacoes
DELETE FROM barril_movimentacoes WHERE pedido_id IN (
  'ca840ac7-20bc-44ef-b678-43004183d1be',
  'a3c9be94-bd96-494c-b4e4-24e64bbd9018',
  '9cb8c4c6-5560-47f1-ad0a-7af374bd64e7',
  '216e4f13-7d04-4547-982c-1cdae06703a5',
  'f76216a7-281d-4a4b-9355-5aca9b92fccb'
);

-- Delete the test pedidos
DELETE FROM pedidos WHERE id IN (
  'ca840ac7-20bc-44ef-b678-43004183d1be',
  'a3c9be94-bd96-494c-b4e4-24e64bbd9018',
  '9cb8c4c6-5560-47f1-ad0a-7af374bd64e7',
  '216e4f13-7d04-4547-982c-1cdae06703a5',
  'f76216a7-281d-4a4b-9355-5aca9b92fccb'
);
