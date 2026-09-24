/**
 * youtube.js
 * Módulo de utilidades para enlaces de YouTube.
 * Permite extraer de forma robusta el ID de video de múltiples formatos de URLs,
 * generar URLs para inserción en iframe y obtener miniaturas oficiales.
 */

const YouTubeUtils = {
  /**
   * Expresión regular universal para extraer IDs de video de YouTube
   * Soporta: watch?v=, youtu.be/, embed/, shorts/, live/, v=
   */
  extractVideoId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;

    const trimmed = urlOrId.trim();

    // Si ya es un ID de video válido (exactamente 11 caracteres típicos de YouTube)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Patrones comunes de URL de YouTube
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|(?:shorts|live)\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regex);

    return match ? match[1] : null;
  },

  /**
   * Convierte un valor de tiempo (string 'MM:SS', 'HH:MM:SS' o número en segundos) a segundos enteros
   * @param {string|number} timeVal 
   * @returns {number|null}
   */
  parseTimeToSeconds(timeVal) {
    if (timeVal === null || timeVal === undefined || timeVal === '') return null;

    if (typeof timeVal === 'number') {
      return !isNaN(timeVal) && timeVal >= 0 ? Math.floor(timeVal) : null;
    }

    const str = String(timeVal).trim();
    if (!str) return null;

    // Si es un número en texto puro: "120"
    if (/^\d+$/.test(str)) {
      return parseInt(str, 10);
    }

    // Si contiene formato MM:SS o HH:MM:SS
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.some(p => isNaN(p))) return null;

    if (parts.length === 2) {
      // MM:SS
      const [minutes, seconds] = parts;
      return (minutes * 60) + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS
      const [hours, minutes, seconds] = parts;
      return (hours * 3600) + (minutes * 60) + seconds;
    }

    return null;
  },

  /**
   * Formatea una cantidad de segundos a formato legible MM:SS o HH:MM:SS
   * @param {number} totalSeconds 
   * @returns {string}
   */
  formatSecondsToTime(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) return '00:00';

    const sec = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  },

  /**
   * Genera el enlace embed para iframe seguro con YouTube
   * Soporta inicio (start) y finalización automática (end)
   * @param {string} videoId 
   * @param {boolean} autoplay 
   * @param {number|null} startTime (en segundos)
   * @param {number|null} endTime (en segundos)
   * @returns {string}
   */
  getEmbedUrl(videoId, autoplay = false, startTime = null, endTime = null) {
    if (!videoId) return '';
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      enablejsapi: '1'
    });

    // Fraccionamiento: tiempo de inicio
    if (startTime !== null && !isNaN(startTime) && startTime > 0) {
      params.append('start', Math.floor(startTime));
    }

    // Fraccionamiento: tiempo de fin (YouTube detiene la reproducción automáticamente)
    if (endTime !== null && !isNaN(endTime) && endTime > 0) {
      params.append('end', Math.floor(endTime));
    }

    // Si nos encontramos bajo un servidor HTTP/HTTPS, pasar el origen actual
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')) {
      params.append('origin', window.location.origin);
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  },

  /**
   * Genera la URL de la miniatura de alta o media calidad
   * @param {string} videoId 
   * @param {'hq' | 'mq' | 'max'} quality 
   * @returns {string}
   */
  getThumbnailUrl(videoId, quality = 'mq') {
    if (!videoId) return '';
    switch (quality) {
      case 'max':
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      case 'hq':
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      case 'mq':
      default:
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  },

  /**
   * Genera el enlace canónico directo a YouTube
   * @param {string} videoId 
   * @returns {string}
   */
  getWatchUrl(videoId) {
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#';
  }
};
