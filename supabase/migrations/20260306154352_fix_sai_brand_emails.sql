-- Fix SAI brand row: replace sentinelaerial.com with correct domains/emails
UPDATE brands
SET reply_to = 'info@faithandharmonyllc.com',
    website  = 'sentinelaerialinspections.com'
WHERE slug = 'sai'
  AND reply_to = 'contact@sentinelaerial.com';
