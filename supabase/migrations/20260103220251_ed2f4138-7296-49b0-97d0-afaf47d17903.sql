-- Remove import records that failed (0 transactions) to allow reimport
DELETE FROM credit_card_imports 
WHERE file_hash = '404e54de1f4c18d9047641f020912caf' 
AND records_imported = 0;