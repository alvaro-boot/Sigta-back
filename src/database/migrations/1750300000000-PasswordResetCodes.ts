import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetCodes1750300000000 implements MigrationInterface {
  name = 'PasswordResetCodes1750300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`password_reset_codes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`code_hash\` varchar(255) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`used_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_password_reset_user_active\` (\`user_id\`, \`used_at\`, \`expires_at\`),
        CONSTRAINT \`FK_password_reset_user\` FOREIGN KEY (\`user_id\`)
          REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`password_reset_codes\``);
  }
}
