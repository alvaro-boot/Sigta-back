import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsAppNotifications1750200000000 implements MigrationInterface {
  name = 'WhatsAppNotifications1750200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`whatsapp_phone\` varchar(20) NULL,
      ADD COLUMN \`whatsapp_notify_enabled\` tinyint NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      CREATE TABLE \`scheduled_notifications\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`tutoring_request_id\` int NULL,
        \`recipient_user_id\` int NOT NULL,
        \`type\` varchar(64) NOT NULL,
        \`send_at\` datetime NOT NULL,
        \`sent_at\` datetime NULL,
        \`cancelled\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_scheduled_notifications_due\` (\`send_at\`, \`sent_at\`, \`cancelled\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`scheduled_notifications\``);
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`whatsapp_notify_enabled\`,
      DROP COLUMN \`whatsapp_phone\`
    `);
  }
}
