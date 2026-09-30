-- =====================================================
-- CERTIFICAÇÃO: colunas que a app ESCREVE vs schema actual
-- Correr no Supabase SQL Editor.
-- Devolve 0 linhas = schema certificado (sem risco de 400
-- por coluna desconhecida nos inserts/updates da app).
-- =====================================================

WITH expected (table_name, column_name) AS (
  VALUES
    -- products (ProductModal / Cigarettes)
    ('products','name'),('products','category'),('products','price'),
    ('products','cost_price'),('products','stock'),('products','internal_id'),
    ('products','type'),('products','recipe'),('products','image'),
    ('products','iva_rate'),('products','fracionavel'),('products','preco_dose'),
    ('products','doses_por_garrafa'),('products','estimated_cost'),
    ('products','daily_stock'),('products','business_id'),
    -- ingredients / stock_movements
    ('ingredients','name'),('ingredients','unit'),('ingredients','stock'),
    ('ingredients','min_stock'),('ingredients','cost_per_unit'),
    ('ingredients','packages'),('ingredients','business_id'),
    ('stock_movements','product_id'),('stock_movements','ingredient_id'),
    ('stock_movements','type'),('stock_movements','quantity'),
    ('stock_movements','reason'),('stock_movements','business_id'),
    -- sales
    ('sales','sale_number'),('sales','items'),('sales','total'),
    ('sales','payment_details'),('sales','table_id'),('sales','table_number'),
    ('sales','table_name'),('sales','table_customer_name'),
    ('sales','customer_id'),('sales','business_id'),
    -- credits / credit_payments
    ('credits','customer_name'),('credits','customer_phone'),
    ('credits','items'),('credits','total'),('credits','amount_paid'),
    ('credits','remaining_balance'),('credits','status'),('credits','notes'),
    ('credits','sale_id'),('credits','business_id'),
    ('credit_payments','credit_id'),('credit_payments','amount'),
    ('credit_payments','payment_method'),('credit_payments','business_id'),
    -- audit_logs
    ('audit_logs','user_id'),('audit_logs','user_name'),('audit_logs','action'),
    ('audit_logs','entity'),('audit_logs','entity_id'),('audit_logs','details'),
    ('audit_logs','business_id'),
    -- business_goals
    ('business_goals','type'),('business_goals','category'),
    ('business_goals','target'),('business_goals','target_label'),
    ('business_goals','period'),('business_goals','business_id'),
    -- user_profiles
    ('user_profiles','name'),('user_profiles','email'),
    ('user_profiles','avatar'),('user_profiles','phone'),
    -- tables / orders / tables_history
    ('tables','name'),('tables','number'),('tables','customer_name'),
    ('tables','status'),('tables','opened_at'),('tables','closed_at'),
    ('tables','current_order_id'),('tables','business_id'),
    ('orders','table_id'),('orders','items'),('orders','status'),
    ('orders','total'),('orders','payment_method'),('orders','business_id'),
    ('tables_history','table_id'),('tables_history','table_number'),
    ('tables_history','table_name'),('tables_history','customer_name'),
    ('tables_history','status'),('tables_history','opened_at'),
    ('tables_history','closed_at'),('tables_history','total_amount'),
    ('tables_history','sale_id'),('tables_history','business_id'),
    -- customers
    ('customers','name'),('customers','phone'),('customers','email'),
    ('customers','birth_date'),('customers','address'),('customers','notes'),
    ('customers','nuit'),('customers','credit_limit'),
    ('customers','current_balance'),('customers','status'),
    ('customers','metadata'),('customers','business_id'),
    -- invoices
    ('invoices','status'),('invoices','cancellation_reason'),
    ('invoices','cancelled_at'),('invoices','printed_count'),
    -- accounts_payable / expense_categories
    ('accounts_payable','category_id'),('accounts_payable','description'),
    ('accounts_payable','amount'),('accounts_payable','due_date'),
    ('accounts_payable','payment_date'),('accounts_payable','status'),
    ('accounts_payable','payment_method'),('accounts_payable','notes'),
    ('accounts_payable','created_by'),('accounts_payable','business_id'),
    ('expense_categories','name'),('expense_categories','description'),
    ('expense_categories','business_id'),
    -- suppliers / purchase_orders / losses
    ('suppliers','contact_person'),('suppliers','email'),('suppliers','phone'),
    ('suppliers','address'),('suppliers','nuit'),('suppliers','payment_terms'),
    ('suppliers','credit_limit'),('suppliers','notes'),('suppliers','active'),
    ('suppliers','business_id'),
    ('purchase_orders','supplier_id'),('purchase_orders','order_number'),
    ('purchase_orders','order_date'),('purchase_orders','expected_delivery'),
    ('purchase_orders','status'),('purchase_orders','items'),
    ('purchase_orders','subtotal'),('purchase_orders','tax'),
    ('purchase_orders','total'),('purchase_orders','notes'),
    ('purchase_orders','created_by'),('purchase_orders','business_id'),
    ('losses','product_id'),('losses','ingredient_id'),('losses','quantity'),
    ('losses','unit'),('losses','reason'),('losses','loss_date'),
    ('losses','notes'),('losses','status'),('losses','business_id'),
    -- shifts
    ('shifts','cashier_id'),('shifts','cashier_name'),
    ('shifts','opening_amount'),('shifts','expected_cash'),
    ('shifts','counted_cash'),('shifts','expected_mpesa'),
    ('shifts','counted_mpesa'),('shifts','expected_emola'),
    ('shifts','counted_emola'),('shifts','expected_card'),
    ('shifts','counted_card'),('shifts','expected_total'),
    ('shifts','counted_total'),('shifts','difference'),('shifts','business_id'),
    -- businesses / business_settings / business_users
    ('businesses','address'),('businesses','phone'),('businesses','nuit'),
    ('businesses','currency'),('businesses','updated_at'),
    ('business_settings','setting_key'),('business_settings','setting_value'),
    ('business_settings','business_id'),
    ('business_users','active'),
    -- print_jobs / printer_settings
    ('print_jobs','job_type'),('print_jobs','reference_id'),
    ('print_jobs','content'),('print_jobs','status'),
    ('print_jobs','printed_at'),('print_jobs','error_message'),
    ('print_jobs','business_id'),
    ('printer_settings','printer_name'),('printer_settings','printer_type'),
    ('printer_settings','char_width'),('printer_settings','connection_type'),
    ('printer_settings','ip_address'),('printer_settings','port'),
    ('printer_settings','is_default'),('printer_settings','active'),
    ('printer_settings','last_test_at'),('printer_settings','business_id')
)
SELECT e.table_name || '.' || e.column_name AS coluna_em_falta
FROM expected e
WHERE to_regclass(format('public.%I', e.table_name)) IS NULL
   OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = e.table_name
          AND c.column_name = e.column_name
      )
ORDER BY 1;

-- Se o resultado estiver vazio: schema certificado (sem colunas
-- desconhecidas nos payloads de escrita da app).
-- Correr docs/sql/fix-campos-auditoria.sql antes de repetir este script
-- (adiciona customers.metadata).