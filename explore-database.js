#!/usr/bin/env node

const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false, ca: undefined }
});

class DatabaseExplorer {
  constructor() {
    this.results = {
      tables: [],
      relationships: [],
      sampleData: {},
      statistics: {},
      structure: {}
    };
  }

  async explore() {
    console.log('🔍 Starting database exploration...\n');
    
    try {
      await this.getTables();
      await this.getTableStructures();
      await this.getRelationships();
      await this.getSampleData();
      await this.getStatistics();
      await this.generateReport();
      
      console.log('✅ Database exploration completed successfully!');
      console.log('📄 Report saved to: database-structure-report.json');
      console.log('📋 Readable report saved to: database-structure-report.md');
      
    } catch (error) {
      console.error('❌ Error during exploration:', error.message);
    } finally {
      await pool.end();
    }
  }

  async getTables() {
    console.log('📋 Retrieving all tables...');
    
    const query = `
      SELECT 
        schemaname as schema_name,
        tablename as table_name,
        tableowner as owner
      FROM pg_tables 
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename;
    `;
    
    const result = await pool.query(query);
    this.results.tables = result.rows;
    
    console.log(`Found ${result.rows.length} tables:`);
    result.rows.forEach(table => {
      console.log(`  - ${table.schema_name}.${table.table_name}`);
    });
    console.log('');
  }

  async getTableStructures() {
    console.log('🏗️  Analyzing table structures...');
    
    for (const table of this.results.tables) {
      const tableName = table.table_name;
      const schemaName = table.schema_name;
      
      console.log(`  Analyzing: ${schemaName}.${tableName}`);
      
      const query = `
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      
      const result = await pool.query(query, [schemaName, tableName]);
      this.results.structure[`${schemaName}.${tableName}`] = result.rows;
    }
    console.log('');
  }

  async getRelationships() {
    console.log('🔗 Mapping table relationships...');
    
    const query = `
      SELECT
        tc.table_schema as source_schema,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_schema as target_schema,
        ccu.table_name as target_table,
        ccu.column_name as target_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    
    const result = await pool.query(query);
    this.results.relationships = result.rows;
    
    console.log(`Found ${result.rows.length} foreign key relationships:`);
    result.rows.forEach(rel => {
      console.log(`  - ${rel.source_schema}.${rel.source_table}.${rel.source_column} → ${rel.target_schema}.${rel.target_table}.${rel.target_column}`);
    });
    console.log('');
  }

  async getSampleData() {
    console.log('📊 Collecting sample data...');
    
    for (const table of this.results.tables) {
      const tableName = table.table_name;
      const schemaName = table.schema_name;
      const fullTableName = `"${schemaName}"."${tableName}"`;
      
      try {
        console.log(`  Sampling: ${schemaName}.${tableName}`);
        
        // Get first 5 rows as sample
        const sampleQuery = `SELECT * FROM ${fullTableName} LIMIT 5`;
        const sampleResult = await pool.query(sampleQuery);
        
        this.results.sampleData[`${schemaName}.${tableName}`] = sampleResult.rows;
        
      } catch (error) {
        console.log(`    ⚠️  Could not sample ${tableName}: ${error.message}`);
        this.results.sampleData[`${schemaName}.${tableName}`] = [];
      }
    }
    console.log('');
  }

  async getStatistics() {
    console.log('📈 Gathering table statistics...');
    
    for (const table of this.results.tables) {
      const tableName = table.table_name;
      const schemaName = table.schema_name;
      const fullTableName = `"${schemaName}"."${tableName}"`;
      
      try {
        console.log(`  Stats for: ${schemaName}.${tableName}`);
        
        const countQuery = `SELECT COUNT(*) as row_count FROM ${fullTableName}`;
        const countResult = await pool.query(countQuery);
        
        this.results.statistics[`${schemaName}.${tableName}`] = {
          row_count: parseInt(countResult.rows[0].row_count),
          columns: this.results.structure[`${schemaName}.${tableName}`].length
        };
        
        console.log(`    Rows: ${countResult.rows[0].row_count}`);
        
      } catch (error) {
        console.log(`    ⚠️  Could not get stats for ${tableName}: ${error.message}`);
        this.results.statistics[`${schemaName}.${tableName}`] = {
          row_count: 'N/A',
          columns: this.results.structure[`${schemaName}.${tableName}`].length
        };
      }
    }
    console.log('');
  }

  async generateReport() {
    console.log('📝 Generating reports...');
    
    // Save JSON report
    const jsonReport = {
      generated_at: new Date().toISOString(),
      database_info: {
        total_tables: this.results.tables.length,
        total_relationships: this.results.relationships.length
      },
      ...this.results
    };
    
    fs.writeFileSync('database-structure-report.json', JSON.stringify(jsonReport, null, 2));
    
    // Generate Markdown report
    let mdReport = this.generateMarkdownReport();
    fs.writeFileSync('database-structure-report.md', mdReport);
    
    // Generate chatbot context file
    let contextReport = this.generateChatbotContext();
    fs.writeFileSync('chatbot-database-context.md', contextReport);
    
    console.log('📋 Additional file created: chatbot-database-context.md (optimized for AI context)');
  }

  generateMarkdownReport() {
    let md = `# Database Structure Report\n\n`;
    md += `Generated on: ${new Date().toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Tables**: ${this.results.tables.length}\n`;
    md += `- **Total Relationships**: ${this.results.relationships.length}\n\n`;

    // Tables Overview
    md += `## Tables Overview\n\n`;
    this.results.tables.forEach(table => {
      const key = `${table.schema_name}.${table.table_name}`;
      const stats = this.results.statistics[key];
      md += `### ${table.table_name}\n`;
      md += `- **Schema**: ${table.schema_name}\n`;
      md += `- **Rows**: ${stats?.row_count || 'N/A'}\n`;
      md += `- **Columns**: ${stats?.columns || 'N/A'}\n\n`;
      
      // Table structure
      md += `#### Structure\n`;
      md += `| Column | Type | Nullable | Default |\n`;
      md += `|--------|------|----------|----------|\n`;
      
      const structure = this.results.structure[key] || [];
      structure.forEach(col => {
        md += `| ${col.column_name} | ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} | ${col.is_nullable} | ${col.column_default || 'NULL'} |\n`;
      });
      
      md += `\n`;
      
      // Sample data
      const sampleData = this.results.sampleData[key];
      if (sampleData && sampleData.length > 0) {
        md += `#### Sample Data (First 5 rows)\n`;
        const columns = Object.keys(sampleData[0]);
        md += `| ${columns.join(' | ')} |\n`;
        md += `| ${columns.map(() => '---').join(' | ')} |\n`;
        
        sampleData.forEach(row => {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string' && val.length > 50) return val.substring(0, 47) + '...';
            return String(val);
          });
          md += `| ${values.join(' | ')} |\n`;
        });
        md += `\n`;
      }
    });

    // Relationships
    md += `## Relationships\n\n`;
    if (this.results.relationships.length > 0) {
      md += `| Source Table | Source Column | Target Table | Target Column |\n`;
      md += `|--------------|---------------|--------------|---------------|\n`;
      
      this.results.relationships.forEach(rel => {
        md += `| ${rel.source_table} | ${rel.source_column} | ${rel.target_table} | ${rel.target_column} |\n`;
      });
    } else {
      md += `No foreign key relationships found.\n`;
    }

    return md;
  }

  generateChatbotContext() {
    let context = `# Database Context for Chatbot Development\n\n`;
    context += `This file contains the essential database information needed for chatbot implementation.\n\n`;
    
    // Key tables for chatbot
    const keyTables = this.results.tables.filter(t => 
      t.table_name.includes('user') || 
      t.table_name.includes('business') ||
      t.table_name.includes('product') ||
      t.table_name.includes('menu') ||
      t.table_name.includes('order') ||
      t.table_name.includes('customer') ||
      t.table_name.includes('chatbot') ||
      t.table_name.includes('bot') ||
      t.table_name.includes('message') ||
      t.table_name.includes('conversation') ||
      t.table_name.includes('category') ||
      t.table_name.includes('item')
    );

    context += `## Key Tables for Chatbot (${keyTables.length} found)\n\n`;
    
    keyTables.forEach(table => {
      const key = `${table.schema_name}.${table.table_name}`;
      const stats = this.results.statistics[key];
      const structure = this.results.structure[key] || [];
      
      context += `### ${table.table_name}\n`;
      context += `**Purpose**: [Table for ${table.table_name.replace(/_/g, ' ')}]\n`;
      context += `**Rows**: ${stats?.row_count || 'N/A'}\n\n`;
      
      context += `**Key Columns**:\n`;
      structure.forEach(col => {
        context += `- \`${col.column_name}\` (${col.data_type}) - ${col.is_nullable === 'NO' ? 'Required' : 'Optional'}\n`;
      });
      context += `\n`;
    });

    // Add relationships relevant to chatbot
    context += `## Important Relationships\n\n`;
    const relevantRels = this.results.relationships.filter(rel => 
      keyTables.some(t => t.table_name === rel.source_table || t.table_name === rel.target_table)
    );

    relevantRels.forEach(rel => {
      context += `- ${rel.source_table}.${rel.source_column} → ${rel.target_table}.${rel.target_column}\n`;
    });

    context += `\n## Recommendations for Chatbot\n\n`;
    context += `Based on the database structure, consider implementing:\n\n`;
    
    if (keyTables.some(t => t.table_name.includes('product') || t.table_name.includes('menu'))) {
      context += `1. **Menu/Product Queries**: Use product/menu tables for showing available items\n`;
    }
    
    if (keyTables.some(t => t.table_name.includes('order'))) {
      context += `2. **Order Processing**: Integrate with existing order tables\n`;
    }
    
    if (keyTables.some(t => t.table_name.includes('customer'))) {
      context += `3. **Customer Management**: Link conversations to customer records\n`;
    }
    
    context += `4. **Missing Tables**: Consider adding reservations table if not present\n`;
    context += `5. **Bot Configuration**: Store bot settings per business/restaurant\n`;

    return context;
  }
}

// Main execution
async function main() {
  const explorer = new DatabaseExplorer();
  await explorer.explore();
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseExplorer;