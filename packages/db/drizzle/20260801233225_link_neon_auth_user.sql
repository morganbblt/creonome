ALTER TABLE "public"."users"
ADD CONSTRAINT "users_auth_user_id_neon_auth_user_id_fk"
FOREIGN KEY ("auth_user_id")
REFERENCES "neon_auth"."user"("id")
ON DELETE cascade
ON UPDATE no action;
