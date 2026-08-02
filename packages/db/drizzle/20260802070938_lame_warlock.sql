CREATE TABLE "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_deletion_requests_status_check" CHECK ("account_deletion_requests"."status" in ('scheduled', 'cancelled', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "privacy_preferences" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"model_training_opt_in" boolean DEFAULT false NOT NULL,
	"keep_rushes_after_export" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_preferences" ADD CONSTRAINT "privacy_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_preferences" ADD CONSTRAINT "privacy_preferences_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_requests_workspace_status_idx" ON "account_deletion_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "account_deletion_requests_one_scheduled_idx" ON "account_deletion_requests" USING btree ("workspace_id") WHERE "account_deletion_requests"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "account_deletion_requests_requested_by_idx" ON "account_deletion_requests" USING btree ("requested_by_user_id");