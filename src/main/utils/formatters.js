/**
 * UTILIDADES DE FORMATO
 * Funciones para formatear fechas, monedas y números a letras
 */

/**
 * Convierte fecha de formato YYYY-MM-DD a formato español legible
 * @param {string} fechaString - Fecha en formato 'YYYY-MM-DD'
 * @returns {string} Fecha en formato 'DD de mes de YYYY'
 * @example formatearFechaEspanol('2025-08-12') → '12 de agosto de 2025'
 */
function formatearFechaEspanol(fechaString) {
  // Verificar si la fecha tiene el formato correcto
  if (!fechaString || typeof fechaString !== 'string') {
    return 'Fecha inválida';
  }
  
  // Verificar formato YYYY-MM-DD
  const formatoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatoRegex.test(fechaString)) {
    return 'Formato de fecha inválido';
  }
  
  try {
    // Crear objeto Date desde la cadena
    const fecha = new Date(fechaString + 'T00:00:00'); // Agregar tiempo para evitar problemas de zona horaria
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      return 'Fecha inválida';
    }
    
    // Array con los nombres de los meses en español
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    // Obtener día, mes y año
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    // Retornar fecha formateada
    return `${dia} de ${mes} de ${año}`;
    
  } catch (error) {
    return 'Error al procesar la fecha';
  }
}

/**
 * Formatea un número como moneda (formato estadounidense)
 * @param {number|string} numero - Número a formatear
 * @returns {string} Número formateado con comas y 2 decimales
 * @example formatearMoneda(1234.5) → '1,234.50'
 */
function formatearMoneda(numero) {
  // Convertir a número si viene como string
  const num = typeof numero === 'string' ? parseFloat(numero) : numero;
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Convierte un número a su representación en letras (pesos mexicanos)
 * @param {number} numero - Número a convertir
 * @returns {string} Número en letras con formato de pesos mexicanos
 * @example numeroALetras(1250.50) → 'mil doscientos cincuenta pesos 50/100 M.N.'
 */
function numeroALetras(numero) {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (numero === 0) return 'cero pesos 00/100 M.N.';
  if (numero === 100) return 'cien pesos 00/100 M.N.';
  
  let entero = Math.floor(numero);
  let centavos = Math.round((numero - entero) * 100);
  
  function convertirGrupo(n) {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    
    let resultado = '';
    let c = Math.floor(n / 100);
    let d = Math.floor((n % 100) / 10);
    let u = n % 10;
    
    if (c > 0) {
      if (n === 100) resultado += 'cien';
      else resultado += centenas[c];
    }
    
    // Manejar números del 10 al 19
    if (d === 1) {
      if (u === 0) {
        // Caso especial: exactamente 10
        resultado += (resultado ? ' ' : '') + 'diez';
      } else {
        // Casos: 11-19
        resultado += (resultado ? ' ' : '') + especiales[u];
      }
    } else {
      if (d === 2 && u > 0) {
        resultado += (resultado ? ' ' : '') + 'veinti' + unidades[u];
      } else {
        if (d > 0) resultado += (resultado ? ' ' : '') + decenas[d];
        if (u > 0) {
          if (d > 2) resultado += ' y ';
          else if (resultado) resultado += ' ';
          resultado += unidades[u];
        }
      }
    }
    
    return resultado;
  }
  
  function convertirNumero(n) {
    if (n === 0) return '';
    if (n === 1) return 'un';
    if (n < 1000) return convertirGrupo(n);
    
    let miles = Math.floor(n / 1000);
    let resto = n % 1000;
    
    let resultado = '';
    if (miles === 1) {
      resultado = 'mil';
    } else if (miles < 1000) {
      resultado = convertirGrupo(miles) + ' mil';
    } else {
      let millones = Math.floor(miles / 1000);
      let milesResto = miles % 1000;
      
      if (millones === 1) {
        resultado = 'un millón';
      } else {
        resultado = convertirGrupo(millones) + ' millones';
      }
      
      if (milesResto > 0) {
        resultado += ' ' + convertirGrupo(milesResto) + ' mil';
      }
    }
    
    if (resto > 0) {
      resultado += ' ' + convertirGrupo(resto);
    }
    
    return resultado;
  }
  
  let letras = convertirNumero(entero);
  if (entero === 1) {
    return `un peso ${centavos.toString().padStart(2, '0')}/100 M.N.`;
  } else {
    return `${letras} pesos ${centavos.toString().padStart(2, '0')}/100 M.N.`;
  }
}

module.exports = {
  formatearFechaEspanol,
  formatearMoneda,
  numeroALetras
};
