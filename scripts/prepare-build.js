const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function prepareForBuild() {
  console.log('🔄 Preparando build...');
  
  try {
    const localChromiumPath = path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium');
    
    // Crear carpeta .local-chromium si no existe
    if (!fs.existsSync(localChromiumPath)) {
      console.log('📁 Creando carpeta .local-chromium...');
      fs.mkdirSync(localChromiumPath, { recursive: true });
    }
    
    console.log('📥 Verificando Chromium local...');
    
    // Verificar si ya existe Chromium en la carpeta local
    const existingDirs = fs.existsSync(localChromiumPath) ? fs.readdirSync(localChromiumPath) : [];
    
    if (existingDirs.length === 0) {
      console.log('⬇️ Instalando Chromium en carpeta local...');
      
      try {
        // Usar el comando npx puppeteer browsers para instalar
        const command = `npx puppeteer browsers install chrome`;
        console.log('Ejecutando:', command);
        
        // Configurar variables de entorno para forzar instalación local
        const env = {
          ...process.env,
          PUPPETEER_CACHE_DIR: localChromiumPath
        };
        
        execSync(command, { 
          stdio: 'inherit', 
          cwd: path.join(__dirname, '..'),
          env: env
        });
        
        console.log('✅ Chromium instalado exitosamente');
        
      } catch (error) {
        console.log('⚠️ Falló instalación con npx, intentando método alternativo...');
        
        // Método alternativo: copiar desde caché global
        await copyFromGlobalCache(localChromiumPath);
      }
      
    } else {
      console.log('✅ Chromium local encontrado');
    }
    
    // Verificar que la estructura esté correcta
    const dirs = fs.readdirSync(localChromiumPath);
    console.log('📂 Contenido de .local-chromium:', dirs);
    
    // Verificar ejecutable
    if (dirs.length > 0) {
      const chromeDir = dirs[0]; // 'chrome'
      const localChromePath = path.join(localChromiumPath, chromeDir);
      
      // Buscar recursivamente el ejecutable
      let execPath = null;
      
      try {
        const findExecutable = (dir) => {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
              // Buscar recursivamente en subdirectorios
              const found = findExecutable(fullPath);
              if (found) return found;
            } else if (item.name === 'chrome.exe') {
              return fullPath;
            }
          }
          return null;
        };
        
        execPath = findExecutable(localChromePath);
        
        if (execPath) {
          console.log('✅ Ejecutable encontrado:', execPath);
        } else {
          console.log('❌ No se encontró chrome.exe');
          
          // Mostrar estructura completa para debug
          const showStructure = (dir, level = 0) => {
            const indent = '  '.repeat(level);
            const items = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const item of items) {
              const fullPath = path.join(dir, item.name);
              console.log(`${indent}${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
              
              if (item.isDirectory() && level < 3) { // Limitar profundidad
                showStructure(fullPath, level + 1);
              }
            }
          };
          
          console.log('📂 Estructura completa encontrada:');
          showStructure(localChromiumPath);
        }
        
      } catch (error) {
        console.log('❌ Error buscando ejecutable:', error.message);
      }
    }
    
    console.log('✅ Preparación completada');
    
  } catch (error) {
    console.error('❌ Error en preparación:', error);
    process.exit(1);
  }
}

async function copyFromGlobalCache(localPath) {
  console.log('📋 Intentando copiar desde caché global...');
  
  // Buscar en ubicaciones comunes del caché de Puppeteer
  const possibleCaches = [
    path.join(require('os').homedir(), '.cache', 'puppeteer'),
    path.join(require('os').homedir(), 'AppData', 'Local', 'ms-playwright'), // A veces se almacena aquí
    path.join(require('os').homedir(), '.cache', 'ms-playwright')
  ];
  
  for (const cacheDir of possibleCaches) {
    if (fs.existsSync(cacheDir)) {
      console.log('🔍 Buscando en:', cacheDir);
      
      try {
        // Buscar carpetas que contengan "chrome"
        const items = fs.readdirSync(cacheDir, { withFileTypes: true });
        const chromeDirs = items.filter(item => 
          item.isDirectory() && item.name.toLowerCase().includes('chrome')
        );
        
        if (chromeDirs.length > 0) {
          const sourceDir = path.join(cacheDir, chromeDirs[0].name);
          const targetDir = path.join(localPath, chromeDirs[0].name);
          
          console.log(`📋 Copiando desde ${sourceDir} a ${targetDir}`);
          
          // Usar robocopy en Windows para copiar recursivamente
          if (process.platform === 'win32') {
            execSync(`robocopy "${sourceDir}" "${targetDir}" /E /NFL /NDL /NJH /NJS /NC /NS /NP`, 
              { stdio: 'pipe' });
          } else {
            execSync(`cp -r "${sourceDir}" "${targetDir}"`);
          }
          
          console.log('✅ Copia completada');
          return;
        }
      } catch (error) {
        console.log('⚠️ Error copiando desde', cacheDir, ':', error.message);
      }
    }
  }
  
  throw new Error('No se pudo encontrar Chromium en el caché global');
}

prepareForBuild();

prepareForBuild();