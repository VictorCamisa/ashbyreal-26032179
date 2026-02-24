
-- One-time cleanup: remove duplicate recurrent transactions in Feb 2026
-- Keeping the first record (by created_at) and deleting the duplicate
DELETE FROM transactions 
WHERE id IN (
  '43cd0747-d4da-4b4b-956a-8428186534f8',
  '25b8b67b-a220-4d0d-87cd-a98120ae7b86',
  '60d99179-d01f-4813-9eeb-3e02077ced8c',
  '6a437f51-ff8a-4e58-b9c9-ded685043765',
  '1de11088-3251-4ba7-9b53-4cd9dd725248',
  'fcb32d11-a3c4-4701-86fe-bbe60b3477b5',
  '43842317-0826-4c40-ad8b-739b1b9ea390'
);
