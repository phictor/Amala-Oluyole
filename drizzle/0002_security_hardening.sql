ALTER TABLE `orders` MODIFY COLUMN `orderType` enum('delivery','pickup','dine_in') NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `serviceFee` decimal(10,2) NOT NULL DEFAULT '0.00';
--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentInitializedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentVerifiedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_paymentReference_unique` UNIQUE (`paymentReference`);
--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD `idempotencyKey` varchar(160) NULL;
--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_idempotency_key_unique` UNIQUE (`idempotencyKey`);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
  `id` int AUTO_INCREMENT NOT NULL,
  `stateHash` varchar(64) NOT NULL,
  `redirectUri` varchar(512) NOT NULL,
  `sessionBindingHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `oauth_states_id` PRIMARY KEY (`id`),
  CONSTRAINT `oauth_states_stateHash_unique` UNIQUE (`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `app_integrity_challenges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nonceHash` varchar(64) NOT NULL,
  `userId` int NOT NULL,
  `platform` enum('android','ios') NOT NULL,
  `operation` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `app_integrity_challenges_id` PRIMARY KEY (`id`),
  CONSTRAINT `app_integrity_challenges_nonceHash_unique` UNIQUE (`nonceHash`)
);
--> statement-breakpoint
CREATE TABLE `refresh_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jtiHash` varchar(64) NOT NULL,
  `openId` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `revokedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `refresh_sessions_id` PRIMARY KEY (`id`),
  CONSTRAINT `refresh_sessions_jtiHash_unique` UNIQUE (`jtiHash`)
);
