import { pool, query } from '../src/config/database';
import { logger } from '../src/utils/logger';

// Define default options
const defaultDepartments = [
  { name: 'IT Support', description: 'Handles technical issues and hardware/software support.' },
  { name: 'Customer Service', description: 'Handles customer inquiries and general support.' },
  { name: 'Sales', description: 'Handles sales-related inquiries.' },
  { name: 'Billing', description: 'Handles billing questions and issues.' },
  { name: 'Human Resources', description: 'Handles internal HR matters.' },
];

const defaultTicketTypes = [
  { name: 'Question', description: 'General inquiries or requests for information.' },
  { name: 'Problem/Incident', description: 'Reporting something broken or not working correctly.' },
  { name: 'Feature Request', description: 'Suggesting a new feature or enhancement.' },
  { name: 'Task', description: 'A specific task to be performed.' },
  { name: 'Hardware Issue', description: 'Problems related to physical devices.' },
  { name: 'Software Issue', description: 'Problems related to applications or operating systems.' },
];

const defaultPriorities = [
  { name: 'Low', color: '#4caf50', sla_hours: 48 },
  { name: 'Medium', color: '#2196f3', sla_hours: 24 },
  { name: 'High', color: '#ff9800', sla_hours: 8 },
  { name: 'Urgent', color: '#f44336', sla_hours: 4 }
];

const seedOptions = async () => {
  logger.info('Starting options seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find the first organization to seed data for
    const orgResult = await client.query('SELECT id FROM organizations ORDER BY created_at LIMIT 1');
    if (orgResult.rows.length === 0) {
      logger.error('No organizations found in the database. Please create an organization first.');
      await client.query('ROLLBACK');
      return;
    }
    const organizationId = orgResult.rows[0].id;
    logger.info(`Seeding options for organization ID: ${organizationId}`);

    // Seed Departments
    logger.info('Seeding departments...');
    for (const dept of defaultDepartments) {
      await client.query(
        `INSERT INTO departments (name, description, organization_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [dept.name, dept.description, organizationId]
      );
    }
    logger.info(`Seeded ${defaultDepartments.length} potential departments.`);

    // Seed Ticket Types
    logger.info('Seeding ticket types...');
    for (const type of defaultTicketTypes) {
      await client.query(
        `INSERT INTO ticket_types (name, description, organization_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [type.name, type.description, organizationId]
      );
    }
    logger.info(`Seeded ${defaultTicketTypes.length} potential ticket types.`);

    // Seed Priorities
    logger.info('Seeding priorities...');
    for (const prio of defaultPriorities) {
      await client.query(
        `INSERT INTO ticket_priorities (name, color, sla_hours, organization_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name, organization_id) DO NOTHING`,
        [prio.name, prio.color, prio.sla_hours, organizationId]
      );
    }
    logger.info(`Seeded ${defaultPriorities.length} potential priorities.`);

    // Note: Default Statuses and Priorities are usually added via `addDefaultsForOrganization` in auth.controller
    // If those are missing, you might need to adapt that logic here or re-run organization creation.

    await client.query('COMMIT');
    logger.info('Options seeding completed successfully.');

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error during options seeding:', error);
    throw error; // Re-throw error to indicate failure
  } finally {
    client.release();
  }
};

// Run the seeding function
seedOptions()
  .then(() => {
    logger.info('Seeding script finished.');
    pool.end(); // Close the pool after seeding is done
  })
  .catch((error) => {
    logger.error('Seeding script failed:', error);
    pool.end(); // Ensure pool is closed on error
    process.exit(1); // Exit with error code
  });
