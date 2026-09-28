-- Add Check Constraint to ensure stock_actuel is always >= 0
ALTER TABLE "tingredient" ADD CONSTRAINT "tingredient_stock_actuel_check" CHECK ("stock_actuel" >= 0);