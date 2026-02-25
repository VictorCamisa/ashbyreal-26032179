UPDATE documentos_fiscais 
SET pdf_url = 'https://api.focusnfe.com.br' || pdf_url 
WHERE pdf_url IS NOT NULL 
  AND pdf_url NOT LIKE 'http%';