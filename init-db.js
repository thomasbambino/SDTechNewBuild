import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const createTables = async () => {
  try {
    await client.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'client',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        user_id INTEGER REFERENCES users(id),
        freshbooks_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        status TEXT DEFAULT 'planning',
        start_date TIMESTAMP WITH TIME ZONE,
        due_date TIMESTAMP WITH TIME ZONE,
        budget DOUBLE PRECISION,
        progress INTEGER DEFAULT 0,
        freshbooks_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT NOT NULL,
        project_id INTEGER REFERENCES projects(id),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        amount DOUBLE PRECISION NOT NULL,
        status TEXT DEFAULT 'pending',
        due_date TIMESTAMP WITH TIME ZONE,
        description TEXT,
        freshbooks_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        project_id INTEGER REFERENCES projects(id),
        client_id INTEGER REFERENCES clients(id),
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create inquiries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        company_name TEXT DEFAULT 'SD Tech Pros',
        logo_path TEXT,
        primary_color TEXT DEFAULT 'hsl(222.2 47.4% 11.2%)',
        theme TEXT DEFAULT 'light',
        radius DOUBLE PRECISION DEFAULT 0.5,
        site_title TEXT DEFAULT 'SD Tech Pros Client Portal',
        site_description TEXT,
        favicon TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create contents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contents (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        content TEXT,
        image_path TEXT,
        "order" INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        details TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create API connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_connections (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        sender_user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Message reads table (per-admin read tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_reads (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id)
      );
    `);

    // Milestones table
    await client.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        notes TEXT,
        image_paths TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Client notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_notes (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add status to users if it doesn't exist
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`);

    // Add freshbooks_url to invoices if it doesn't exist
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS freshbooks_url TEXT;`);

    // Add account_id and business_id to api_connections if they don't exist
    await client.query(`ALTER TABLE api_connections ADD COLUMN IF NOT EXISTS account_id TEXT;`);
    await client.query(`ALTER TABLE api_connections ADD COLUMN IF NOT EXISTS business_id TEXT;`);

    // Add contact columns to settings if they don't exist
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_email TEXT;`);
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_phone TEXT;`);
    await client.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_address TEXT;`);

    // Add a default admin user
    await client.query(`
      INSERT INTO users (username, password, name, email, role)
      VALUES ('admin', '407eb6692bd8b03aa6bd939eea0f7f2b9579a06119499c89030f48480318e345b0efb442af7beef6c9e63f3c3ef79f93cdaa1a2c236866c1fefbe58d672ac821.9c05feca69b307af2084b6bdf6722c1a', 'Admin User', 'admin@sdtechpros.com', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `);

    // Seed default content (only if no content exists)
    const existing = await client.query('SELECT COUNT(*) FROM contents');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO contents (type, title, subtitle, content, image_path, "order", is_active) VALUES
        ('hero', 'SD Tech Pros', 'Your Trusted Technology Partner', 'Get Started', NULL, 0, TRUE),
        ('service', 'Our Services', 'We offer a range of technology solutions to help your business grow and succeed.', NULL, NULL, 0, TRUE),
        ('service', 'Web Development', NULL, 'We build responsive, modern websites and web applications tailored to your business needs.', NULL, 1, TRUE),
        ('service', 'Custom Software', NULL, 'Tailored solutions that automate processes and solve your unique business challenges.', NULL, 2, TRUE),
        ('service', 'IT Consulting', NULL, 'Strategic technology guidance to help your business grow, scale and transform.', NULL, 3, TRUE),
        ('service', 'Data Analytics', NULL, 'Turn your data into actionable insights with our analytics and reporting solutions.', NULL, 4, TRUE),
        ('about', 'About SD Tech Pros', 'We''re a team of passionate technology experts dedicated to helping businesses succeed.', 'Founded in 2015, SD Tech Pros has been providing cutting-edge technology solutions to businesses of all sizes. Our mission is to empower organizations with the tools and expertise they need to thrive in today''s digital landscape.', NULL, 0, TRUE),
        ('testimonial', 'Jane Smith', 'CEO, Acme Corp', 'SD Tech Pros transformed our business with their custom software solution. Their team was professional, responsive, and delivered exactly what we needed.', NULL, 0, TRUE),
        ('testimonial', 'Mike Johnson', 'CTO, TechStart Inc', 'Working with SD Tech Pros was a game-changer for our company. Their web development expertise helped us increase our online presence and grow our customer base.', NULL, 1, TRUE),
        ('testimonial', 'Sarah Williams', 'Operations Director, DataCo', 'The analytics dashboard SD Tech Pros built has given us invaluable insights into our business operations. I highly recommend their services.', NULL, 2, TRUE);
      `);
      console.log('Default content seeded successfully!');
    }

    console.log('Database schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  } finally {
    await client.end();
  }
};

createTables();