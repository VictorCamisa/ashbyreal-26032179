-- Atualizar capacidades dos barris para 10L, 30L e 50L
-- B001-B043: 10L (43 barris)
-- B044-B087: 30L (44 barris)  
-- B088-B130: 50L (43 barris)

UPDATE public.barris
SET capacidade = 10
WHERE codigo BETWEEN 'B001' AND 'B043';

UPDATE public.barris
SET capacidade = 30
WHERE codigo BETWEEN 'B044' AND 'B087';

UPDATE public.barris
SET capacidade = 50
WHERE codigo BETWEEN 'B088' AND 'B130';