/**
 * Script para refactorizar FileManager e integrarlo en main.js
 */

const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'main.js');
let content = fs.readFileSync(mainPath, 'utf8');

console.log('🔄 Refactorizando FileManager...\n');

// 1. Agregar importaciones del FileManager refactorizado
const oldImports = `// Productos
const ProductoRepository = require('./src/main/database/repositories/producto.repository');
const ProductoService = require('./src/main/services/producto.service');
const { ProductoValidator, ValidationError: ProductoValidationError } = require('./src/main/utils/producto.validators');`;

const newImports = `// Productos
const ProductoRepository = require('./src/main/database/repositories/producto.repository');
const ProductoService = require('./src/main/services/producto.service');
const { ProductoValidator, ValidationError: ProductoValidationError } = require('./src/main/utils/producto.validators');

// FileManager
const FileSystemRepository = require('./src/main/database/repositories/filesystem.repository');
const FileManagerService = require('./src/main/services/file-manager.service');
const { FileValidator, ValidationError: FileValidationError } = require('./src/main/utils/file.validators');`;

content = content.replace(oldImports, newImports);
console.log('✓ Importaciones agregadas');

// 2. Eliminar la clase FileManager antigua
const fileManagerClassRegex = /\/\/ =============== CLASE FILEMANAGER ===============[\s\S]*?^}/m;
const fileManagerMatch = content.match(fileManagerClassRegex);

if (fileManagerMatch) {
  content = content.replace(fileManagerClassRegex, '// =============== FILEMANAGER REFACTORIZADO (ver src/main/services/file-manager.service.js) ===============');
  console.log('✓ Clase FileManager antigua eliminada');
}

// 3. Actualizar variables globales
const oldVariables = `let mainWindow;
let fileManager;
let cotizacionRepo;
let cotizacionService;
let productoRepo;
let productoService;
const db = new sqlite3.Database('cotizaciones_productos.db');`;

const newVariables = `let mainWindow;
let fileManager;
let fileSystemRepo;
let cotizacionRepo;
let cotizacionService;
let productoRepo;
let productoService;
const db = new sqlite3.Database('cotizaciones_productos.db');`;

content = content.replace(oldVariables, newVariables);
console.log('✓ Variables globales actualizadas');

// 4. Actualizar inicialización en app.whenReady()
const oldInit = `app.whenReady().then(() => {
  // Inicializar gestor de archivos
  fileManager = new FileManager();
  
  // ============ INICIALIZAR MÓDULOS REFACTORIZADOS ============
  cotizacionRepo = new CotizacionRepository(db);
  productoRepo = new ProductoRepository(db);
  
  cotizacionService = new CotizacionService(cotizacionRepo, productoRepo);
  productoService = new ProductoService(productoRepo, cotizacionRepo);
  
  console.log('✓ Módulos de cotizaciones y productos inicializados');
  
  // Limpiar archivos antiguos al iniciar
  fileManager.cleanOldFiles(7);
  
  // Crear ventana
  createWindow();
});`;

const newInit = `app.whenReady().then(async () => {
  // ============ INICIALIZAR MÓDULOS REFACTORIZADOS ============
  
  // Repositorios
  cotizacionRepo = new CotizacionRepository(db);
  productoRepo = new ProductoRepository(db);
  fileSystemRepo = new FileSystemRepository();
  
  // Configurar rutas de archivos
  const appPaths = {
    appData: app.getPath('userData'),
    documents: app.getPath('documents'),
    temp: app.getPath('temp'),
    pdfs: path.join(app.getPath('documents'), 'Cotizador', 'PDFs'),
    images: path.join(app.getPath('userData'), 'images'),
    tempPdfs: path.join(app.getPath('userData'), 'temp_pdfs')
  };
  
  // Servicios
  cotizacionService = new CotizacionService(cotizacionRepo, productoRepo);
  productoService = new ProductoService(productoRepo, cotizacionRepo);
  fileManager = new FileManagerService(fileSystemRepo, appPaths);
  
  console.log('✓ Módulos de cotizaciones, productos y archivos inicializados');
  
  // Limpiar archivos antiguos al iniciar
  try {
    const deletedCount = await fileManager.cleanOldFiles(7);
    if (deletedCount > 0) {
      console.log(\`✓ \${deletedCount} archivos antiguos limpiados\`);
    }
  } catch (error) {
    console.warn('Advertencia al limpiar archivos:', error.message);
  }
  
  // Crear ventana
  createWindow();
});`;

content = content.replace(oldInit, newInit);
console.log('✓ Inicialización actualizada');

// Guardar archivo
fs.writeFileSync(mainPath, content, 'utf8');

console.log('\n✅ FileManager refactorizado e integrado exitosamente!\n');
console.log('Cambios realizados:');
console.log('  ✓ Importaciones de FileSystemRepository, FileManagerService y FileValidator');
console.log('  ✓ Clase FileManager antigua eliminada');
console.log('  ✓ Inicialización actualizada con inyección de dependencias');
console.log('  ✓ fileManager ahora es una instancia de FileManagerService');
console.log('\nEl FileManager refactorizado incluye:');
console.log('  • FileSystemRepository - Operaciones básicas de archivos');
console.log('  • FileValidator - Validación de archivos e imágenes');
console.log('  • FileManagerService - Lógica de negocio');
console.log('\nPrueba la aplicación con: npm start');
