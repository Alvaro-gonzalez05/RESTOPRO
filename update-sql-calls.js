const fs = require('fs');
const path = require('path');

const actionsDir = './app/actions';

// Función para convertir template literals SQL a llamadas de función
function convertSqlQuery(content) {
  // Patrón para encontrar sql`...` con variables
  const sqlPattern = /await sql`([\s\S]*?)`/g;
  
  let updatedContent = content;
  let match;
  
  while ((match = sqlPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const queryContent = match[1];
    
    // Extraer variables usando ${...}
    const variables = [];
    const variablePattern = /\$\{([^}]+)\}/g;
    let varMatch;
    let paramIndex = 1;
    let cleanQuery = queryContent;
    
    while ((varMatch = variablePattern.exec(queryContent)) !== null) {
      variables.push(varMatch[1]);
      cleanQuery = cleanQuery.replace(varMatch[0], `$${paramIndex}`);
      paramIndex++;
    }
    
    // Construir la nueva llamada de función
    const cleanQueryTrimmed = cleanQuery.trim().replace(/\s+/g, ' ');
    let newCall;
    
    if (variables.length === 0) {
      newCall = `await sql(\`${cleanQueryTrimmed}\`)`;
    } else {
      const variableList = variables.join(', ');
      newCall = `await sql(\`${cleanQueryTrimmed}\`, [${variableList}])`;
    }
    
    // Reemplazar en el contenido
    updatedContent = updatedContent.replace(fullMatch, newCall);
  }
  
  // También manejar casos sin await
  const sqlPattern2 = /sql`([\s\S]*?)`/g;
  
  while ((match = sqlPattern2.exec(updatedContent)) !== null) {
    const fullMatch = match[0];
    const queryContent = match[1];
    
    if (fullMatch.includes('await sql(')) continue; // Ya procesado
    
    // Extraer variables usando ${...}
    const variables = [];
    const variablePattern = /\$\{([^}]+)\}/g;
    let varMatch;
    let paramIndex = 1;
    let cleanQuery = queryContent;
    
    while ((varMatch = variablePattern.exec(queryContent)) !== null) {
      variables.push(varMatch[1]);
      cleanQuery = cleanQuery.replace(varMatch[0], `$${paramIndex}`);
      paramIndex++;
    }
    
    // Construir la nueva llamada de función
    const cleanQueryTrimmed = cleanQuery.trim().replace(/\s+/g, ' ');
    let newCall;
    
    if (variables.length === 0) {
      newCall = `sql(\`${cleanQueryTrimmed}\`)`;
    } else {
      const variableList = variables.join(', ');
      newCall = `sql(\`${cleanQueryTrimmed}\`, [${variableList}])`;
    }
    
    // Reemplazar en el contenido
    updatedContent = updatedContent.replace(fullMatch, newCall);
  }
  
  return updatedContent;
}

// Obtener todos los archivos .ts en el directorio actions
function getActionFiles() {
  const files = fs.readdirSync(actionsDir);
  return files.filter(file => file.endsWith('.ts')).map(file => path.join(actionsDir, file));
}

// Procesar cada archivo
function processFiles() {
  const files = getActionFiles();
  console.log(`Procesando ${files.length} archivos...`);
  
  files.forEach(filePath => {
    console.log(`\\nProcesando: ${filePath}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const updatedContent = convertSqlQuery(content);
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✅ Actualizado: ${filePath}`);
      } else {
        console.log(`⏭️ Sin cambios: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error procesando ${filePath}:`, error.message);
    }
  });
  
  console.log('\\n🎉 Procesamiento completado!');
}

// Ejecutar
processFiles();
