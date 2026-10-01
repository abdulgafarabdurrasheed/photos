ALTER TABLE "face_system_settings" ALTER COLUMN "suggestion_threshold" SET DEFAULT 0.5;--> statement-breakpoint
CREATE INDEX "media_likes_media_id_idx" ON "media_likes" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "media_likes_user_created_idx" ON "media_likes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_mentions_user_created_idx" ON "media_mentions" USING btree ("user_id","created_at" DESC NULLS LAST);