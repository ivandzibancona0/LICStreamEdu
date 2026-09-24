/**
 * storage.js
 * Módulo de gestión de persistencia de datos.
 * Utiliza localStorage para preferencias, estado de reproducción y cursos,
 * e IndexedDB para el almacenamiento seguro y persistente de archivos adjuntos (hasta 10 MB).
 */

const STORAGE_KEYS = {
  COURSE_DATA: 'course_player_data',
  WATCHED_VIDEOS: 'course_player_watched_ids',
  CURRENT_VIDEO_ID: 'course_player_active_video_id',
  THEME: 'course_player_selected_theme',
  ATTACHMENTS_META: 'course_player_attachments_meta'
};

// ==========================================
// Gestor de LocalStorage
// ==========================================
const LocalStorageManager = {
  /**
   * Obtiene un elemento parseado desde localStorage
   * @param {string} key 
   * @param {any} defaultValue 
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`[LocalStorage] Error al leer la clave "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Guarda un elemento en localStorage serializado como JSON
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[LocalStorage] Error al guardar en la clave "${key}":`, error);
      return false;
    }
  },

  /**
   * Elimina un elemento de localStorage
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[LocalStorage] Error al eliminar "${key}":`, error);
    }
  }
};

// ==========================================
// Gestor de IndexedDB para Archivos Adjuntos
// ==========================================
const DB_CONFIG = {
  name: 'CoursePlayerDB',
  version: 1,
  storeName: 'attachments'
};

const IndexedDBManager = {
  dbInstance: null,

  /**
   * Inicializa o conecta con la base de datos IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async getDB() {
    if (this.dbInstance) {
      return this.dbInstance;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
          db.createObjectStore(DB_CONFIG.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = event.target.result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error al inicializar:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * Guarda un archivo adjunto (Blob o File) en IndexedDB
   * @param {Object} fileRecord - { id, name, size, type, fileBlob, dateAdded }
   */
  async saveFile(fileRecord) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.put(fileRecord);

      request.onsuccess = () => resolve(fileRecord);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Obtiene un archivo por su ID
   * @param {string} id 
   */
  async getFile(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Obtiene todos los archivos almacenados
   */
  async getAllFiles() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Elimina un archivo por su ID
   * @param {string} id 
   */
  async deleteFile(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Vacía completamente el almacén de archivos en IndexedDB
   */
  async clearAll() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
};
