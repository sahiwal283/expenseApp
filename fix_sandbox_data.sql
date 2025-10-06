-- Fix expense amounts to be proper numeric values
UPDATE expenses 
SET amount = CAST(amount AS NUMERIC(10,2))
WHERE amount IS NOT NULL;

-- Verify the fix
SELECT id, amount, category, status FROM expenses LIMIT 5;

