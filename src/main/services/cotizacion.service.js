/**
 * Servicio de Cotizaciones
 * Responsabilidad: Lógica de negocio relacionada con cotizaciones
 * Coordina entre repositorios, validadores y otros servicios
 */

const { CotizacionValidator } = require('../utils/cotizacion.validators');

class CotizacionService {
  constructor(cotizacionRepository, productoRepository = null) {
    this.cotizacionRepo = cotizacionRepository;
    this.productoRepo = productoRepository;
  }

  /**
   * Términos y condiciones por defecto
   */
  static get DEFAULT_TERMS() {
    return `El tiempo de entrega es de 2 días hábiles contados a partir de la autorización correspondiente y de la recepción del anticipo correspondiente.
La forma de pago es 50% de anticipo y 50% contra entrega del material terminado`;
  }

  /**
   * Crear una nueva cotización
   * @param {Object} cotizacionData - Datos de la cotización
   * @returns {Promise<number>} ID de la cotización creada
   */
  async create(cotizacionData) {
    // 1. Sanitizar datos
    const sanitizedData = CotizacionValidator.sanitize(cotizacionData);

    // 2. Validar datos
    CotizacionValidator.validateCreate(sanitizedData);

    // 3. Normalizar datos (aplicar valores por defecto)
    const normalizedData = this._normalizeCotizacionData(sanitizedData);

    // 4. Crear en base de datos
    const id = await this.cotizacionRepo.create(normalizedData);

    console.log(`✓ Cotización creada exitosamente con ID: ${id}`);
    console.log(`  - Empresa: ${normalizedData.empresa}`);
    console.log(`  - Proyecto: ${normalizedData.proyecto_servicio}`);
    console.log(`  - Ordenamiento: ${normalizedData.ordenar}`);

    return id;
  }

  /**
   * Obtener una cotización por ID
   * @param {number} id - ID de la cotización
   * @returns {Promise<Object>} Cotización
   */
  async getById(id) {
    // Validar ID
    CotizacionValidator.validateId(id);

    // Obtener de base de datos
    const cotizacion = await this.cotizacionRepo.findById(id);

    if (!cotizacion) {
      throw new Error(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  /**
   * Obtener todas las cotizaciones
   * @param {string} orderBy - Campo de ordenamiento
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async getAll(orderBy = 'fecha DESC') {
    return await this.cotizacionRepo.findAll(orderBy);
  }

  /**
   * Actualizar una cotización existente
   * @param {number} id - ID de la cotización
   * @param {Object} cotizacionData - Datos actualizados
   * @returns {Promise<number>} Número de filas actualizadas
   */
  async update(id, cotizacionData) {
    // LOG: Ver qué datos llegan
    console.log('📝 UPDATE - Datos recibidos:');
    console.log('  - ID:', id);
    console.log('  - terminos_condiciones (raw):', JSON.stringify(cotizacionData.terminos_condiciones));
    console.log('  - terminos_condiciones (type):', typeof cotizacionData.terminos_condiciones);
    console.log('  - terminos_condiciones (length):', cotizacionData.terminos_condiciones?.length);

    // 1. Sanitizar datos
    const sanitizedData = CotizacionValidator.sanitize(cotizacionData);
    
    console.log('🧹 UPDATE - Después de sanitizar:');
    console.log('  - terminos_condiciones:', JSON.stringify(sanitizedData.terminos_condiciones));

    // 2. Validar datos
    CotizacionValidator.validateUpdate(id, sanitizedData);

    // 3. Verificar que la cotización existe
    const exists = await this.cotizacionRepo.exists(id);
    if (!exists) {
      throw new Error(`Cotización con ID ${id} no encontrada`);
    }

    // 4. Normalizar datos
    const normalizedData = this._normalizeCotizacionData(sanitizedData);
    
    console.log('✨ UPDATE - Después de normalizar:');
    console.log('  - terminos_condiciones:', JSON.stringify(normalizedData.terminos_condiciones));

    // 5. Actualizar en base de datos
    const changes = await this.cotizacionRepo.update(id, normalizedData);

    console.log(`✓ Cotización ${id} actualizada exitosamente`);
    console.log(`  - Filas afectadas: ${changes}`);

    return changes;
  }

  /**
   * Eliminar una cotización
   * @param {number} id - ID de la cotización
   * @returns {Promise<number>} Número de filas eliminadas
   */
  async delete(id) {
    // Validar ID
    CotizacionValidator.validateId(id);

    // Verificar que existe
    const exists = await this.cotizacionRepo.exists(id);
    if (!exists) {
      throw new Error(`Cotización con ID ${id} no encontrada`);
    }

    // Si hay repositorio de productos, eliminar productos relacionados
    if (this.productoRepo) {
      await this.productoRepo.deleteByCotizacionId(id);
      console.log(`✓ Productos de la cotización ${id} eliminados`);
    }

    // Eliminar cotización
    const changes = await this.cotizacionRepo.delete(id);

    console.log(`✓ Cotización ${id} eliminada exitosamente`);

    return changes;
  }

  /**
   * Copiar una cotización existente
   * @param {number} id - ID de la cotización a copiar
   * @returns {Promise<number>} ID de la nueva cotización
   */
  async copy(id) {
    // 1. Validar ID
    CotizacionValidator.validateId(id);

    // 2. Obtener cotización original
    const cotizacionOriginal = await this.getById(id);

    // 3. Preparar datos para nueva cotización
    const nuevaCotizacion = {
      empresa: cotizacionOriginal.empresa,
      fecha: new Date().toISOString().split('T')[0], // Fecha actual
      nombre_contacto: cotizacionOriginal.nombre_contacto,
      telefono: cotizacionOriginal.telefono,
      email: cotizacionOriginal.email,
      proyecto_servicio: `${cotizacionOriginal.proyecto_servicio} (Copia)`,
      ordenar: cotizacionOriginal.ordenar,
      terminos_condiciones: cotizacionOriginal.terminos_condiciones
    };

    // 4. Crear nueva cotización
    const nuevoId = await this.create(nuevaCotizacion);

    // 5. Si hay productos, copiarlos también
    if (this.productoRepo) {
      const productos = await this.productoRepo.findByCotizacionId(id);
      
      for (const producto of productos) {
        await this.productoRepo.create({
          id_cotizacion: nuevoId,
          nombre_producto: producto.nombre_producto,
          precio_unitario: producto.precio_unitario,
          concepto: producto.concepto,
          unidades: producto.unidades,
          imagen: producto.imagen,
          orden: producto.orden
        });
      }

      console.log(`✓ ${productos.length} productos copiados a la nueva cotización`);
    }

    console.log(`✓ Cotización ${id} copiada exitosamente con nuevo ID: ${nuevoId}`);

    return nuevoId;
  }

  /**
   * Obtener cotización completa con productos y totales
   * @param {number} id - ID de la cotización
   * @returns {Promise<Object>} Cotización con productos y totales
   */
  async getComplete(id) {
    // Validar ID
    CotizacionValidator.validateId(id);

    // Obtener cotización
    const cotizacion = await this.getById(id);

    // Obtener productos si hay repositorio
    let productos = [];
    if (this.productoRepo) {
      productos = await this.productoRepo.findByCotizacionId(id);
    }

    // Calcular totales
    const totales = this._calculateTotals(productos);

    return {
      cotizacion,
      productos,
      ...totales,
      totalEnLetras: this._convertirNumeroALetras(parseFloat(totales.total))
    };
  }

  /**
   * Buscar cotizaciones por empresa
   * @param {string} empresa - Nombre de empresa a buscar
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async searchByEmpresa(empresa) {
    if (!empresa || empresa.trim().length === 0) {
      throw new Error('Término de búsqueda requerido');
    }

    return await this.cotizacionRepo.findByEmpresa(empresa.trim());
  }

  /**
   * Obtener cotizaciones por rango de fechas
   * @param {string} fechaInicio - Fecha inicio
   * @param {string} fechaFin - Fecha fin
   * @returns {Promise<Array>} Array de cotizaciones
   */
  async getByDateRange(fechaInicio, fechaFin) {
    // Validar fechas
    if (!CotizacionValidator.isValidDate(fechaInicio)) {
      throw new Error('Fecha de inicio inválida');
    }
    if (!CotizacionValidator.isValidDate(fechaFin)) {
      throw new Error('Fecha de fin inválida');
    }

    if (fechaInicio > fechaFin) {
      throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin');
    }

    return await this.cotizacionRepo.findByDateRange(fechaInicio, fechaFin);
  }

  /**
   * Obtener estadísticas de cotizaciones
   * @returns {Promise<Object>} Estadísticas
   */
  async getStatistics() {
    const total = await this.cotizacionRepo.count();
    const cotizaciones = await this.cotizacionRepo.findAll('fecha DESC');

    // Calcular estadísticas adicionales
    const porMes = this._groupByMonth(cotizaciones);
    const porEmpresa = this._groupByEmpresa(cotizaciones);

    return {
      total,
      porMes,
      porEmpresa,
      ultimaCotizacion: cotizaciones[0] || null
    };
  }

  // ============ MÉTODOS PRIVADOS (HELPERS) ============

  /**
   * Normalizar datos de cotización aplicando valores por defecto
   * @private
   */
  _normalizeCotizacionData(data) {
    return {
      ...data,
      ordenar: data.ordenar || 'id-desc',
      // Solo aplicar términos por defecto si el campo es undefined o null
      // Permitir string vacío para borrar los términos
      terminos_condiciones: data.terminos_condiciones !== undefined && data.terminos_condiciones !== null
        ? data.terminos_condiciones 
        : CotizacionService.DEFAULT_TERMS,
      telefono: data.telefono || '',
      email: data.email || ''
    };
  }

  /**
   * Calcular totales de productos
   * @private
   */
  _calculateTotals(productos) {
    const subtotal = productos.reduce((sum, producto) => {
      return sum + (producto.unidades * producto.precio_unitario);
    }, 0);

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return {
      subtotal: subtotal.toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2)
    };
  }

  /**
   * Convertir número a letras (pesos mexicanos)
   * @private
   */
  _convertirNumeroALetras(numero) {
    // TODO: Implementar conversión completa
    // Por ahora retornar formato simple
    const entero = Math.floor(numero);
    const centavos = Math.round((numero - entero) * 100);
    return `${entero} pesos ${centavos}/100 M.N.`;
  }

  /**
   * Agrupar cotizaciones por mes
   * @private
   */
  _groupByMonth(cotizaciones) {
    const grouped = {};
    
    cotizaciones.forEach(cot => {
      const month = cot.fecha.substring(0, 7); // YYYY-MM
      if (!grouped[month]) {
        grouped[month] = 0;
      }
      grouped[month]++;
    });

    return grouped;
  }

  /**
   * Agrupar cotizaciones por empresa
   * @private
   */
  _groupByEmpresa(cotizaciones) {
    const grouped = {};
    
    cotizaciones.forEach(cot => {
      if (!grouped[cot.empresa]) {
        grouped[cot.empresa] = 0;
      }
      grouped[cot.empresa]++;
    });

    return grouped;
  }
}

module.exports = CotizacionService;
