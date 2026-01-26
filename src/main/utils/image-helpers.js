/**
 * UTILIDADES DE IMÁGENES
 * Funciones para convertir imágenes a base64
 */

const fs = require('fs');
const path = require('path');

/**
 * Convierte una imagen del workspace a base64
 * @param {string} nombreArchivo - Nombre del archivo de imagen
 * @param {string} imageDir - Directorio de imágenes
 * @returns {string|null} Data URI de la imagen o null si hay error
 */
function getImagenBase64(nombreArchivo, imageDir) {
  try {
    const rutaImagen = path.join(imageDir, nombreArchivo);
    const data = fs.readFileSync(rutaImagen);
    const extension = path.extname(nombreArchivo).substring(1); // "png" o "jpg"
    return `data:image/${extension};base64,${data.toString('base64')}`;
  } catch (err) {
    console.error('Error leyendo la imagen:', err);
    return null;
  }
}

/**
 * Convierte una imagen de assets a base64
 * @param {string} rutaCompleta - Ruta completa del archivo
 * @returns {string|null} Data URI de la imagen o null si hay error
 */
function getAssetImageBase64(rutaCompleta) {
  try {
    if (!fs.existsSync(rutaCompleta)) {
      console.error('Archivo no encontrado:', rutaCompleta);
      return null;
    }
    
    const data = fs.readFileSync(rutaCompleta);
    const extension = path.extname(rutaCompleta).substring(1).toLowerCase();
    
    // Determinar el tipo MIME
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    
    const mimeType = mimeTypes[extension] || 'image/png';
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (err) {
    console.error('Error leyendo la imagen de assets:', err);
    return null;
  }
}

/**
 * Convierte el logo de la aplicación a base64
 * @param {string} assetsDir - Directorio de assets
 * @returns {string|null} Data URI del logo o null si hay error
 */
function getLogoBase64(assetsDir) {
  try {
    const rutaLogo = path.join(assetsDir, 'logo.png');
    console.log('Cargando logo desde:', rutaLogo);
    
    if (!fs.existsSync(rutaLogo)) {
      console.error('Logo no encontrado en:', rutaLogo);
      return null;
    }
    
    const data = fs.readFileSync(rutaLogo);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch (err) {
    console.error('Error cargando logo:', err);
    return null;
  }
}

module.exports = {
  getImagenBase64,
  getAssetImageBase64,
  getLogoBase64
};
