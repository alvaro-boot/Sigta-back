import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Flujo de estados (confirmación docente), cancelación/reprogramación,
 * tema del estudiante y ventana configurable (clave tutoring_cancel_min_hours_before).
 */
export class TutoringWorkflow1749950000000 implements MigrationInterface {
  name = 'TutoringWorkflow1749950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('tutoring_requests');
    if (!table) return;

    const addCol = async (name: string, col: TableColumn) => {
      table = await queryRunner.getTable('tutoring_requests');
      if (!table?.findColumnByName(name)) {
        await queryRunner.addColumn('tutoring_requests', col);
      }
    };

    await addCol(
      'student_topic',
      new TableColumn({
        name: 'student_topic',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
    await addCol(
      'cancelled_at',
      new TableColumn({
        name: 'cancelled_at',
        type: 'datetime',
        isNullable: true,
      }),
    );
    await addCol(
      'cancel_reason',
      new TableColumn({
        name: 'cancel_reason',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
    await addCol(
      'confirmed_at',
      new TableColumn({
        name: 'confirmed_at',
        type: 'datetime',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      ALTER TABLE \`tutoring_requests\`
      MODIFY COLUMN \`status\` ENUM(
        'UNASSIGNED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED',
        'AUTO_ASSIGNED'
      ) NOT NULL
    `);
    await queryRunner.query(`
      UPDATE \`tutoring_requests\`
      SET \`status\` = 'PENDING_CONFIRMATION'
      WHERE \`status\` = 'AUTO_ASSIGNED'
    `);
    await queryRunner.query(`
      ALTER TABLE \`tutoring_requests\`
      MODIFY COLUMN \`status\` ENUM(
        'UNASSIGNED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('tutoring_requests');
    if (!table) return;

    await queryRunner.query(`
      ALTER TABLE \`tutoring_requests\`
      MODIFY COLUMN \`status\` ENUM(
        'UNASSIGNED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED',
        'AUTO_ASSIGNED'
      ) NOT NULL
    `);
    await queryRunner.query(`
      UPDATE \`tutoring_requests\`
      SET \`status\` = 'AUTO_ASSIGNED'
      WHERE \`status\` IN ('PENDING_CONFIRMATION','CONFIRMED')
    `);
    await queryRunner.query(`
      UPDATE \`tutoring_requests\`
      SET \`status\` = 'UNASSIGNED'
      WHERE \`status\` IN ('CANCELLED','COMPLETED')
    `);
    await queryRunner.query(`
      ALTER TABLE \`tutoring_requests\`
      MODIFY COLUMN \`status\` ENUM('AUTO_ASSIGNED','UNASSIGNED') NOT NULL
    `);

    for (const col of [
      'confirmed_at',
      'cancel_reason',
      'cancelled_at',
      'student_topic',
    ]) {
      table = await queryRunner.getTable('tutoring_requests');
      if (table?.findColumnByName(col)) {
        await queryRunner.dropColumn('tutoring_requests', col);
      }
    }
  }
}
