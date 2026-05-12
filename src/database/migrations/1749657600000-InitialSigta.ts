import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSigta1749657600000 implements MigrationInterface {
  name = 'InitialSigta1749657600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`role\` enum('STUDENT','PROFESSOR','ADMIN') NOT NULL,
        \`full_name\` varchar(255) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_users_email\` (\`email\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`subjects\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(255) NOT NULL,
        \`code\` varchar(64) NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`professor_subjects\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`professor_user_id\` int NOT NULL,
        \`subject_id\` int NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_professor_subject\` (\`professor_user_id\`, \`subject_id\`),
        CONSTRAINT \`FK_ps_professor\` FOREIGN KEY (\`professor_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_ps_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`professor_availability\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`professor_user_id\` int NOT NULL,
        \`day_of_week\` tinyint UNSIGNED NOT NULL,
        \`start_time\` time NOT NULL,
        \`end_time\` time NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_pa_professor\` FOREIGN KEY (\`professor_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`tutoring_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`student_id\` int NOT NULL,
        \`subject_id\` int NOT NULL,
        \`start_at\` datetime NOT NULL,
        \`end_at\` datetime NOT NULL,
        \`status\` enum('AUTO_ASSIGNED','UNASSIGNED') NOT NULL,
        \`professor_id\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tr_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_tr_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT \`FK_tr_professor\` FOREIGN KEY (\`professor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`system_settings\` (
        \`key\` varchar(191) NOT NULL,
        \`value\` text NOT NULL,
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tutoring_requests\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`professor_availability\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`professor_subjects\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_settings\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`subjects\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
