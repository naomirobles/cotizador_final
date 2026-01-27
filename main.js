const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// SQLITE 
const sqlite3 = require('sqlite3').verbose();

// MÓDULO GENERADOR DE PDF
const pdfGenerator = require('./pdf-generator');

// ============ IMPORTAR MÓDULOS REFACTORIZADOS ============
// Cotizaciones
const CotizacionRepository = require('./src/main/database/repositories/cotizacion.repository');
const CotizacionService = require('./src/main/services/cotizacion.service');
const { CotizacionValidator, ValidationError } = require('./src/main/utils/cotizacion.validators');

// Productos
const ProductoRepository = require('./src/main/database/repositories/producto.repository');
const ProductoService = require('./src/main/services/producto.service');
const { ProductoValidator, ValidationError: ProductoValidationError } = require('./src/main/utils/producto.validators');

// FileManager
const FileSystemRepository = require('./src/main/database/repositories/filesystem.repository');
const FileManagerService = require('./src/main/services/file-manager.service');
const { FileValidator, ValidationError: FileValidationError } = require('./src/main/utils/file.validators');

// ✨ NUEVOS SERVICIOS REFACTORIZADOS
const PDFService = require('./src/main/services/pdf.service');
const ExcelService = require('./src/main/services/excel.service');
const formatters = require('./src/main/utils/formatters');
const imageHelpers = require('./src/main/utils/image-helpers');

// =============== FILEMANAGER REFACTORIZADO (ver src/main/services/file-manager.service.js) ===============

// =============== VARIABLES GLOBALES ===============
let mainWindow;
let fileManager;
let fileSystemRepo;
let cotizacionRepo;
let cotizacionService;
let productoRepo;
let productoService;
let pdfService;
let excelService;
const db = new sqlite3.Database('cotizaciones_productos.db');

// =============== INICIALIZACIÓN ===============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon:'assets/icon.png',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Cotizaciones (
      id_cotizacion INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa TEXT NOT NULL,
      fecha TEXT NOT NULL,
      nombre_contacto TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT NOT NULL,
      proyecto_servicio TEXT NOT NULL,
      ordenar TEXT DEFAULT ('id_desc'),
      terminos_condiciones TEXT DEFAULT ('El tiempo de entrega es de 2 días hábiles contados a partir de la autorización correspondiente y de la recepción del anticipo correspondiente.
                La forma de pago es 50% de anticipo y 50% contra entrega del material terminado')
    )`);
      
  db.run(`
    CREATE TABLE IF NOT EXISTS Productos(
      id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cotizacion INTEGER NOT NULL,
      nombre_producto TEXT NOT NULL,
      precio_unitario REAL NOT NULL, 
      concepto TEXT NOT NULL,
      unidades INTEGER NOT NULL,
      imagen TEXT,
      orden INTEGER DEFAULT 0,
      FOREIGN KEY(id_cotizacion) REFERENCES Cotizaciones(id_cotizacion)
    )`);
});

app.whenReady().then(async () => {
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
  
  // Servicios base
  cotizacionService = new CotizacionService(cotizacionRepo, productoRepo);
  productoService = new ProductoService(productoRepo, cotizacionRepo);
  fileManager = new FileManagerService(fileSystemRepo, appPaths);
  
  // ✨ Servicios nuevos refactorizados
  pdfService = new PDFService(db, fileManager, pdfGenerator, formatters, imageHelpers);
  excelService = new ExcelService();
  
  console.log('✓ Módulos de cotizaciones, productos, archivos, PDF y Excel inicializados');
  
  // Limpiar archivos antiguos al iniciar
  try {
    const deletedCount = await fileManager.cleanOldFiles(7);
    if (deletedCount > 0) {
      console.log(`✓ ${deletedCount} archivos antiguos limpiados`);
    }
  } catch (error) {
    console.warn('Advertencia al limpiar archivos:', error.message);
  }
  
  // Crear ventana
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// =============== IPC HANDLERS PARA COTIZACIONES (REFACTORIZADOS) ===============

ipcMain.handle('obtener-cotizaciones', async () => {
  try {
    const cotizaciones = await cotizacionService.getAll('fecha DESC');
    return cotizaciones; // Mantener compatibilidad con frontend
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    throw error;
  }
});

ipcMain.handle('obtener-cotizacion-id', async (event, id) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    const cotizacion = await cotizacionService.getById(numericId);
    return cotizacion;
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    throw error;
  }
});

ipcMain.handle('agregar-cotizacion', async (event, empresa, fecha, nombre_contacto, telefono, email, proyecto_servicio, ordenar, terminos_condiciones) => {
  try {
    const cotizacionData = {
      empresa,
      fecha,
      nombre_contacto,
      telefono,
      email,
      proyecto_servicio,
      ordenar,
      terminos_condiciones
    };
    
    const id = await cotizacionService.create(cotizacionData);
    return id;
  } catch (error) {
    console.error('Error al agregar cotización:', error);
    
    if (error instanceof ValidationError) {
      throw new Error(`Validación fallida: ${error.message}`);
    }
    
    throw error;
  }
});

ipcMain.handle('eliminar-cotizacion', async (event, id) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    await cotizacionService.delete(numericId);
    return numericId;
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    throw error;
  }
});

ipcMain.handle('actualizar-cotizacion', async (event, empresa, fecha, nombre_contacto, telefono, email, proyecto_servicio, ordenar, terminos_condiciones, id_cotizacion) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id_cotizacion);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    const cotizacionData = {
      empresa,
      fecha,
      nombre_contacto,
      telefono,
      email,
      proyecto_servicio,
      ordenar,
      terminos_condiciones
    };
    
    const changes = await cotizacionService.update(numericId, cotizacionData);
    return changes;
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    
    if (error instanceof ValidationError) {
      throw new Error(`Validación fallida: ${error.message}`);
    }
    
    throw error;
  }
});

// =============== IPC HANDLERS PARA PRODUCTOS (REFACTORIZADOS) ===============

ipcMain.handle('agregar-producto', async (event, cotizacionId, nombreProducto, precio, concepto, unidades, imagen, orden) => {
  try {
    const productoData = {
      id_cotizacion: parseInt(cotizacionId),
      nombre_producto: nombreProducto,
      precio_unitario: parseFloat(precio),
      concepto,
      unidades: parseInt(unidades),
      imagen,
      orden: parseInt(orden) || 0
    };
    
    const id = await productoService.create(productoData);
    return id;
  } catch (error) {
    console.error('Error al agregar producto:', error);
    
    if (error instanceof ProductoValidationError) {
      throw new Error(`Validación fallida: ${error.message}`);
    }
    
    throw error;
  }
});

ipcMain.handle('obtener-productos', async (event, id_cotizacion) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id_cotizacion);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    const productos = await productoService.getByCotizacionId(numericId, 'orden ASC');
    return productos;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
});

ipcMain.handle('obtener-producto-id', async (event, id) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error('ID de producto inválido');
    }
    
    const producto = await productoService.getById(numericId);
    return producto;
  } catch (error) {
    console.error('Error al obtener producto:', error);
    throw error;
  }
});

ipcMain.handle('eliminar-productos-cotizacion', async (event, id_cotizacion) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id_cotizacion);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    const changes = await productoService.deleteByCotizacionId(numericId);
    return changes;
  } catch (error) {
    console.error('Error al eliminar productos:', error);
    throw error;
  }
});

ipcMain.handle('obtener-cotizacion-completa', async (event, id_cotizacion) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Cotizaciones WHERE id_cotizacion = ?`, [id_cotizacion], (err, cotizacion) => {
            if (err) {
                reject(err);
                return;
            }
            
            db.all(`SELECT * FROM Productos WHERE id_cotizacion = ? ORDER BY orden ASC`, [id_cotizacion], (err, productos) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                let subtotal = 0;
                productos.forEach(producto => {
                    subtotal += (producto.unidades * producto.precio_unitario);
                });
                
                const iva = subtotal * 0.16;
                const total = subtotal + iva;
                
                const datosCompletos = {
                    cotizacion,
                    productos,
                    subtotal: subtotal.toFixed(2),
                    iva: iva.toFixed(2),
                    total: total.toFixed(2),
                    totalEnLetras: numeroALetras(total)
                };
                
                resolve(datosCompletos);
            });
        });
    });
});

ipcMain.handle('copiar-cotizacion', async (event, id_cotizacion) => {
  try {
    // Convertir ID a número si viene como string
    const numericId = parseInt(id_cotizacion);
    if (isNaN(numericId)) {
      throw new Error('ID de cotización inválido');
    }
    
    const nuevoId = await cotizacionService.copy(numericId);
    return { success: true, nuevoId };
  } catch (error) {
    console.error('Error al copiar cotización:', error);
    return { success: false, error: error.message };
  }
});

// =============== IPC HANDLERS PARA IMÁGENES (MEJORADOS) ===============
ipcMain.handle('select-image', async () => {
  try {
    console.log('Iniciando selección de imagen...');
    
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar imagen',
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    console.log('Resultado del dialog:', result);

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      
      console.log('Archivo seleccionado:', filePath);

      // Verificar que el archivo origen existe
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo seleccionado no existe');
      }

      // Copiar archivo al directorio de imágenes usando FileManager
      try {
        const fileName = await fileManager.copyImageToWorkspace(filePath);
        console.log('Imagen copiada exitosamente:', fileName);
        return { success: true, fileName: fileName };
      } catch (copyError) {
        console.error('Error al copiar imagen:', copyError);
        throw new Error('Error al copiar la imagen: ' + copyError.message);
      }
    }

    console.log('No se seleccionó ninguna imagen');
    return { success: false, fileName: null };
  } catch (error) {
    console.error('Error en select-image:', error);
    return { success: false, error: error.message };
  }
});

// Obtener ruta completa de imagen 
ipcMain.handle('get-image-path', (event, fileName) => {
  const imagePath = fileManager.getImagePath(fileName);
  console.log('Ruta de imagen solicitada:', imagePath);
  return imagePath;
});

// Verificar si imagen existe 
ipcMain.handle('image-exists', (event, fileName) => {
  const exists = fileManager.imageExists(fileName);
  console.log('Verificando si existe:', fileName, 'Resultado:', exists);
  return exists;
});

// NUEVO: Obtener imagen como base64
ipcMain.handle('get-image-base64', (event, fileName) => {
  try {
    const base64 = fileManager.getImageAsBase64(fileName);
    return { success: true, base64 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =============== IPC HANDLERS PARA PDF (REFACTORIZADOS) ===============
ipcMain.handle('generar-pdf-puppeteer', async (event, id_cotizacion) => {
  try {
    const assetsDir = path.join(__dirname, 'assets');
    return await pdfService.generarPDF(id_cotizacion, app, assetsDir);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
});

// Abrir PDF y eliminarlo después
ipcMain.handle('abrir-pdf', async (event, filePath) => {
  return await pdfService.abrirPDF(filePath);
});

// Abrir carpeta de PDFs
ipcMain.handle('open-pdf-folder', async () => {
  return await pdfService.abrirCarpetaPDFs();
});

// Guardar PDF permanentemente
ipcMain.handle('save-pdf-permanent', async (event, tempFilePath, customName) => {
  return await pdfService.guardarPDFPermanente(tempFilePath, customName);
});

// =============== FUNCIONES DE LIMPIEZA TEMPORAL ===============

// Función opcional para limpiar archivos temporales antiguos al inicio
const limpiarArchivosTemporales = () => {
    const tempDir = path.join(__dirname, 'temp_pdfs');
    
    if (fs.existsSync(tempDir)) {
        try {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas en millisegundos
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log('Archivo temporal antiguo eliminado:', file);
                }
            });
        } catch (error) {
            console.warn('Error al limpiar archivos temporales:', error.message);
        }
    }
};

// Llamar la función de limpieza al iniciar la aplicación
limpiarArchivosTemporales();

// IPC handler para seleccionar archivo Excel y devolver { name, base64 }
// =============== IPC HANDLERS PARA EXCEL (REFACTORIZADOS) ===============
ipcMain.handle('select-and-parse-excel', () => {
  return excelService.selectAndParseExcel();
});

ipcMain.handle('importar-datos-excel', async (event, sheetDataMap, currentSheetName) => {
  const preloadPath = path.join(__dirname, 'preload.js');
  return await excelService.importarDatosExcel(sheetDataMap, currentSheetName, preloadPath);
});

ipcMain.on('cell-selected', (event, cellData) => {
  excelService.handleCellSelected(cellData);
});


// NUEVO: Handler para obtener cotizaciones paginadas
ipcMain.handle('obtener-cotizaciones-paginadas', async (event, page, limit, orderBy) => {
  try {
    const result = await cotizacionService.getPaginated(
      page || 1, 
      limit || 10, 
      orderBy || 'fecha DESC'
    );
    return result;
  } catch (error) {
    console.error('Error al obtener cotizaciones paginadas:', error);
    throw error;
  }
});
