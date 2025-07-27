const { sql } = require('./lib/db.js');

async function checkMigration() {
  try {
    console.log('Verificando migración...');
    
    // Verificar nuevas tablas
    const userBots = await sql("SELECT COUNT(*) FROM user_bots");
    console.log('✅ Tabla user_bots: OK');
    
    const botConversations = await sql("SELECT COUNT(*) FROM bot_conversations"); 
    console.log('✅ Tabla bot_conversations: OK');
    
    const botMessages = await sql("SELECT COUNT(*) FROM bot_messages");
    console.log('✅ Tabla bot_messages: OK');
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkMigration();
