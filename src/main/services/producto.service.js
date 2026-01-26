/**
 * Servicio de Productos
 * Responsabilidad: Lógica de negocio relacionada con productos
 * Coordina entre repositorios, validadores y otros servicios
 */

const { ProductoValidator } = require('../utils/producto.validators');

class ProductoService {
  constructor(productoRepository, cotizacionRepository = null) {
    this.productoRepo = productoRepository;
    this.cotizacionRepo = cotizacionRepository;
  }

  /**
   * Crear un nuevo producto
   * @param {Object} productoData - Datos del producto
   * @returns {Promise<number>} ID del producto creado
   */
  async create(productoData) {
    // 1. Sanitizar datos
    const sanitizedData = ProductoValidator.sanitize(productoData);

    // 2. Validar datos
    ProductoValidator.validateCreate(sanitizedData);

    // 3. Verificar que la cotización existe (si hay repositorio)
    if (this.cotizacionRepo) {
      const cotizacionExists = await this.cotizacionRepo.exists(sanitizedData.id_cotizacion);
      if (!cotizacionExists) {
        throw new Error(`La cotización ${sanitizedData.id_cotizacion} no existe`);
      }
    }

    // 4. Crear en base de datos
    const id = await this.productoRepo.create(sanitizedData);

    console.log(`✓ Producto creado exitosamente con ID: ${id}`);
    console.log(`  - Nombre: ${sanitizedData.nombre_producto}`);
    console.log(`  - Precio: $${sanitizedData.precio_unitario}`);
    console.log(`  - Unidades: ${sanitizedData.unidades}`);

    return id;
  }

  /**
   * Obtener un producto por ID
   * @param {number} id - ID del producto
   * @returns {Promise<Object>} Producto
   */
  async getById(id) {
    // Validar ID
    ProductoValidator.validateId(id);

    // Obtener de base de datos
    const producto = await this.productoRepo.findById(id);

    if (!producto) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }

    return producto;
  }

  /**
   * Obtener todos los productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @param {string} orderBy - Criterio de ordenamiento
   * @returns {Promise<Array>} Array de productos
   */
  async getByCotizacionId(cotizacionId, orderBy = 'orden ASC') {
    // Validar ID de cotización
    ProductoValidator.validateCotizacionId(cotizacionId);

    // Validar criterio de ordenamiento
    if (!ProductoValidator.isValidOrderBy(orderBy)) {
      orderBy = 'orden ASC'; // Usar default si es inválido
    }

    return await this.productoRepo.findByCotizacionId(cotizacionId, orderBy);
  }

  /**
   * Actualizar un producto existente
   * @param {number} id - ID del producto
   * @param {Object} productoData - Datos actualizados
   * @returns {Promise<number>} Número de filas actualizadas
   */
  async update(id, productoData) {
    // 1. Sanitizar datos
    const sanitizedData = ProductoValidator.sanitize(productoData);

    // 2. Validar datos
    ProductoValidator.validateUpdate(id, sanitizedData);

    // 3. Verificar que el producto existe
    const exists = await this.productoRepo.exists(id);
    if (!exists) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }

    // 4. Actualizar en base de datos
    const changes = await this.productoRepo.update(id, sanitizedData);

    console.log(`✓ Producto ${id} actualizado exitosamente`);

    return changes;
  }

  /**
   * Eliminar un producto
   * @param {number} id - ID del producto
   * @returns {Promise<number>} Número de filas eliminadas
   */
  async delete(id) {
    // Validar ID
    ProductoValidator.validateId(id);

    // Verificar que existe
    const exists = await this.productoRepo.exists(id);
    if (!exists) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }

    // Eliminar
    const changes = await this.productoRepo.delete(id);

    console.log(`✓ Producto ${id} eliminado exitosamente`);

    return changes;
  }

  /**
   * Eliminar todos los productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<number>} Número de productos eliminados
   */
  async deleteByCotizacionId(cotizacionId) {
    // Validar ID de cotización
    ProductoValidator.validateCotizacionId(cotizacionId);

    // Eliminar todos
    const changes = await this.productoRepo.deleteByCotizacionId(cotizacionId);

    console.log(`✓ ${changes} productos eliminados de la cotización ${cotizacionId}`);

    return changes;
  }

  /**
   * Crear múltiples productos a la vez
   * @param {number} cotizacionId - ID de la cotización
   * @param {Array} productosData - Array de productos
   * @returns {Promise<Array>} Array de IDs creados
   */
  async createMultiple(cotizacionId, productosData) {
    // Validar ID de cotización
    ProductoValidator.validateCotizacionId(cotizacionId);

    if (!Array.isArray(productosData) || productosData.length === 0) {
      throw new Error('Debe proporcionar al menos un producto');
    }

    const ids = [];
    const errores = [];

    for (let i = 0; i < productosData.length; i++) {
      try {
        const productoData = { ...productosData[i], id_cotizacion: cotizacionId };
        const id = await this.create(productoData);
        ids.push(id);
      } catch (error) {
        errores.push({
          index: i,
          producto: productosData[i],
          error: error.message
        });
      }
    }

    console.log(`✓ ${ids.length} productos creados exitosamente`);
    if (errores.length > 0) {
      console.warn(`⚠ ${errores.length} productos con errores`);
    }

    return {
      creados: ids,
      errores: errores,
      total: ids.length
    };
  }

  /**
   * Actualizar el orden de los productos
   * @param {Array<{id: number, orden: number}>} productosOrden - Array con IDs y nuevos órdenes
   * @returns {Promise<number>} Número de productos actualizados
   */
  async updateOrders(productosOrden) {
    if (!Array.isArray(productosOrden) || productosOrden.length === 0) {
      throw new Error('Debe proporcionar al menos un producto para reordenar');
    }

    // Validar cada producto
    productosOrden.forEach((item, index) => {
      if (!item.id || !Number.isInteger(item.id)) {
        throw new Error(`ID inválido en posición ${index}`);
      }
      if (!ProductoValidator.isValidOrder(item.orden)) {
        throw new Error(`Orden inválido en posición ${index}`);
      }
    });

    // Actualizar órdenes
    const count = await this.productoRepo.updateMultipleOrders(productosOrden);

    console.log(`✓ ${count} productos reordenados exitosamente`);

    return count;
  }

  /**
   * Buscar productos por nombre
   * @param {number} cotizacionId - ID de la cotización
   * @param {string} nombre - Nombre a buscar
   * @returns {Promise<Array>} Array de productos
   */
  async searchByNombre(cotizacionId, nombre) {
    ProductoValidator.validateCotizacionId(cotizacionId);

    if (!nombre || nombre.trim().length === 0) {
      throw new Error('Término de búsqueda requerido');
    }

    return await this.productoRepo.findByNombre(cotizacionId, nombre.trim());
  }

  /**
   * Obtener productos con imagen
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<Array>} Array de productos con imagen
   */
  async getProductsWithImages(cotizacionId) {
    ProductoValidator.validateCotizacionId(cotizacionId);

    return await this.productoRepo.findWithImages(cotizacionId);
  }

  /**
   * Calcular totales de productos
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<Object>} Objeto con subtotal, IVA y total
   */
  async calculateTotals(cotizacionId) {
    ProductoValidator.validateCotizacionId(cotizacionId);

    const subtotal = await this.productoRepo.calculateSubtotal(cotizacionId);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat(iva.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      subtotalFormateado: this._formatCurrency(subtotal),
      ivaFormateado: this._formatCurrency(iva),
      totalFormateado: this._formatCurrency(total)
    };
  }

  /**
   * Importar productos desde Excel
   * @param {number} cotizacionId - ID de la cotización
   * @param {Array} excelData - Datos del Excel
   * @returns {Promise<Object>} Resultado de la importación
   */
  async importFromExcel(cotizacionId, excelData) {
    ProductoValidator.validateCotizacionId(cotizacionId);

    // Validar datos en bulk
    const validationResult = ProductoValidator.validateBulkImport(excelData);

    if (validationResult.totalValidos === 0) {
      throw new Error('No hay productos válidos para importar');
    }

    // Crear productos válidos
    const productos = validationResult.validos.map((producto, index) => ({
      ...producto,
      id_cotizacion: cotizacionId,
      orden: index
    }));

    const resultado = await this.createMultiple(cotizacionId, productos);

    return {
      ...resultado,
      validacion: validationResult
    };
  }

  /**
   * Copiar productos de una cotización a otra
   * @param {number} cotizacionOrigenId - ID de la cotización origen
   * @param {number} cotizacionDestinoId - ID de la cotización destino
   * @returns {Promise<number>} Número de productos copiados
   */
  async copyFromCotizacion(cotizacionOrigenId, cotizacionDestinoId) {
    ProductoValidator.validateCotizacionId(cotizacionOrigenId);
    ProductoValidator.validateCotizacionId(cotizacionDestinoId);

    // Obtener productos origen
    const productos = await this.productoRepo.findByCotizacionId(cotizacionOrigenId);

    if (productos.length === 0) {
      return 0;
    }

    // Copiar productos
    const productosACopiar = productos.map(p => ({
      id_cotizacion: cotizacionDestinoId,
      nombre_producto: p.nombre_producto,
      precio_unitario: p.precio_unitario,
      concepto: p.concepto,
      unidades: p.unidades,
      imagen: p.imagen,
      orden: p.orden
    }));

    const resultado = await this.createMultiple(cotizacionDestinoId, productosACopiar);

    console.log(`✓ ${resultado.total} productos copiados de cotización ${cotizacionOrigenId} a ${cotizacionDestinoId}`);

    return resultado.total;
  }

  /**
   * Obtener estadísticas de productos de una cotización
   * @param {number} cotizacionId - ID de la cotización
   * @returns {Promise<Object>} Estadísticas
   */
  async getStatistics(cotizacionId) {
    ProductoValidator.validateCotizacionId(cotizacionId);

    const productos = await this.productoRepo.findByCotizacionId(cotizacionId);
    
    if (productos.length === 0) {
      return {
        total: 0,
        conImagen: 0,
        sinImagen: 0,
        totalUnidades: 0,
        precioPromedio: 0,
        subtotal: 0
      };
    }

    const conImagen = productos.filter(p => p.imagen && p.imagen.trim() !== '').length;
    const totalUnidades = productos.reduce((sum, p) => sum + p.unidades, 0);
    const precioPromedio = productos.reduce((sum, p) => sum + p.precio_unitario, 0) / productos.length;
    const subtotal = await this.productoRepo.calculateSubtotal(cotizacionId);

    return {
      total: productos.length,
      conImagen,
      sinImagen: productos.length - conImagen,
      totalUnidades,
      precioPromedio: parseFloat(precioPromedio.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      productoMasCaro: this._getMasCaro(productos),
      productoMasBarato: this._getMasBarato(productos)
    };
  }

  /**
   * Validar y preparar productos antes de guardar
   * @param {Array} productos - Array de productos del formulario
   * @returns {Array} Productos validados y listos para guardar
   */
  async prepareForSave(productos) {
    if (!Array.isArray(productos)) {
      throw new Error('Los productos deben ser un array');
    }

    const preparados = [];
    const errores = [];

    productos.forEach((producto, index) => {
      try {
        const sanitizado = ProductoValidator.sanitize(producto);
        ProductoValidator.validateCreate(sanitizado);
        preparados.push(sanitizado);
      } catch (error) {
        errores.push({
          index,
          error: error.message
        });
      }
    });

    return {
      validos: preparados,
      errores,
      totalValidos: preparados.length,
      totalErrores: errores.length
    };
  }

  // ============ MÉTODOS PRIVADOS (HELPERS) ============

  /**
   * Formatear moneda
   * @private
   */
  _formatCurrency(amount) {
    return amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Obtener producto más caro
   * @private
   */
  _getMasCaro(productos) {
    if (productos.length === 0) return null;
    return productos.reduce((max, p) => 
      p.precio_unitario > max.precio_unitario ? p : max
    );
  }

  /**
   * Obtener producto más barato
   * @private
   */
  _getMasBarato(productos) {
    if (productos.length === 0) return null;
    return productos.reduce((min, p) => 
      p.precio_unitario < min.precio_unitario ? p : min
    );
  }
}

module.exports = ProductoService;
