// scripts/verify-package.js
// node scripts/verify-package.js
const fs = require('fs');
const path = require('path');

function verifyPackage() {
  const outPath = path.join(__dirname, '..', 'out');
  
  if (!fs.existsSync(outPath)) {
    console.log('❌ Carpeta out no existe');
    return;
  }
  
  // Buscar la aplicación empaquetada
  const findApp = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const fullPath = path.join(dir, item.name);
        
        if (item.name.includes('cotizador')) {
          console.log('📱 App encontrada:', fullPath);
          
          // Verificar recursos
          const resourcesPath = path.join(fullPath, 'resources');
          if (fs.existsSync(resourcesPath)) {
            console.log('📂 Resources existe');
            
            // Listar contenido de resources
            const resources = fs.readdirSync(resourcesPath);
            console.log('📋 Contenido de resources:', resources);
            
            // Buscar output.css
            const appPath = path.join(resourcesPath, 'app');
            if (fs.existsSync(appPath)) {
              const cssPath = path.join(appPath, 'output.css');
              console.log('🎨 CSS existe:', fs.existsSync(cssPath));
            }
          }
        } else {
          findApp(fullPath);
        }
      }
    }
  };
  
  findApp(outPath);
}

verifyPackage();