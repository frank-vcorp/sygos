CREATE TYPE "public"."document_request_status" AS ENUM('SOLICITADA', 'GENERADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."document_request_type" AS ENUM('FACTURA', 'REMISION');--> statement-breakpoint
CREATE TYPE "public"."payment_validation" AS ENUM('PENDIENTE_VALIDACION', 'VALIDADO');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('BORRADOR', 'AUTORIZADA', 'TIMBRADO_FALLIDO', 'CERRADA');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('PENDIENTE_AUTORIZACION', 'AUTORIZADA', 'PROCESADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."vacation_status" AS ENUM('SOLICITADA', 'AUTORIZADA', 'RECHAZADA');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'CANCELACION_PENDIENTE';--> statement-breakpoint
ALTER TYPE "public"."purchase_status" ADD VALUE 'VALIDADA' BEFORE 'CANCELADA';--> statement-breakpoint
CREATE TABLE "customer_credit_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"unapplied_mxn" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"request_type" "document_request_type" NOT NULL,
	"status" "document_request_status" DEFAULT 'SOLICITADA' NOT NULL,
	"quote_id" uuid,
	"invoice_id" uuid,
	"remission_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_stamp_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"success" boolean NOT NULL,
	"external_uuid" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"hours_double" integer DEFAULT 0 NOT NULL,
	"hours_triple" integer DEFAULT 0 NOT NULL,
	"originated_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payable_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"invoice_id" uuid,
	"open_mxn" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gross_mxn" integer NOT NULL,
	"vacation_premium_mxn" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"status" "payroll_run_status" DEFAULT 'BORRADOR' NOT NULL,
	"stamp_error" text,
	"authorized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"description" text NOT NULL,
	"amount_mxn" integer NOT NULL,
	"status" "purchase_order_status" DEFAULT 'PENDIENTE_AUTORIZACION' NOT NULL,
	"authorized_by_user_id" uuid,
	"cancel_reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"open_mxn" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"total_mxn" integer DEFAULT 0 NOT NULL,
	"allows_physical_exit" boolean DEFAULT false NOT NULL,
	"invoice_obligation_remains" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_history_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"stamped_mxn" integer NOT NULL,
	"cash_mxn" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_session_participants" (
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_by_user_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vacation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"business_days" integer NOT NULL,
	"status" "vacation_status" DEFAULT 'SOLICITADA' NOT NULL,
	"requested_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "fiscal_legal_name" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "fiscal_rfc" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "monthly_purchase_budget_mxn" integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "max_direct_purchase_mxn" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "kiosk_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "fixed_salary_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "salary_stamped_mxn" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "salary_cash_mxn" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "quote_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "contract_total_mxn" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "is_free_invoice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "is_intercompany" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "linked_ap_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "facturapi_uuid" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "last_stamp_error" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "requires_cash_policy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "validation_status" "payment_validation" DEFAULT 'PENDIENTE_VALIDACION' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "validated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "purchase_order_id" uuid;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "calendar_month" text NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_balances" ADD CONSTRAINT "customer_credit_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_balances" ADD CONSTRAINT "customer_credit_balances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_remission_id_remissions_id_fk" FOREIGN KEY ("remission_id") REFERENCES "public"."remissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_stamp_attempts" ADD CONSTRAINT "integration_stamp_attempts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_stamp_attempts" ADD CONSTRAINT "integration_stamp_attempts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_originated_by_user_id_users_id_fk" FOREIGN KEY ("originated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overtime_requests" ADD CONSTRAINT "overtime_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_balances" ADD CONSTRAINT "payable_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_balances" ADD CONSTRAINT "payable_balances_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_balances" ADD CONSTRAINT "payable_balances_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_balances" ADD CONSTRAINT "receivable_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_balances" ADD CONSTRAINT "receivable_balances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_balances" ADD CONSTRAINT "receivable_balances_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remissions" ADD CONSTRAINT "remissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_history_entries" ADD CONSTRAINT "salary_history_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_session_participants" ADD CONSTRAINT "test_session_participants_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_session_participants" ADD CONSTRAINT "test_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_credit_balances_unique" ON "customer_credit_balances" USING btree ("company_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_runs_company_week" ON "payroll_runs" USING btree ("company_id","week_key");--> statement-breakpoint
CREATE INDEX "purchase_orders_company_idx" ON "purchase_orders" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_session_participants_unique" ON "test_session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;