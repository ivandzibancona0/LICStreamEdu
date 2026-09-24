/**
 * courses.js
 * Módulo para la gestión del estado del curso, listas de reproducción (módulos),
 * videos, progreso y marcado de vistos/no vistos.
 */

class CourseManager {
  constructor() {
    this.course = null;
    this.watchedVideoIds = new Set();
    this.currentVideoId = null;
    this.searchQuery = '';
    this.currentFilter = 'all'; // 'all' | 'pending' | 'completed'
    this.onStateChangeCallbacks = [];
  }

  /**
   * Inicializa el estado cargando datos previos desde localStorage
   */
  init() {
    // 1. Cargar videos vistos
    const savedWatched = LocalStorageManager.get(STORAGE_KEYS.WATCHED_VIDEOS, []);
    this.watchedVideoIds = new Set(Array.isArray(savedWatched) ? savedWatched : []);

    // 2. Cargar curso almacenado
    const savedCourse = LocalStorageManager.get(STORAGE_KEYS.COURSE_DATA, null);
    if (savedCourse) {
      this.course = savedCourse;
    }

    // 3. Cargar video activo
    this.currentVideoId = LocalStorageManager.get(STORAGE_KEYS.CURRENT_VIDEO_ID, null);

    // Si hay curso pero no hay video activo válido, seleccionar el primer video
    if (this.course && (!this.currentVideoId || !this.getVideoById(this.currentVideoId))) {
      const allVideos = this.getAllVideos();
      if (allVideos.length > 0) {
        this.currentVideoId = allVideos[0].id;
      }
    }
  }

  /**
   * Suscribe una función que se ejecutará cuando el estado cambie
   * @param {Function} callback 
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.onStateChangeCallbacks.push(callback);
    }
  }

  /**
   * Notifica a todos los suscriptores del cambio de estado
   */
  notify() {
    this.onStateChangeCallbacks.forEach(cb => cb(this));
  }

  /**
   * Normaliza y carga un objeto JSON de curso
   * @param {Object|Array} jsonData 
   * @returns {{ success: boolean, message?: string }}
   */
  loadCourseFromJson(jsonData) {
    try {
      let normalizedCourse = {
        courseTitle: 'Mi Lista de Reproducción',
        description: 'Curso cargado de videos',
        playlists: []
      };

      // Caso 1: Array plano de videos
      if (Array.isArray(jsonData)) {
        if (jsonData.length === 0) {
          return { success: false, message: 'El archivo JSON contiene un arreglo vacío.' };
        }
        normalizedCourse.playlists.push({
          id: 'playlist-default',
          title: 'Videos del Curso',
          videos: jsonData.map((v, i) => this._normalizeVideo(v, i))
        });
      }
      // Caso 2: Objeto estructurado con playlists / módulos
      else if (jsonData && typeof jsonData === 'object') {
        normalizedCourse.courseTitle = jsonData.courseTitle || jsonData.title || 'Curso sin título';
        normalizedCourse.description = jsonData.description || '';

        if (Array.isArray(jsonData.playlists) && jsonData.playlists.length > 0) {
          normalizedCourse.playlists = jsonData.playlists.map((pl, pIdx) => ({
            id: pl.id || `pl-${pIdx}-${Date.now()}`,
            title: pl.title || `Módulo ${pIdx + 1}`,
            videos: Array.isArray(pl.videos) ? pl.videos.map((v, vIdx) => this._normalizeVideo(v, `${pIdx}-${vIdx}`)) : []
          }));
        } else if (Array.isArray(jsonData.videos)) {
          normalizedCourse.playlists.push({
            id: 'playlist-main',
            title: 'Lista Principal',
            videos: jsonData.videos.map((v, i) => this._normalizeVideo(v, i))
          });
        } else {
          return { success: false, message: 'El JSON debe contener un arreglo de videos o de playlists.' };
        }

        // Preservar apuntes si vienen en el archivo JSON
        if (typeof jsonData.notes === 'string') {
          normalizedCourse.notes = jsonData.notes;
          LocalStorageManager.set('course_player_notes', jsonData.notes);
        } else {
          // Si no vienen en el JSON, mantener los apuntes que el usuario ya tenía guardados
          normalizedCourse.notes = LocalStorageManager.get('course_player_notes', '');
        }

        // Recursos / enlaces vinculados al curso
        normalizedCourse.resources = Array.isArray(jsonData.resources)
          ? jsonData.resources
          : (Array.isArray(jsonData.attachments) ? jsonData.attachments : []);
      } else {
        return { success: false, message: 'Formato JSON no reconocido.' };
      }

      // Validar que al menos haya un video
      const allVideos = [];
      normalizedCourse.playlists.forEach(pl => allVideos.push(...pl.videos));
      if (allVideos.length === 0) {
        return { success: false, message: 'No se encontraron videos válidos en el archivo JSON.' };
      }

      this.course = normalizedCourse;
      LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);

      // Si el video actual no está en la nueva lista, seleccionar el primero
      if (!this.getVideoById(this.currentVideoId)) {
        this.currentVideoId = allVideos[0].id;
        LocalStorageManager.set(STORAGE_KEYS.CURRENT_VIDEO_ID, this.currentVideoId);
      }

      this.notify();
      return { success: true };
    } catch (error) {
      console.error('[CourseManager] Error al procesar JSON:', error);
      return { success: false, message: error.message || 'Error al procesar el archivo JSON.' };
    }
  }

  /**
   * Normaliza los datos de un video garantizando IDs y URLs válidos,
   * con soporte para fraccionamiento por minutos (start / end).
   * @private
   */
  _normalizeVideo(rawVideo, index) {
    const rawUrl = rawVideo.url || rawVideo.link || rawVideo.youtubeUrl || '';
    const videoId = YouTubeUtils.extractVideoId(rawUrl) || rawVideo.id;

    // Normalizar tiempos de inicio y fin (soporta '02:30', '150', etc.)
    const startTime = YouTubeUtils.parseTimeToSeconds(rawVideo.start ?? rawVideo.startTime);
    const endTime = YouTubeUtils.parseTimeToSeconds(rawVideo.end ?? rawVideo.endTime);

    // ID único garantizado incluso para múltiples fragmentos del mismo video
    const segmentSuffix = (startTime !== null || endTime !== null) 
      ? `-seg_${startTime || 0}_${endTime || 'end'}` 
      : '';
    const uniqueId = String(rawVideo.id || `vid-${videoId || index}${segmentSuffix}-${index}`);

    return {
      id: uniqueId,
      youtubeId: videoId,
      url: rawUrl,
      title: rawVideo.title || `Video ${index + 1}`,
      description: rawVideo.description || rawVideo.desc || '',
      startTime: startTime,
      endTime: endTime,
      startFormatted: startTime !== null ? YouTubeUtils.formatSecondsToTime(startTime) : null,
      endFormatted: endTime !== null ? YouTubeUtils.formatSecondsToTime(endTime) : null
    };
  }

  /**
   * Obtiene todos los videos de todas las listas en un arreglo plano
   * @returns {Array}
   */
  getAllVideos() {
    if (!this.course || !Array.isArray(this.course.playlists)) return [];
    return this.course.playlists.reduce((acc, pl) => acc.concat(pl.videos || []), []);
  }

  /**
   * Busca un video por su ID único
   * @param {string} id 
   */
  getVideoById(id) {
    if (!id) return null;
    return this.getAllVideos().find(v => v.id === id) || null;
  }

  /**
   * Obtiene el video actualmente seleccionado
   */
  getCurrentVideo() {
    return this.getVideoById(this.currentVideoId);
  }

  /**
   * Cambia el video actual activo
   * @param {string} videoId 
   */
  setCurrentVideo(videoId) {
    const video = this.getVideoById(videoId);
    if (video) {
      this.currentVideoId = videoId;
      LocalStorageManager.set(STORAGE_KEYS.CURRENT_VIDEO_ID, videoId);
      this.notify();
    }
  }

  /**
   * Obtiene el video anterior al actual
   */
  getPrevVideo() {
    const all = this.getAllVideos();
    const currentIndex = all.findIndex(v => v.id === this.currentVideoId);
    if (currentIndex > 0) {
      return all[currentIndex - 1];
    }
    return null;
  }

  /**
   * Obtiene el siguiente video al actual
   */
  getNextVideo() {
    const all = this.getAllVideos();
    const currentIndex = all.findIndex(v => v.id === this.currentVideoId);
    if (currentIndex >= 0 && currentIndex < all.length - 1) {
      return all[currentIndex + 1];
    }
    return null;
  }

  /**
   * Comprueba si un video está marcado como visto
   * @param {string} videoId 
   * @returns {boolean}
   */
  isVideoWatched(videoId) {
    return this.watchedVideoIds.has(videoId);
  }

  /**
   * Alterna el estado visto / no visto de un video y persiste en localStorage
   * @param {string} videoId 
   */
  toggleVideoWatched(videoId) {
    if (!videoId) return;

    if (this.watchedVideoIds.has(videoId)) {
      this.watchedVideoIds.delete(videoId);
    } else {
      this.watchedVideoIds.add(videoId);
    }

    LocalStorageManager.set(STORAGE_KEYS.WATCHED_VIDEOS, Array.from(this.watchedVideoIds));
    this.notify();
  }

  /**
   * Marca o desmarca explícitamente un video
   * @param {string} videoId 
   * @param {boolean} watched 
   */
  setVideoWatched(videoId, watched) {
    if (!videoId) return;
    if (watched) {
      this.watchedVideoIds.add(videoId);
    } else {
      this.watchedVideoIds.delete(videoId);
    }
    LocalStorageManager.set(STORAGE_KEYS.WATCHED_VIDEOS, Array.from(this.watchedVideoIds));
    this.notify();
  }

  /**
   * Calcula estadísticas de progreso (completados, total, porcentaje)
   * @returns {{ total: number, completed: number, percentage: number }}
   */
  getProgress() {
    const allVideos = this.getAllVideos();
    const total = allVideos.length;
    if (total === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const completed = allVideos.filter(v => this.watchedVideoIds.has(v.id)).length;
    const percentage = Math.round((completed / total) * 100);

    return { total, completed, percentage };
  }

  /**
   * Agrega manualmente un nuevo video a una lista existente o crea una nueva
   * Soporta fraccionamiento por minutos (startTime y endTime)
   * @param {Object} videoData - { title, url, description, playlistId, newPlaylistTitle, startTime, endTime }
   */
  addManualVideo({ title, url, description, playlistId, newPlaylistTitle, startTime = null, endTime = null }) {
    if (!this.course) {
      this.course = {
        courseTitle: 'Mi Curso Personal',
        description: 'Videos agregados por el usuario',
        playlists: []
      };
    }

    const youtubeId = YouTubeUtils.extractVideoId(url);
    if (!youtubeId) {
      throw new Error('La URL de YouTube no es válida o no se pudo extraer el ID.');
    }

    // Normalizar inicio y fin
    const parsedStart = YouTubeUtils.parseTimeToSeconds(startTime);
    const parsedEnd = YouTubeUtils.parseTimeToSeconds(endTime);

    if (parsedStart !== null && parsedEnd !== null && parsedStart >= parsedEnd) {
      throw new Error('El minuto de inicio debe ser menor que el minuto de fin.');
    }

    const segmentTag = (parsedStart !== null || parsedEnd !== null)
      ? `-seg_${parsedStart || 0}_${parsedEnd || 'end'}`
      : '';

    const newVideo = {
      id: `manual-vid-${youtubeId}${segmentTag}-${Date.now()}`,
      youtubeId: youtubeId,
      url: url.trim(),
      title: title.trim() || 'Nuevo Video',
      description: description ? description.trim() : '',
      startTime: parsedStart,
      endTime: parsedEnd,
      startFormatted: parsedStart !== null ? YouTubeUtils.formatSecondsToTime(parsedStart) : null,
      endFormatted: parsedEnd !== null ? YouTubeUtils.formatSecondsToTime(parsedEnd) : null
    };

    // Determinar la lista de destino
    let targetPlaylist = null;
    if (playlistId) {
      targetPlaylist = this.course.playlists.find(pl => pl.id === playlistId);
    }

    // Si no se encontró o se pidió una nueva lista
    if (!targetPlaylist && newPlaylistTitle) {
      targetPlaylist = {
        id: `pl-${Date.now()}`,
        title: newPlaylistTitle.trim(),
        videos: []
      };
      this.course.playlists.push(targetPlaylist);
    } else if (!targetPlaylist) {
      if (this.course.playlists.length > 0) {
        targetPlaylist = this.course.playlists[0];
      } else {
        targetPlaylist = {
          id: `pl-${Date.now()}`,
          title: 'Módulo Principal',
          videos: []
        };
        this.course.playlists.push(targetPlaylist);
      }
    }

    targetPlaylist.videos.push(newVideo);
    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);

    // Si no había video activo, poner este
    if (!this.currentVideoId) {
      this.currentVideoId = newVideo.id;
      LocalStorageManager.set(STORAGE_KEYS.CURRENT_VIDEO_ID, this.currentVideoId);
    }

    this.notify();
    return newVideo;
  }

  /**
   * Crea una nueva lista de reproducción / módulo
   * @param {string} title 
   */
  createPlaylist(title) {
    if (!this.course) {
      this.course = {
        courseTitle: 'Mi Curso',
        description: '',
        playlists: []
      };
    }

    const newPlaylist = {
      id: `pl-${Date.now()}`,
      title: title.trim() || 'Nuevo Módulo',
      videos: []
    };

    this.course.playlists.push(newPlaylist);
    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return newPlaylist;
  }

  /**
   * Actualiza el título de un módulo o lista de reproducción
   * @param {string} playlistId 
   * @param {string} newTitle 
   * @returns {boolean}
   */
  updatePlaylistTitle(playlistId, newTitle) {
    if (!this.course || !Array.isArray(this.course.playlists)) return false;
    const cleanTitle = newTitle ? newTitle.trim() : '';
    if (!cleanTitle) return false;

    const playlist = this.course.playlists.find(pl => pl.id === playlistId);
    if (playlist) {
      playlist.title = cleanTitle;
      LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Actualiza el título principal del curso
   * @param {string} newTitle 
   * @returns {boolean}
   */
  updateCourseTitle(newTitle) {
    const cleanTitle = newTitle ? newTitle.trim() : '';
    if (!cleanTitle) return false;

    if (!this.course) {
      this.course = {
        courseTitle: cleanTitle,
        description: '',
        playlists: []
      };
    } else {
      this.course.courseTitle = cleanTitle;
    }

    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return true;
  }

  /**
   * Elimina un módulo completo y sus videos asociados
   * @param {string} playlistId 
   * @returns {boolean}
   */
  deletePlaylist(playlistId) {
    if (!this.course || !Array.isArray(this.course.playlists)) return false;
    const idx = this.course.playlists.findIndex(pl => pl.id === playlistId);
    if (idx === -1) return false;

    const [removedPlaylist] = this.course.playlists.splice(idx, 1);

    // Limpiar estado de videos vistos de este módulo
    if (Array.isArray(removedPlaylist.videos)) {
      removedPlaylist.videos.forEach(v => {
        this.watchedVideoIds.delete(v.id);
        if (this.currentVideoId === v.id) {
          this.currentVideoId = null;
        }
      });
      LocalStorageManager.set(STORAGE_KEYS.WATCHED_VIDEOS, Array.from(this.watchedVideoIds));
    }

    // Si el video actual eliminado estaba en este módulo, reasignar al primer video restante
    if (!this.currentVideoId) {
      const all = this.getAllVideos();
      this.currentVideoId = all.length > 0 ? all[0].id : null;
      LocalStorageManager.set(STORAGE_KEYS.CURRENT_VIDEO_ID, this.currentVideoId);
    }

    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return true;
  }

  /**
   * Actualiza los datos de un video / lección existente
   * @param {string} videoId 
   * @param {Object} updatedData - { title, url, description, startTime, endTime, playlistId }
   * @returns {boolean}
   */
  updateVideo(videoId, { title, url, description, startTime = null, endTime = null, playlistId = null }) {
    if (!this.course || !Array.isArray(this.course.playlists)) return false;

    // Localizar el video y su lista actual
    let sourcePlaylist = null;
    let targetVideo = null;
    let videoIndex = -1;

    for (const pl of this.course.playlists) {
      const idx = pl.videos.findIndex(v => v.id === videoId);
      if (idx !== -1) {
        sourcePlaylist = pl;
        targetVideo = pl.videos[idx];
        videoIndex = idx;
        break;
      }
    }

    if (!targetVideo) {
      throw new Error('No se encontró el video especificado en el curso.');
    }

    // Validar enlace de YouTube
    const youtubeId = YouTubeUtils.extractVideoId(url);
    if (!youtubeId) {
      throw new Error('La URL de YouTube no es válida o no se pudo extraer el ID del video.');
    }

    // Normalizar minutos de inicio y fin
    const parsedStart = YouTubeUtils.parseTimeToSeconds(startTime);
    const parsedEnd = YouTubeUtils.parseTimeToSeconds(endTime);

    if (parsedStart !== null && parsedEnd !== null && parsedStart >= parsedEnd) {
      throw new Error('El minuto de inicio debe ser menor que el minuto de fin.');
    }

    // Actualizar campos
    targetVideo.title = title ? title.trim() : targetVideo.title;
    targetVideo.url = url ? url.trim() : targetVideo.url;
    targetVideo.youtubeId = youtubeId;
    targetVideo.description = description !== undefined ? description.trim() : targetVideo.description;
    targetVideo.startTime = parsedStart;
    targetVideo.endTime = parsedEnd;
    targetVideo.startFormatted = parsedStart !== null ? YouTubeUtils.formatSecondsToTime(parsedStart) : null;
    targetVideo.endFormatted = parsedEnd !== null ? YouTubeUtils.formatSecondsToTime(parsedEnd) : null;

    // Si se reasignó a otro módulo
    if (playlistId && playlistId !== sourcePlaylist.id) {
      const destPlaylist = this.course.playlists.find(pl => pl.id === playlistId);
      if (destPlaylist) {
        sourcePlaylist.videos.splice(videoIndex, 1);
        destPlaylist.videos.push(targetVideo);
      }
    }

    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return true;
  }

  /**
   * Reordena un video a una nueva posición dentro del mismo módulo o entre módulos
   * @param {string} sourceVideoId - ID del video que se arrastra
   * @param {string} targetVideoId - ID del video sobre el que se suelta
   * @param {boolean} insertAfter - Si true, se inserta después del target; si false, antes
   * @returns {boolean}
   */
  reorderVideo(sourceVideoId, targetVideoId, insertAfter = false) {
    if (!this.course || !Array.isArray(this.course.playlists) || sourceVideoId === targetVideoId) {
      return false;
    }

    // 1. Encontrar el video de origen y su módulo
    let sourcePlaylist = null;
    let sourceIndex = -1;
    let draggedVideo = null;

    for (const pl of this.course.playlists) {
      const idx = pl.videos.findIndex(v => v.id === sourceVideoId);
      if (idx !== -1) {
        sourcePlaylist = pl;
        sourceIndex = idx;
        draggedVideo = pl.videos[idx];
        break;
      }
    }

    if (!draggedVideo) return false;

    // 2. Encontrar el video de destino y su módulo
    let targetPlaylist = null;
    let targetIndex = -1;

    for (const pl of this.course.playlists) {
      const idx = pl.videos.findIndex(v => v.id === targetVideoId);
      if (idx !== -1) {
        targetPlaylist = pl;
        targetIndex = idx;
        break;
      }
    }

    if (!targetPlaylist || targetIndex === -1) return false;

    // 3. Remover el video de la lista de origen
    sourcePlaylist.videos.splice(sourceIndex, 1);

    // 4. Si es en la misma lista y el origen estaba antes que el destino, el targetIndex se ajusta
    if (sourcePlaylist.id === targetPlaylist.id && sourceIndex < targetIndex) {
      targetIndex--;
    }

    // 5. Calcular la posición final de inserción
    const finalIndex = insertAfter ? targetIndex + 1 : targetIndex;

    // 6. Insertar en la posición calculada
    targetPlaylist.videos.splice(finalIndex, 0, draggedVideo);

    // 7. Persistir y notificar
    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return true;
  }

  /**
   * Mueve un video a un módulo destino (por ejemplo, a un módulo vacío)
   * @param {string} sourceVideoId 
   * @param {string} targetPlaylistId 
   * @returns {boolean}
   */
  moveVideoToPlaylist(sourceVideoId, targetPlaylistId) {
    if (!this.course || !Array.isArray(this.course.playlists)) return false;

    let draggedVideo = null;
    for (const pl of this.course.playlists) {
      const idx = pl.videos.findIndex(v => v.id === sourceVideoId);
      if (idx !== -1) {
        draggedVideo = pl.videos.splice(idx, 1)[0];
        break;
      }
    }

    if (!draggedVideo) return false;

    const destPlaylist = this.course.playlists.find(pl => pl.id === targetPlaylistId);
    if (!destPlaylist) return false;

    destPlaylist.videos.push(draggedVideo);
    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    this.notify();
    return true;
  }

  /**
   * Elimina un video por su ID
   * @param {string} videoId 
   */
  deleteVideo(videoId) {
    if (!this.course) return;

    for (const pl of this.course.playlists) {
      const idx = pl.videos.findIndex(v => v.id === videoId);
      if (idx !== -1) {
        pl.videos.splice(idx, 1);
        this.watchedVideoIds.delete(videoId);
        LocalStorageManager.set(STORAGE_KEYS.WATCHED_VIDEOS, Array.from(this.watchedVideoIds));

        // Si eliminamos el actual, cambiar al siguiente o anterior
        if (this.currentVideoId === videoId) {
          const all = this.getAllVideos();
          this.currentVideoId = all.length > 0 ? all[0].id : null;
          LocalStorageManager.set(STORAGE_KEYS.CURRENT_VIDEO_ID, this.currentVideoId);
        }

        LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
        this.notify();
        return true;
      }
    }
    return false;
  }

  /**
   * Actualiza los criterios de filtrado y búsqueda
   * @param {string} query 
   * @param {'all' | 'pending' | 'completed'} filter 
   */
  setFilter(query = '', filter = 'all') {
    this.searchQuery = query.toLowerCase().trim();
    this.currentFilter = filter;
    this.notify();
  }

  /**
   * Obtiene las playlists filtradas según la búsqueda y el filtro actual
   */
  getFilteredPlaylists() {
    if (!this.course || !Array.isArray(this.course.playlists)) return [];

    return this.course.playlists.map(pl => {
      const filteredVideos = pl.videos.filter(v => {
        // Filtro por texto
        const matchesQuery = !this.searchQuery ||
          v.title.toLowerCase().includes(this.searchQuery) ||
          (v.description && v.description.toLowerCase().includes(this.searchQuery));

        if (!matchesQuery) return false;

        // Filtro por estado
        const isWatched = this.watchedVideoIds.has(v.id);
        if (this.currentFilter === 'pending') return !isWatched;
        if (this.currentFilter === 'completed') return isWatched;
        return true;
      });

      return {
        ...pl,
        videos: filteredVideos
      };
    });
  }

  /**
   * Obtiene las notas de la libreta de apuntes del curso actual
   * @returns {string}
   */
  getNotes() {
    if (this.course && typeof this.course.notes === 'string') {
      return this.course.notes;
    }
    return LocalStorageManager.get('course_player_notes', '') || '';
  }

  /**
   * Guarda automáticamente las notas en el curso y en localStorage
   * @param {string} text 
   */
  setNotes(text) {
    if (!this.course) {
      this.course = {
        courseTitle: 'Mi Curso Personal',
        description: '',
        playlists: [],
        notes: ''
      };
    }
    this.course.notes = text;
    LocalStorageManager.set(STORAGE_KEYS.COURSE_DATA, this.course);
    LocalStorageManager.set('course_player_notes', text);
  }

  /**
   * Cierra y desconecta el curso actual de la sesión, dejando el espacio en limpio
   */
  closeCourse() {
    this.course = null;
    this.currentVideoId = null;
    this.watchedVideoIds.clear();

    LocalStorageManager.remove(STORAGE_KEYS.COURSE_DATA);
    LocalStorageManager.remove(STORAGE_KEYS.CURRENT_VIDEO_ID);
    LocalStorageManager.remove(STORAGE_KEYS.WATCHED_VIDEOS);
    LocalStorageManager.remove('course_player_notes');

    // Desconectar y limpiar recursos de la sesión si AttachmentManager está cargado
    if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.clearAll === 'function') {
      AttachmentManager.clearAll();
    }

    this.notify();
    return true;
  }
}

