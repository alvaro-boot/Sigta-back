import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Alinea el esquema con las entidades actuales: perfiles en `users` y
 * `modality` en tutorías / disponibilidad (faltaban si solo existía Initial + TutoringWorkflow).
 * Corrige el 500 en login cuando TypeORM selecciona columnas inexistentes.
 */
export class SchemaAlignProfileAndModality1750050000000 implements MigrationInterface {
  name = 'SchemaAlignProfileAndModality1750050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const addUserCol = async (name: string, col: TableColumn) => {
      const t = await queryRunner.getTable('users');
      if (t && !t.findColumnByName(name)) {
        await queryRunner.addColumn('users', col);
      }
    };

    await addUserCol(
      'profile_bio',
      new TableColumn({
        name: 'profile_bio',
        type: 'text',
        isNullable: true,
      }),
    );
    await addUserCol(
      'office_location',
      new TableColumn({
        name: 'office_location',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
    await addUserCol(
      'virtual_meeting_url',
      new TableColumn({
        name: 'virtual_meeting_url',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );

    const tr = await queryRunner.getTable('tutoring_requests');
    if (tr && !tr.findColumnByName('modality')) {
      await queryRunner.query(`
        ALTER TABLE \`tutoring_requests\`
        ADD \`modality\` ENUM('VIRTUAL', 'IN_PERSON') NOT NULL DEFAULT 'IN_PERSON'
      `);
    }

    let pa = await queryRunner.getTable('professor_availability');
    if (pa && !pa.findColumnByName('modality')) {
      await queryRunner.query(`
        ALTER TABLE \`professor_availability\`
        ADD \`modality\` ENUM('VIRTUAL', 'IN_PERSON') NOT NULL DEFAULT 'IN_PERSON'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    let pa = await queryRunner.getTable('professor_availability');
    if (pa?.findColumnByName('modality')) {
      await queryRunner.dropColumn('professor_availability', 'modality');
    }
    let tr = await queryRunner.getTable('tutoring_requests');
    if (tr?.findColumnByName('modality')) {
      await queryRunner.dropColumn('tutoring_requests', 'modality');
    }
    for (const col of ['virtual_meeting_url', 'office_location', 'profile_bio']) {
      const users = await queryRunner.getTable('users');
      if (users?.findColumnByName(col)) {
        await queryRunner.dropColumn('users', col);
      }
    }
  }
}
