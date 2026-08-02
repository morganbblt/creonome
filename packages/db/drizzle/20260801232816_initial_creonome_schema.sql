CREATE TABLE "asset_analyses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source_asset_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"summary" text,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "asset_analyses_status_check" CHECK ("asset_analyses"."status" in ('queued', 'running', 'succeeded', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_dna_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"summary" text NOT NULL,
	"source" text DEFAULT 'onboarding' NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_dna_versions_profile_version_unique" UNIQUE("creator_profile_id","version"),
	CONSTRAINT "creator_dna_versions_version_check" CHECK ("creator_dna_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stage_name" text NOT NULL,
	"handle" text,
	"bio" text,
	"audience_description" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"onboarding_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_profiles_workspace_user_unique" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_accounts_balance_check" CHECK ("credit_accounts"."balance" >= 0),
	CONSTRAINT "credit_accounts_reserved_check" CHECK ("credit_accounts"."reserved" >= 0),
	CONSTRAINT "credit_accounts_available_check" CHECK ("credit_accounts"."reserved" <= "credit_accounts"."balance")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"generation_job_id" uuid,
	"kind" text NOT NULL,
	"balance_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_ledger_nonzero_check" CHECK ("credit_ledger"."balance_delta" <> 0 or "credit_ledger"."reserved_delta" <> 0),
	CONSTRAINT "credit_ledger_kind_check" CHECK ("credit_ledger"."kind" in ('grant', 'reservation', 'commit', 'release', 'purchase', 'adjustment'))
);
--> statement-breakpoint
CREATE TABLE "dna_traits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dna_version_id" uuid NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"confidence" numeric(4, 3),
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dna_traits_version_category_label_unique" UNIQUE("dna_version_id","category","label"),
	CONSTRAINT "dna_traits_confidence_check" CHECK ("dna_traits"."confidence" is null or ("dna_traits"."confidence" >= 0 and "dna_traits"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"generated_asset_id" uuid,
	"format" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"opportunity_id" uuid,
	"project_id" uuid,
	"action" text NOT NULL,
	"rating" integer,
	"comment" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_events_rating_check" CHECK ("feedback_events"."rating" is null or "feedback_events"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "generated_assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"generation_job_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"kind" text NOT NULL,
	"gcs_uri" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint,
	"duration_seconds" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_assets_gcs_uri_unique" UNIQUE("gcs_uri")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"requested_by_user_id" uuid,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_jobs_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "generation_jobs_status_check" CHECK ("generation_jobs"."status" in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "generation_jobs_progress_check" CHECK ("generation_jobs"."progress" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "memory_candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"provider" text DEFAULT 'mem0' NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_candidates_status_check" CHECK ("memory_candidates"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"batch_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"trend_cluster_id" uuid,
	"position" integer NOT NULL,
	"strategy" text NOT NULL,
	"title" text NOT NULL,
	"pitch" text NOT NULL,
	"rationale" text,
	"current_level" text DEFAULT 'idea' NOT NULL,
	"score_overall" integer NOT NULL,
	"score_momentum" integer NOT NULL,
	"score_dna_fit" integer NOT NULL,
	"score_novelty" integer NOT NULL,
	"score_feasibility" integer NOT NULL,
	"score_confidence" text NOT NULL,
	"effort" text NOT NULL,
	"platform" text NOT NULL,
	"estimated_duration_seconds" integer,
	"status" text DEFAULT 'available' NOT NULL,
	"saved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_batch_position_unique" UNIQUE("batch_id","position"),
	CONSTRAINT "opportunities_position_check" CHECK ("opportunities"."position" between 1 and 3),
	CONSTRAINT "opportunities_scores_check" CHECK ("opportunities"."score_overall" between 0 and 100 and "opportunities"."score_momentum" between 0 and 100 and "opportunities"."score_dna_fit" between 0 and 100 and "opportunities"."score_novelty" between 0 and 100 and "opportunities"."score_feasibility" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "opportunity_batches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"kind" text DEFAULT 'daily' NOT NULL,
	"size" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_batches_size_check" CHECK ("opportunity_batches"."size" = 3)
);
--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"level" text NOT NULL,
	"parent_version" integer,
	"change_source" text NOT NULL,
	"change_summary" text NOT NULL,
	"locked_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_versions_project_version_unique" UNIQUE("project_id","version"),
	CONSTRAINT "project_versions_version_check" CHECK ("project_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_level" text DEFAULT 'idea' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_current_version_check" CHECK ("projects"."current_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_version_id" uuid,
	"title" text NOT NULL,
	"hook" text NOT NULL,
	"body" text NOT NULL,
	"call_to_action" text,
	"caption" text,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"display_name" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"access_token_ciphertext" text NOT NULL,
	"refresh_token_ciphertext" text,
	"token_encryption_version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"failure_reason" text,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_connections_provider_account_unique" UNIQUE("provider","external_account_id"),
	CONSTRAINT "social_connections_provider_check" CHECK ("social_connections"."provider" in ('tiktok', 'instagram')),
	CONSTRAINT "social_connections_status_check" CHECK ("social_connections"."status" in ('connected', 'expired', 'revoked', 'error'))
);
--> statement-breakpoint
CREATE TABLE "source_assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"gcs_uri" text NOT NULL,
	"checksum_sha256" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_assets_gcs_uri_unique" UNIQUE("gcs_uri"),
	CONSTRAINT "source_assets_byte_size_check" CHECK ("source_assets"."byte_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storyboard_scenes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"storyboard_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"heading" text NOT NULL,
	"description" text NOT NULL,
	"shot_type" text,
	"voiceover" text,
	"on_screen_text" text,
	"duration_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyboard_scenes_storyboard_position_unique" UNIQUE("storyboard_id","position"),
	CONSTRAINT "storyboard_scenes_position_check" CHECK ("storyboard_scenes"."position" > 0),
	CONSTRAINT "storyboard_scenes_duration_check" CHECK ("storyboard_scenes"."duration_seconds" > 0)
);
--> statement-breakpoint
CREATE TABLE "storyboards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_version_id" uuid,
	"title" text NOT NULL,
	"aspect_ratio" text DEFAULT '9:16' NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"source_id" uuid NOT NULL,
	"cluster_id" uuid,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"region" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_candidates_source_external_unique" UNIQUE("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "trend_clusters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"lifecycle" text DEFAULT 'emerging' NOT NULL,
	"momentum_score" integer NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_clusters_momentum_check" CHECK ("trend_clusters"."momentum_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "trend_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"trend_candidate_id" uuid NOT NULL,
	"metrics" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trend_snapshots_candidate_captured_unique" UNIQUE("trend_candidate_id","captured_at")
);
--> statement-breakpoint
CREATE TABLE "trend_sources" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"auth_user_id" uuid,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"locale" text DEFAULT 'fr-FR' NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"onboarding_status" text DEFAULT 'pending' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_onboarding_status_check" CHECK ("users"."onboarding_status" in ('pending', 'in_progress', 'complete'))
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "workspace_members_role_check" CHECK ("workspace_members"."role" in ('owner', 'admin', 'member', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"auth_organization_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'demo' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_auth_organization_id_unique" UNIQUE("auth_organization_id"),
	CONSTRAINT "workspaces_plan_check" CHECK ("workspaces"."plan" in ('demo', 'free', 'creator', 'studio'))
);
--> statement-breakpoint
ALTER TABLE "asset_analyses" ADD CONSTRAINT "asset_analyses_source_asset_id_source_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."source_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_dna_versions" ADD CONSTRAINT "creator_dna_versions_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_dna_versions" ADD CONSTRAINT "creator_dna_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_workspace_id_credit_accounts_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."credit_accounts"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_generation_job_id_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_traits" ADD CONSTRAINT "dna_traits_dna_version_id_creator_dna_versions_id_fk" FOREIGN KEY ("dna_version_id") REFERENCES "public"."creator_dna_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_generated_asset_id_generated_assets_id_fk" FOREIGN KEY ("generated_asset_id") REFERENCES "public"."generated_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_generation_job_id_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_assets" ADD CONSTRAINT "generated_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD CONSTRAINT "memory_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD CONSTRAINT "memory_candidates_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_candidates" ADD CONSTRAINT "memory_candidates_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_batch_id_opportunity_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."opportunity_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_trend_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("trend_cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_batches" ADD CONSTRAINT "opportunity_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_batches" ADD CONSTRAINT "opportunity_batches_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_project_version_id_project_versions_id_fk" FOREIGN KEY ("project_version_id") REFERENCES "public"."project_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_assets" ADD CONSTRAINT "source_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_assets" ADD CONSTRAINT "source_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_scenes" ADD CONSTRAINT "storyboard_scenes_storyboard_id_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboards" ADD CONSTRAINT "storyboards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboards" ADD CONSTRAINT "storyboards_project_version_id_project_versions_id_fk" FOREIGN KEY ("project_version_id") REFERENCES "public"."project_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_candidates" ADD CONSTRAINT "trend_candidates_source_id_trend_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."trend_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_candidates" ADD CONSTRAINT "trend_candidates_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshots" ADD CONSTRAINT "trend_snapshots_trend_candidate_id_trend_candidates_id_fk" FOREIGN KEY ("trend_candidate_id") REFERENCES "public"."trend_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_analyses_asset_idx" ON "asset_analyses" USING btree ("source_asset_id");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_created_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "creator_dna_versions_profile_idx" ON "creator_dna_versions" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "creator_profiles_workspace_idx" ON "creator_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "creator_profiles_user_idx" ON "creator_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_workspace_created_idx" ON "credit_ledger" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_job_idx" ON "credit_ledger" USING btree ("generation_job_id");--> statement-breakpoint
CREATE INDEX "dna_traits_version_idx" ON "dna_traits" USING btree ("dna_version_id");--> statement-breakpoint
CREATE INDEX "exports_workspace_created_idx" ON "exports" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "exports_project_idx" ON "exports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_events_workspace_created_idx" ON "feedback_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_events_opportunity_idx" ON "feedback_events" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "feedback_events_project_idx" ON "feedback_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generated_assets_job_idx" ON "generated_assets" USING btree ("generation_job_id");--> statement-breakpoint
CREATE INDEX "generated_assets_workspace_created_idx" ON "generated_assets" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "generated_assets_project_idx" ON "generated_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_workspace_status_idx" ON "generation_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "generation_jobs_project_idx" ON "generation_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_candidates_workspace_status_idx" ON "memory_candidates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "memory_candidates_creator_idx" ON "memory_candidates" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "opportunities_workspace_status_idx" ON "opportunities" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "opportunities_creator_idx" ON "opportunities" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "opportunities_cluster_idx" ON "opportunities" USING btree ("trend_cluster_id");--> statement-breakpoint
CREATE INDEX "opportunity_batches_workspace_available_idx" ON "opportunity_batches" USING btree ("workspace_id","available_at");--> statement-breakpoint
CREATE INDEX "opportunity_batches_creator_idx" ON "opportunity_batches" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "project_versions_project_created_idx" ON "project_versions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_workspace_updated_idx" ON "projects" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "projects_creator_idx" ON "projects" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "projects_opportunity_idx" ON "projects" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "scripts_project_idx" ON "scripts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scripts_version_idx" ON "scripts" USING btree ("project_version_id");--> statement-breakpoint
CREATE INDEX "social_connections_workspace_idx" ON "social_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "social_connections_creator_idx" ON "social_connections" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "source_assets_workspace_created_idx" ON "source_assets" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "storyboard_scenes_storyboard_idx" ON "storyboard_scenes" USING btree ("storyboard_id");--> statement-breakpoint
CREATE INDEX "storyboards_project_idx" ON "storyboards" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "storyboards_version_idx" ON "storyboards" USING btree ("project_version_id");--> statement-breakpoint
CREATE INDEX "trend_candidates_source_idx" ON "trend_candidates" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "trend_candidates_cluster_idx" ON "trend_candidates" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "trend_clusters_workspace_lifecycle_idx" ON "trend_clusters" USING btree ("workspace_id","lifecycle");--> statement-breakpoint
CREATE INDEX "trend_snapshots_candidate_idx" ON "trend_snapshots" USING btree ("trend_candidate_id");--> statement-breakpoint
CREATE INDEX "trend_sources_provider_observed_idx" ON "trend_sources" USING btree ("provider","observed_at");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_unique" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_user_idx" ON "workspaces" USING btree ("owner_user_id");