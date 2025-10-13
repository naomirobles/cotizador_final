const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadChromium() {
  console.log('🔄 Configurando Chromium para empaquetado...');
  
  const localPath = path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium');
  
  // Crear directorio si no existe
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }
  
  try {
    console.log('⬇️ Instalando Chromium...');
    
    // Configurar variables de entorno
    const env = {
      ...process.env,
      PUPPETEER_CACHE_DIR: localPath,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false'
    };
    
    // Instalar Chromium usando el comando de puppeteer
    execSync('npx puppeteer browsers install chrome', { 
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..'),
      env: env
    });
    
    console.log('✅ Chromium instalado exitosamente');
    
    // Verificar la instalación
    if (fs.existsSync(localPath)) {
      const dirs = fs.readdirSync(localPath);
      console.log('📂 Contenido instalado:', dirs);
      
      if (dirs.length > 0) {
        console.log('✅ Instalación verificada');
      }
    }
    
  } catch (error) {
    console.error('❌ Error instalando Chromium:', error);
    
    // Intentar método alternativo
    console.log('🔄 Intentando método alternativo...');
    try {
      // Reinstalar puppeteer completamente
      execSync('npm uninstall puppeteer && npm install puppeteer', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Puppeteer reinstalado');
    } catch (reinstallError) {
      console.error('❌ Error en reinstalación:', reinstallError);
      process.exit(1);
    }
  }
}

downloadChromium();