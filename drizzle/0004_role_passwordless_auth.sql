CREATE TABLE `login_challenges` (
	`id` varchar(36) NOT NULL,
	`channel` enum('email','phone') NOT NULL,
	`destination` varchar(320) NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','admin','rider','kitchen','manager','finance','staff') NOT NULL DEFAULT 'customer';