CREATE INDEX "creator_dna_versions_created_by_idx" ON "creator_dna_versions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "exports_requested_by_idx" ON "exports" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "exports_generated_asset_idx" ON "exports" USING btree ("generated_asset_id");--> statement-breakpoint
CREATE INDEX "feedback_events_user_idx" ON "feedback_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_requested_by_idx" ON "generation_jobs" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "memory_candidates_reviewed_by_idx" ON "memory_candidates" USING btree ("reviewed_by_user_id");--> statement-breakpoint
CREATE INDEX "project_versions_created_by_idx" ON "project_versions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "source_assets_uploaded_by_idx" ON "source_assets" USING btree ("uploaded_by_user_id");