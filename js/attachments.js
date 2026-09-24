/**
 * attachments.js
 * Módulo para la gestión de archivos adicionales del curso (máx. 10 MB).
 * Permite cargar archivos locales (PDFs, código, diapositivas) o registrar enlaces en la nube,
 * con almacenamiento en IndexedDB y descarga local directa.
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB límite

const AttachmentManager = {
  attachments: [],
  onUpdateCallbacks: [],

  /**
   * Inicializa la lista de archivos cargando los metadatos almacenados
   */
  async init() {
    try {
      const records = await IndexedDBManager.getAllFiles();
      this.attachments = records.map(r => ({
        id: r.id,
        name: r.name,
        size: r.size,
        type: r.type,
        dateAdded: r.dateAdded,
        isCloudLink: !!r.isCloudLink,
        cloudUrl: r.cloudUrl || ''
      }));
      this.notify();
    } catch (err) {
      console.warn('[AttachmentManager] Error al cargar archivos de IndexedDB:', err);
      // Fallback a localStorage para metadatos si IndexedDB no responde
      this.attachments = LocalStorageManager.get(STORAGE_KEYS.ATTACHMENTS_META, []);
      this.notify();
    }
  },

  /**
   * Suscribe una función para escuchar cambios en la lista de archivos
   * @param {Function} callback 
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.onUpdateCallbacks.push(callback);
    }
  },

  /**
   * Notifica a los suscriptores
   */
  notify() {
    this.onUpdateCallbacks.forEach(cb => cb(this.attachments));
  },

  /**
   * Procesa y valida un archivo local (máx 10 MB)
   * @param {File} file 
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async addLocalFile(file) {
    if (!file) {
      return { success: false, message: 'No se seleccionó ningún archivo.' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        message: `El archivo "${file.name}" pesa ${sizeMB} MB. El límite máximo permitido es de 10 MB.`
      };
    }

    const fileRecord = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      dateAdded: new Date().toISOString(),
      fileBlob: file,
      isCloudLink: false
    };

    try {
      await IndexedDBManager.saveFile(fileRecord);
      this.attachments.unshift({
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.size,
        type: fileRecord.type,
        dateAdded: fileRecord.dateAdded,
        isCloudLink: false
      });

      LocalStorageManager.set(STORAGE_KEYS.ATTACHMENTS_META, this.attachments);
      this.notify();
      return { success: true, message: `Archivo "${file.name}" cargado con éxito.` };
    } catch (error) {
      console.error('[AttachmentManager] Error al guardar archivo:', error);
      return { success: false, message: 'No se pudo guardar el archivo en el almacenamiento local.' };
    }
  },

  /**
   * Agrega un enlace de recurso en la nube (Google Drive, Dropbox, GitHub, etc.)
   * @param {string} title 
   * @param {string} url 
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async addCloudLink(title, url) {
    if (!url || !url.trim()) {
      return { success: false, message: 'Debes ingresar una URL válida para el recurso en la nube.' };
    }

    const linkTitle = title.trim() || 'Recurso en la nube';
    const linkRecord = {
      id: `cloud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: linkTitle,
      size: 0,
      type: 'cloud/link',
      dateAdded: new Date().toISOString(),
      isCloudLink: true,
      cloudUrl: url.trim()
    };

    try {
      await IndexedDBManager.saveFile(linkRecord);
      this.attachments.unshift(linkRecord);
      LocalStorageManager.set(STORAGE_KEYS.ATTACHMENTS_META, this.attachments);
      this.notify();
      return { success: true, message: 'Enlace añadido correctamente.' };
    } catch (error) {
      console.error('[AttachmentManager] Error al guardar enlace:', error);
      return { success: false, message: 'Error al registrar el enlace en la nube.' };
    }
  },

  /**
   * Descarga un archivo local o abre el enlace en la nube
   * @param {string} id 
   */
  async downloadOrOpen(id) {
    const item = this.attachments.find(a => a.id === id);
    if (!item) return;

    if (item.isCloudLink) {
      window.open(item.cloudUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const record = await IndexedDBManager.getFile(id);
      if (!record || !record.fileBlob) {
        alert('Este archivo figura como recurso del curso pero su contenido binario local no está en este navegador. Puedes volver a adjuntarlo o compartirlo como enlace en la nube (Drive/Dropbox/Web).');
        return;
      }

      // Crear URL de objeto y disparar descarga
      const blobUrl = URL.createObjectURL(record.fileBlob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = record.name;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      // Liberar memoria
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('[AttachmentManager] Error al descargar archivo:', err);
      alert('Ocurrió un error al intentar descargar el archivo.');
    }
  },

  /**
   * Elimina un archivo adjunto
   * @param {string} id 
   */
  async deleteAttachment(id) {
    try {
      await IndexedDBManager.deleteFile(id);
      this.attachments = this.attachments.filter(a => a.id !== id);
      LocalStorageManager.set(STORAGE_KEYS.ATTACHMENTS_META, this.attachments);
      this.notify();
      return true;
    } catch (err) {
      console.error('[AttachmentManager] Error al eliminar archivo:', err);
      return false;
    }
  },

  /**
   * Limpia todos los archivos y enlaces de la sesión actual
   */
  async clearAll() {
    this.attachments = [];
    LocalStorageManager.remove(STORAGE_KEYS.ATTACHMENTS_META);
    this.notify();

    try {
      await IndexedDBManager.clearAll();
    } catch (e) {
      console.warn('[AttachmentManager] Error al limpiar IndexedDB:', e);
    }
  },

  /**
   * Carga y sincroniza una lista de recursos desde un archivo de curso (JSON)
   * @param {Array} resourcesList 
   */
  async loadFromCourse(resourcesList) {
    await this.clearAll();

    if (!Array.isArray(resourcesList) || resourcesList.length === 0) {
      return;
    }

    for (const res of resourcesList) {
      if (res.isCloudLink && res.cloudUrl) {
        // Enlace en la nube
        const linkRecord = {
          id: res.id || `cloud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: res.name || 'Recurso en la nube',
          size: 0,
          type: 'cloud/url',
          dateAdded: res.dateAdded || new Date().toISOString(),
          isCloudLink: true,
          cloudUrl: res.cloudUrl
        };
        await IndexedDBManager.saveFile(linkRecord);
        this.attachments.push({
          id: linkRecord.id,
          name: linkRecord.name,
          size: linkRecord.size,
          type: linkRecord.type,
          dateAdded: linkRecord.dateAdded,
          isCloudLink: true,
          cloudUrl: linkRecord.cloudUrl
        });
      } else if (res.name) {
        // Metadatos de archivo
        const metaRecord = {
          id: res.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: res.name,
          size: res.size || 0,
          type: res.type || 'application/octet-stream',
          dateAdded: res.dateAdded || new Date().toISOString(),
          isCloudLink: false,
          cloudUrl: res.cloudUrl || ''
        };
        await IndexedDBManager.saveFile(metaRecord);
        this.attachments.push({
          id: metaRecord.id,
          name: metaRecord.name,
          size: metaRecord.size,
          type: metaRecord.type,
          dateAdded: metaRecord.dateAdded,
          isCloudLink: false
        });
      }
    }

    LocalStorageManager.set(STORAGE_KEYS.ATTACHMENTS_META, this.attachments);
    this.notify();
  },


  /**
   * Formatea el tamaño en bytes a KB o MB
   * @param {number} bytes 
   * @returns {string}
   */
  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1000) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  },

  /**
   * Formatea la fecha ISO a formato local legible
   * @param {string} isoString 
   * @returns {string}
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
};
