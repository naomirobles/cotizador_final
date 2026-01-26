/**
 * SERVICIO DE GESTIÓN DE EXCEL
 * Maneja la importación de archivos Excel y la selección de celdas
 */

const fs = require('fs');
const path = require('path');
const { dialog, BrowserWindow } = require('electron');
const XLSX = require('xlsx');

class ExcelService {
  constructor() {
    this.excelWindow = null;
    this.resolveSelection = null;
  }

  /**
   * Abre un diálogo para seleccionar y parsear un archivo Excel
   * @returns {Object|null} Datos del Excel parseado o null si se cancela
   */
  selectAndParseExcel() {
    try {
      const result = dialog.showOpenDialogSync({
        title: 'Seleccionar archivo Excel',
        properties: ['openFile'],
        filters: [
          { name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] },
          { name: 'Todos', extensions: ['*'] }
        ]
      });

      if (!result || result.length === 0) {
        return null; // usuario canceló
      }

      const filePath = result[0];
      const name = path.basename(filePath);

      // Leer archivo como Buffer de forma sincrónica
      const buffer = fs.readFileSync(filePath);

      // Parsear workbook usando SheetJS
      const wb = XLSX.read(buffer, { type: 'buffer' });

      // Convertir cada hoja a array-of-arrays (AOA)
      const sheetDataMap = {};
      wb.SheetNames.forEach(sheetName => {
        const sheet = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        sheetDataMap[sheetName] = aoa;
      });

      // Devolver al renderer
      return { name, sheetNames: wb.SheetNames, sheetDataMap };

    } catch (err) {
      console.error('Error en select-and-parse-excel:', err);
      return { error: err.message || String(err) };
    }
  }

  /**
   * Crea y muestra la ventana de selección de celdas de Excel
   * @param {Object} sheetDataMap - Mapa de datos de hojas
   * @param {string} currentSheetName - Nombre de la hoja actual
   * @param {string} preloadPath - Ruta del archivo preload.js
   * @returns {Promise<Object|null>} Datos de la celda seleccionada o null
   */
  async importarDatosExcel(sheetDataMap, currentSheetName, preloadPath) {
    return new Promise((resolve, reject) => {
      try {
        // Cerrar ventana existente si hay una
        if (this.excelWindow && !this.excelWindow.isDestroyed()) {
          this.excelWindow.close();
          this.excelWindow = null;
        }

        this.excelWindow = new BrowserWindow({
          width: 1000,
          height: 700,
          webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false
          },
          show: false // No mostrar hasta que esté listo
        });

        // Guardar el resolve para usarlo cuando se seleccione una celda
        this.resolveSelection = resolve;

        // Cargar el archivo HTML
        this.excelWindow.loadFile('src/excel-render.html');

        // Cuando la ventana esté lista, enviar los datos
        this.excelWindow.webContents.once('did-finish-load', () => {
          console.log('Ventana Excel cargada, enviando datos...');
          
          const sheetData = sheetDataMap[currentSheetName] || [];
          console.log('Enviando datos de hoja:', currentSheetName, 'Filas:', sheetData.length);
          
          this.excelWindow.webContents.send('load-sheet-data', {
            data: sheetData,
            sheetName: currentSheetName
          });
          
          // Mostrar la ventana después de cargar los datos
          this.excelWindow.show();
        });

        // Manejar cierre de ventana sin selección
        this.excelWindow.on('closed', () => {
          console.log('Ventana Excel cerrada');
          if (this.resolveSelection) {
            this.resolveSelection(null);
            this.resolveSelection = null;
          }
          this.excelWindow = null;
        });

        // Manejar errores de carga
        this.excelWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('Error al cargar ventana Excel:', errorCode, errorDescription);
          reject(new Error(`Error al cargar: ${errorDescription}`));
        });

      } catch (error) {
        console.error('Error en importar-datos-excel:', error);
        reject(error);
      }
    });
  }

  /**
   * Maneja la selección de una celda
   * @param {Object} cellData - Datos de la celda seleccionada
   */
  handleCellSelected(cellData) {
    console.log('Celda seleccionada recibida:', cellData);
    
    if (this.resolveSelection) {
      this.resolveSelection(cellData);
      this.resolveSelection = null;
    }
    
    // Cerrar la ventana después de la selección
    if (this.excelWindow && !this.excelWindow.isDestroyed()) {
      this.excelWindow.close();
    }
  }

  /**
   * Cierra la ventana de Excel si está abierta
   */
  closeExcelWindow() {
    if (this.excelWindow && !this.excelWindow.isDestroyed()) {
      this.excelWindow.close();
      this.excelWindow = null;
    }
  }
}

module.exports = ExcelService;
