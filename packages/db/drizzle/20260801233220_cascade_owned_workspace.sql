ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;