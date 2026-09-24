/**
 * app.js - LICStreamEdu
 * Controlador principal de la aplicación.
 * Orquesta la interfaz de usuario, eventos, reproductor de YouTube,
 * modales, carga de JSON, gestión de archivos y persistencia.
 */

// Instancia global del gestor de cursos
const courseManager = new CourseManager();

// ==========================================
// 1. UTILIDADES Y SISTEMA DE TOASTS
// ==========================================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  
  // Icono SVG según el tipo
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ==========================================
// 2. CONTROL DE VENTANAS MODALES
// ==========================================
const ModalController = {
  activeModalId: null,

  init() {
    // Escuchar botones de cierre
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close-modal');
        this.close(modalId);
      });
    });

    // Cerrar al hacer clic en el backdrop exterior
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close(backdrop.id);
        }
      });
    });

    // Cerrar con la tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModalId) {
        this.close(this.activeModalId);
      }
    });
  },

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    this.activeModalId = modalId;
    document.body.style.overflow = 'hidden';
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    this.activeModalId = null;
    document.body.style.overflow = '';
  }
};

// ==========================================
// 3. RENDERIZADO DE LA INTERFAZ
// ==========================================
const UIRenderer = {
  /**
   * Actualiza el widget de progreso global y cabeceras
   */
  renderProgress(manager) {
    const progress = manager.getProgress();
    const progressText = document.getElementById('progressText');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressBarFill = document.getElementById('progressBarFill');
    const sidebarTotalCount = document.getElementById('sidebarTotalCount');
    const sidebarCourseTitle = document.getElementById('sidebarCourseTitle');

    if (progressText) {
      progressText.textContent = `${progress.completed} de ${progress.total} completados`;
    }
    if (progressPercentage) {
      progressPercentage.textContent = `${progress.percentage}%`;
    }
    if (progressBarFill) {
      progressBarFill.style.width = `${progress.percentage}%`;
    }
    if (sidebarTotalCount) {
      sidebarTotalCount.textContent = `${progress.total} video${progress.total === 1 ? '' : 's'}`;
    }
    if (sidebarCourseTitle) {
      sidebarCourseTitle.textContent = (manager.course && manager.course.courseTitle)
        ? manager.course.courseTitle
        : 'Contenido del Curso';
    }

    // Actualizar contadores de pestañas de filtro
    const allVideos = manager.getAllVideos();
    const completedCount = allVideos.filter(v => manager.isVideoWatched(v.id)).length;
    const pendingCount = allVideos.length - completedCount;

    const countAll = document.getElementById('filterCountAll');
    const countPending = document.getElementById('filterCountPending');
    const countCompleted = document.getElementById('filterCountCompleted');

    if (countAll) countAll.textContent = allVideos.length;
    if (countPending) countPending.textContent = pendingCount;
    if (countCompleted) countCompleted.textContent = completedCount;
  },

  /**
   * Renderiza el reproductor principal y la información del video activo
   */
  renderPlayer(manager) {
    const currentVideo = manager.getCurrentVideo();
    const emptyState = document.getElementById('emptyPlayerState');
    const iframe = document.getElementById('youtubeIframe');
    const btnToggleWatched = document.getElementById('btnToggleWatched');
    const btnWatchedLabel = document.getElementById('btnWatchedLabel');
    const btnPrevVideo = document.getElementById('btnPrevVideo');
    const btnNextVideo = document.getElementById('btnNextVideo');
    const btnOpenExternal = document.getElementById('btnOpenYouTubeExternal');
    const currentModuleBadge = document.getElementById('currentModuleBadge');
    const currentStatusBadge = document.getElementById('currentStatusBadge');
    const currentVideoTitle = document.getElementById('currentVideoTitle');
    const currentVideoDescription = document.getElementById('currentVideoDescription');

    if (!currentVideo) {
      // Estado vacío
      if (emptyState) emptyState.classList.remove('hidden');
      if (iframe) {
        iframe.classList.add('hidden');
        iframe.src = '';
      }
      if (btnToggleWatched) btnToggleWatched.disabled = true;
      if (btnPrevVideo) btnPrevVideo.disabled = true;
      if (btnNextVideo) btnNextVideo.disabled = true;
      if (btnOpenExternal) btnOpenExternal.href = '#';

      if (currentVideoTitle) currentVideoTitle.textContent = 'Ninguna lección seleccionada';
      if (currentVideoDescription) currentVideoDescription.textContent = 'Carga un curso o agrega un nuevo video para comenzar.';
      if (currentStatusBadge) {
        currentStatusBadge.textContent = 'Pendiente';
        currentStatusBadge.classList.remove('completed');
      }
      const segmentBadge = document.getElementById('currentSegmentBadge');
      if (segmentBadge) segmentBadge.classList.add('hidden');
      return;
    }

    // Hay un video activo
    if (emptyState) emptyState.classList.add('hidden');
    if (iframe) {
      const targetEmbedUrl = YouTubeUtils.getEmbedUrl(
        currentVideo.youtubeId,
        false,
        currentVideo.startTime,
        currentVideo.endTime
      );
      // Evitar recargar el iframe si ya es exactamente la misma URL
      if (iframe.src !== targetEmbedUrl) {
        iframe.src = targetEmbedUrl;
      }
      iframe.classList.remove('hidden');
    }

    // Datos del video
    if (currentVideoTitle) currentVideoTitle.textContent = currentVideo.title;
    if (currentVideoDescription) {
      currentVideoDescription.textContent = currentVideo.description || 'Sin descripción adicional para esta lección.';
    }

    // Módulo al que pertenece
    if (currentModuleBadge && manager.course) {
      const parentModule = manager.course.playlists.find(pl => pl.videos.some(v => v.id === currentVideo.id));
      currentModuleBadge.textContent = parentModule ? parentModule.title : 'Lección';
    }

    // Estado completado
    const isWatched = manager.isVideoWatched(currentVideo.id);
    if (btnToggleWatched) {
      btnToggleWatched.disabled = false;
      if (isWatched) {
        btnToggleWatched.classList.add('completed');
        if (btnWatchedLabel) btnWatchedLabel.textContent = 'Completado';
      } else {
        btnToggleWatched.classList.remove('completed');
        if (btnWatchedLabel) btnWatchedLabel.textContent = 'Marcar como completado';
      }
    }

    if (currentStatusBadge) {
      if (isWatched) {
        currentStatusBadge.textContent = 'Completado';
        currentStatusBadge.classList.add('completed');
      } else {
        currentStatusBadge.textContent = 'Pendiente';
        currentStatusBadge.classList.remove('completed');
      }
    }

    // Navegación Anterior / Siguiente
    if (btnPrevVideo) btnPrevVideo.disabled = !manager.getPrevVideo();
    if (btnNextVideo) btnNextVideo.disabled = !manager.getNextVideo();

    // Enlace externo
    if (btnOpenExternal) {
      btnOpenExternal.href = currentVideo.url || YouTubeUtils.getWatchUrl(currentVideo.youtubeId);
    }
  },

  /**
   * Renderiza la lista de módulos y videos en el panel lateral (Acordeón)
   */
  renderPlaylist(manager) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    const playlists = manager.getFilteredPlaylists();
    const isFiltered = Boolean(manager.searchQuery || manager.currentFilter !== 'all');

    if (!playlists || playlists.length === 0 || (isFiltered && playlists.every(p => p.videos.length === 0))) {
      container.innerHTML = `
        <div class="empty-list-notice">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.6;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No se encontraron lecciones con los filtros aplicados.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = playlists.map((pl, pIdx) => {
      if (isFiltered && pl.videos.length === 0) return '';

      const videosHtml = pl.videos.length === 0
        ? `<div class="empty-module-hint" style="padding: 12px 16px; font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Módulo sin lecciones aún. Usa "Agregar Video" para añadir contenido.</div>`
        : pl.videos.map((vid, vIdx) => {
        const isActive = vid.id === manager.currentVideoId;
        const isWatched = manager.isVideoWatched(vid.id);
        const thumbUrl = YouTubeUtils.getThumbnailUrl(vid.youtubeId, 'mq');

        return `
          <div 
            class="video-item ${isActive ? 'active' : ''} ${isWatched ? 'completed' : ''}" 
            data-video-id="${vid.id}"
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="Reproducir ${vid.title}">
            
            <!-- Grip para arrastrar y reordenar -->
            <div class="video-item-grip" title="Arrastra para reordenar" aria-hidden="true">
              <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
                <circle cx="3" cy="3" r="1.5"></circle>
                <circle cx="7" cy="3" r="1.5"></circle>
                <circle cx="3" cy="8" r="1.5"></circle>
                <circle cx="7" cy="8" r="1.5"></circle>
                <circle cx="3" cy="13" r="1.5"></circle>
                <circle cx="7" cy="13" r="1.5"></circle>
              </svg>
            </div>

            <!-- Checkbox circular de completado -->
            <button 
              type="button" 
              class="video-item-check" 
              data-action="toggle-watch" 
              data-video-id="${vid.id}"
              title="${isWatched ? 'Marcar como pendiente' : 'Marcar como visto'}"
              aria-label="${isWatched ? 'Marcar como pendiente' : 'Marcar como visto'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>

            <!-- Miniatura -->
            <div class="video-item-thumb-wrap">
              <img src="${thumbUrl}" alt="" class="video-item-thumb" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 60\\' fill=\\'%23162035\\'%3E%3C/svg%3E'">
            </div>

            <!-- Título y metadatos -->
            <div class="video-item-info">
              <h4 class="video-item-title">${vid.title}</h4>
              <div class="video-item-meta">
                <span>Lección ${vIdx + 1}</span>
                ${isWatched ? '<span>• Visto</span>' : ''}
              </div>
            </div>

            <!-- Acciones del video: Editar y Eliminar -->
            <div class="video-item-actions">
              <button 
                type="button" 
                class="video-item-action-btn edit" 
                data-action="edit-video" 
                data-video-id="${vid.id}"
                title="Editar datos de la lección"
                aria-label="Editar video">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>

              <button 
                type="button" 
                class="video-item-action-btn delete" 
                data-action="delete-video" 
                data-video-id="${vid.id}"
                title="Eliminar de la lista"
                aria-label="Eliminar video">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>

          </div>
        `;
      }).join('');

      return `
        <div class="playlist-module" data-module-id="${pl.id}">
          <div class="module-header">
            <button type="button" class="module-header-main" data-action="toggle-module" aria-expanded="true" title="Expandir / Colapsar módulo">
              <svg class="module-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="module-title-text" title="${pl.title}">${pl.title}</span>
              <span class="module-video-badge">${pl.videos.length}</span>
            </button>

            <div class="module-actions">
              <button 
                type="button" 
                class="module-action-btn" 
                data-action="edit-module" 
                data-module-id="${pl.id}" 
                data-module-title="${pl.title.replace(/"/g, '&quot;')}"
                title="Renombrar módulo"
                aria-label="Renombrar módulo ${pl.title}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
              <button 
                type="button" 
                class="module-action-btn module-delete-btn" 
                data-action="delete-module" 
                data-module-id="${pl.id}" 
                data-module-title="${pl.title.replace(/"/g, '&quot;')}"
                data-module-count="${pl.videos.length}"
                title="Eliminar módulo"
                aria-label="Eliminar módulo ${pl.title}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="module-video-list">
            ${videosHtml}
          </div>
        </div>
      `;
    }).join('');

    // Eventos delegados dentro del acordeón
    this.attachPlaylistEvents(container, manager);
  },

  /**
   * Asigna eventos interactivos a los items del panel lateral
   */
  attachPlaylistEvents(container, manager) {
    // 1. Alternar colapso de módulo
    container.querySelectorAll('[data-action="toggle-module"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const moduleCard = btn.closest('.playlist-module');
        if (moduleCard) {
          moduleCard.classList.toggle('collapsed');
          const isCollapsed = moduleCard.classList.contains('collapsed');
          btn.setAttribute('aria-expanded', !isCollapsed);
        }
      });
    });

    // 2. Selección de video para reproducir
    container.querySelectorAll('.video-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Ignorar si se hizo clic en el checkbox o en los botones de acción (editar / eliminar)
        if (e.target.closest('[data-action="toggle-watch"]') || e.target.closest('[data-action="delete-video"]') || e.target.closest('[data-action="edit-video"]')) {
          return;
        }
        const videoId = item.getAttribute('data-video-id');
        manager.setCurrentVideo(videoId);

        // En pantallas móviles, cerrar la barra lateral al seleccionar un video
        const sidebar = document.getElementById('playlistSidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && window.innerWidth < 1024) {
          sidebar.classList.remove('open');
          if (backdrop) backdrop.classList.remove('open');
        }
      });
    });

    // 3. Marcar visto desde el checkbox del item
    container.querySelectorAll('[data-action="toggle-watch"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = btn.getAttribute('data-video-id');
        manager.toggleVideoWatched(videoId);
      });
    });

    // 4. Eliminar video individual
    container.querySelectorAll('[data-action="delete-video"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = btn.getAttribute('data-video-id');
        const videoObj = manager.getVideoById(videoId);
        const videoTitle = videoObj?.title || 'este video';

        const idInput = document.getElementById('deleteVideoIdInput');
        const warningText = document.getElementById('deleteVideoWarningText');
        if (idInput) idInput.value = videoId;
        if (warningText) {
          warningText.innerHTML = `¿Deseas eliminar la lección <strong>«${videoTitle}»</strong> de la lista de reproducción?`;
        }

        ModalController.open('modalDeleteVideo');
      });
    });

    // 4b. Editar video individual
    container.querySelectorAll('[data-action="edit-video"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoId = btn.getAttribute('data-video-id');
        if (typeof window.openEditVideoModal === 'function') {
          window.openEditVideoModal(videoId);
        }
      });
    });

    // 5. Renombrar / Editar módulo
    container.querySelectorAll('[data-action="edit-module"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const moduleId = btn.getAttribute('data-module-id');
        const moduleTitle = btn.getAttribute('data-module-title') || '';
        
        const idInput = document.getElementById('editModuleIdInput');
        const nameInput = document.getElementById('editModuleNameInput');
        if (idInput) idInput.value = moduleId;
        if (nameInput) nameInput.value = moduleTitle;

        ModalController.open('modalEditModule');
        setTimeout(() => {
          nameInput?.focus();
          nameInput?.select();
        }, 60);
      });
    });

    // 6. Eliminar módulo
    container.querySelectorAll('[data-action="delete-module"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const moduleId = btn.getAttribute('data-module-id');
        const moduleTitle = btn.getAttribute('data-module-title') || 'este módulo';
        const videoCount = parseInt(btn.getAttribute('data-module-count') || '0', 10);

        const idInput = document.getElementById('deleteModuleIdInput');
        const warningText = document.getElementById('deleteModuleWarningText');
        const alertBox = document.getElementById('deleteModuleAlertBox');

        if (idInput) idInput.value = moduleId;
        if (warningText) {
          warningText.innerHTML = `¿Estás seguro de que deseas eliminar el módulo <strong>«${moduleTitle}»</strong>?`;
        }
        if (alertBox) {
          if (videoCount > 0) {
            alertBox.textContent = `Esta acción no se puede deshacer. Se eliminarán ${videoCount} lección${videoCount === 1 ? '' : 'es'} contenida${videoCount === 1 ? '' : 's'} en este módulo.`;
          } else {
            alertBox.textContent = 'Esta acción eliminará el módulo vacío de forma permanente.';
          }
        }

        ModalController.open('modalDeleteModule');
      });
    });

    // 7. Arrastrar y soltar (Drag and Drop) para reordenar lecciones
    let draggedVideoId = null;

    container.querySelectorAll('.video-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        // No iniciar arrastre si se hizo clic en un botón interactivo
        if (e.target.closest('button')) {
          e.preventDefault();
          return;
        }
        draggedVideoId = item.getAttribute('data-video-id');
        e.dataTransfer.setData('text/plain', draggedVideoId);
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        draggedVideoId = null;
        item.classList.remove('dragging');
        container.querySelectorAll('.video-item').forEach(el => {
          el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const currentItemId = item.getAttribute('data-video-id');
        if (!draggedVideoId || draggedVideoId === currentItemId) {
          return;
        }
        e.dataTransfer.dropEffect = 'move';

        const rect = item.getBoundingClientRect();
        const midPoint = rect.top + (rect.height / 2);

        if (e.clientY < midPoint) {
          item.classList.add('drag-over-top');
          item.classList.remove('drag-over-bottom');
        } else {
          item.classList.add('drag-over-bottom');
          item.classList.remove('drag-over-top');
        }
      });

      item.addEventListener('dragleave', (e) => {
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over-top', 'drag-over-bottom');
        }
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('drag-over-top', 'drag-over-bottom');

        const sourceId = e.dataTransfer.getData('text/plain') || draggedVideoId;
        const targetId = item.getAttribute('data-video-id');

        if (!sourceId || sourceId === targetId) return;

        const rect = item.getBoundingClientRect();
        const midPoint = rect.top + (rect.height / 2);
        const insertAfter = e.clientY >= midPoint;

        const success = manager.reorderVideo(sourceId, targetId, insertAfter);
        if (success) {
          showToast('Orden de lecciones actualizado', 'info', 2000);
        }
      });
    });

    // Permitir soltar en módulos vacíos para mover lecciones
    container.querySelectorAll('.playlist-module').forEach(moduleEl => {
      moduleEl.addEventListener('dragover', (e) => {
        if (!draggedVideoId) return;
        const videosInModule = moduleEl.querySelectorAll('.video-item');
        if (videosInModule.length === 0) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          moduleEl.classList.add('drag-over-empty-module');
        }
      });

      moduleEl.addEventListener('dragleave', (e) => {
        if (!moduleEl.contains(e.relatedTarget)) {
          moduleEl.classList.remove('drag-over-empty-module');
        }
      });

      moduleEl.addEventListener('drop', (e) => {
        moduleEl.classList.remove('drag-over-empty-module');
        const videosInModule = moduleEl.querySelectorAll('.video-item');
        const targetModuleId = moduleEl.getAttribute('data-module-id');
        if (videosInModule.length === 0 && draggedVideoId && targetModuleId) {
          e.preventDefault();
          e.stopPropagation();
          manager.moveVideoToPlaylist(draggedVideoId, targetModuleId);
          showToast('Lección movida al módulo', 'info', 2000);
        }
      });
    });
  },

  /**
   * Renderiza la lista de archivos adjuntos en el modal de recursos
   */
  renderAttachments(attachments) {
    const listContainer = document.getElementById('attachmentsListContainer');
    const badge = document.getElementById('attachmentsCountBadge');
    const listCount = document.getElementById('attachmentsListCount');

    const total = attachments.length;
    if (badge) badge.textContent = total;
    if (listCount) listCount.textContent = total;

    if (!listContainer) return;

    if (total === 0) {
      listContainer.innerHTML = `
        <div class="empty-list-notice" style="padding: 16px;">
          <p>No hay recursos o archivos adicionales agregados aún.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = attachments.map(item => {
      // Icono SVG según sea local o enlace nube
      const iconSvg = item.isCloudLink
        ? `<svg class="attachment-type-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
        : `<svg class="attachment-type-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

      const sizeText = item.isCloudLink ? 'Enlace en la nube' : AttachmentManager.formatSize(item.size);
      const dateText = AttachmentManager.formatDate(item.dateAdded);

      return `
        <div class="attachment-row" data-attachment-id="${item.id}">
          <div class="attachment-row-left">
            ${iconSvg}
            <div class="attachment-name-meta">
              <span class="attachment-name" title="${item.name}">${item.name}</span>
              <span class="attachment-meta-info">${sizeText} • Agregado el ${dateText}</span>
            </div>
          </div>
          <div class="attachment-row-actions">
            <button 
              type="button" 
              class="btn btn-secondary btn-xs" 
              data-action="download-attachment" 
              data-id="${item.id}"
              title="${item.isCloudLink ? 'Abrir enlace' : 'Descargar archivo'}">
              ${item.isCloudLink ? 'Abrir' : 'Descargar'}
            </button>
            <button 
              type="button" 
              class="btn btn-icon btn-xs" 
              style="color: var(--danger);" 
              data-action="delete-attachment" 
              data-id="${item.id}"
              title="Eliminar recurso">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos para descargar y eliminar archivos
    listContainer.querySelectorAll('[data-action="download-attachment"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        AttachmentManager.downloadOrOpen(id);
      });
    });

    listContainer.querySelectorAll('[data-action="delete-attachment"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('¿Deseas eliminar este recurso adicional?')) {
          await AttachmentManager.deleteAttachment(id);
          showToast('Archivo eliminado', 'info');
        }
      });
    });
  },

  /**
   * Actualiza el select de módulos en el formulario de agregar video manual
   */
  updatePlaylistSelect(manager) {
    const select = document.getElementById('manualVideoPlaylistSelect');
    if (!select) return;

    const playlists = manager.course ? manager.course.playlists : [];
    
    let optionsHtml = playlists.map(pl => `
      <option value="${pl.id}">${pl.title}</option>
    `).join('');

    optionsHtml += `<option value="NEW_PLAYLIST">+ Crear nueva lista / módulo...</option>`;
    select.innerHTML = optionsHtml;
  }
};

// ==========================================
// 4. CONFIGURACIÓN DE EVENTOS DE LA APP
// ==========================================
function setupAppEvents() {
  
  // ----------------------------------------
  // A. Modales y Navegación
  // ----------------------------------------
  ModalController.init();

  // Abrir Modal Cargar JSON
  document.getElementById('btnOpenLoadJsonModal')?.addEventListener('click', () => {
    ModalController.open('modalLoadJson');
  });
  document.getElementById('btnEmptyLoadJson')?.addEventListener('click', () => {
    ModalController.open('modalLoadJson');
  });

  // Función reutilizable para exportar el curso actual
  function exportCurrentCourse() {
    if (!courseManager.course || courseManager.getAllVideos().length === 0) {
      showToast('No hay ningún curso para exportar.', 'error');
      return false;
    }

    try {
      // Clonar los datos del curso e incluir los recursos/enlaces guardados
      const courseExportData = JSON.parse(JSON.stringify(courseManager.course));

      if (typeof AttachmentManager !== 'undefined' && Array.isArray(AttachmentManager.attachments)) {
        courseExportData.resources = AttachmentManager.attachments.map(att => ({
          id: att.id,
          name: att.name,
          size: att.size || 0,
          type: att.type || 'application/octet-stream',
          dateAdded: att.dateAdded,
          isCloudLink: Boolean(att.isCloudLink),
          cloudUrl: att.cloudUrl || ''
        }));
      }

      const dataStr = JSON.stringify(courseExportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const fileNameRaw = courseManager.course.courseTitle || 'mi_curso';
      const cleanFileName = fileNameRaw
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ_-]/gi, '_')
        .replace(/_+/g, '_')
        .trim();

      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.download = `${cleanFileName || 'curso'}.json`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('¡Archivo JSON exportado y descargado!', 'success');
      return true;
    } catch (err) {
      console.error('Error al exportar JSON:', err);
      showToast('Error al exportar el archivo JSON.', 'error');
      return false;
    }
  }

  // Exportar / Descargar Curso en archivo JSON
  document.getElementById('btnExportJson')?.addEventListener('click', () => {
    exportCurrentCourse();
  });

  // Abrir Modal Agregar Video
  document.getElementById('btnOpenAddVideoModal')?.addEventListener('click', () => {
    UIRenderer.updatePlaylistSelect(courseManager);
    ModalController.open('modalAddVideo');
  });

  // Abrir Modal Archivos Adjuntos
  document.getElementById('btnOpenAttachmentsModal')?.addEventListener('click', () => {
    ModalController.open('modalAttachments');
  });

  // Abrir Modal Selector de Temas
  document.getElementById('btnOpenThemeModal')?.addEventListener('click', () => {
    ThemeManager.renderThemeOptions(document.getElementById('themesGridContainer'));
    ModalController.open('modalThemeSelector');
  });

  // Menú Móvil Lateral (Abrir / Cerrar)
  const mobileSidebar = document.getElementById('playlistSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  document.getElementById('btnToggleMobileSidebar')?.addEventListener('click', () => {
    mobileSidebar?.classList.add('open');
    sidebarBackdrop?.classList.add('open');
  });

  document.getElementById('btnCloseMobileSidebar')?.addEventListener('click', () => {
    mobileSidebar?.classList.remove('open');
    sidebarBackdrop?.classList.remove('open');
  });

  sidebarBackdrop?.addEventListener('click', () => {
    mobileSidebar?.classList.remove('open');
    sidebarBackdrop?.classList.remove('open');
  });

  // ----------------------------------------
  // B. Controles del Reproductor
  // ----------------------------------------

  // Botón Marcar Visto / No Visto del reproductor
  document.getElementById('btnToggleWatched')?.addEventListener('click', () => {
    const currentVideo = courseManager.getCurrentVideo();
    if (currentVideo) {
      courseManager.toggleVideoWatched(currentVideo.id);
      const isNowWatched = courseManager.isVideoWatched(currentVideo.id);
      showToast(isNowWatched ? '¡Lección completada!' : 'Lección marcada como pendiente', 'success');

      // Si se acaba de marcar como visto y hay siguiente video, avanzar automáticamente
      if (isNowWatched) {
        const nextVideo = courseManager.getNextVideo();
        if (nextVideo) {
          setTimeout(() => {
            courseManager.setCurrentVideo(nextVideo.id);
            showToast(`Siguiente: ${nextVideo.title}`, 'info');
          }, 600);
        }
      }
    }
  });

  // Botones Anterior y Siguiente
  document.getElementById('btnPrevVideo')?.addEventListener('click', () => {
    const prev = courseManager.getPrevVideo();
    if (prev) courseManager.setCurrentVideo(prev.id);
  });

  document.getElementById('btnNextVideo')?.addEventListener('click', () => {
    const next = courseManager.getNextVideo();
    if (next) courseManager.setCurrentVideo(next.id);
  });

  // ----------------------------------------
  // C. Búsqueda y Filtros en la Lista
  // ----------------------------------------
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  searchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (btnClearSearch) {
      if (val.trim()) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
    }
    courseManager.setFilter(val, courseManager.currentFilter);
  });

  btnClearSearch?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      btnClearSearch.classList.add('hidden');
      courseManager.setFilter('', courseManager.currentFilter);
    }
  });

  // Pestañas de Filtro (Todos / Pendientes / Completados)
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const filterType = tab.getAttribute('data-filter');
      courseManager.setFilter(searchInput?.value || '', filterType);
    });
  });

  // Modal Crear Nuevo Módulo / Lista
  const inputModuleName = document.getElementById('inputModuleName');
  const formCreateModule = document.getElementById('formCreateModule');

  document.getElementById('btnCreateNewModule')?.addEventListener('click', () => {
    if (inputModuleName) inputModuleName.value = '';
    ModalController.open('modalCreateModule');
    setTimeout(() => inputModuleName?.focus(), 60);
  });

  formCreateModule?.addEventListener('submit', (e) => {
    e.preventDefault();
    const moduleName = inputModuleName?.value?.trim();
    if (moduleName) {
      courseManager.createPlaylist(moduleName);
      ModalController.close('modalCreateModule');
      showToast(`Módulo "${moduleName}" creado`, 'success');
      if (inputModuleName) inputModuleName.value = '';
    }
  });

  // Modal Editar / Renombrar Módulo
  document.getElementById('formEditModule')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const idInput = document.getElementById('editModuleIdInput');
    const nameInput = document.getElementById('editModuleNameInput');
    const moduleId = idInput?.value;
    const newTitle = nameInput?.value?.trim();

    if (moduleId && newTitle) {
      const success = courseManager.updatePlaylistTitle(moduleId, newTitle);
      if (success) {
        ModalController.close('modalEditModule');
        showToast(`Módulo renombrado a "${newTitle}"`, 'success');
      } else {
        showToast('No se pudo renombrar el módulo', 'error');
      }
    }
  });

  // Modal Editar / Renombrar Título Principal del Curso
  const btnEditCourseTitle = document.getElementById('btnEditCourseTitle');
  const inputCourseTitle = document.getElementById('editCourseTitleInput');

  const openEditCourseTitleModal = () => {
    const currentTitle = courseManager.course?.courseTitle || 'Mi Curso';
    if (inputCourseTitle) {
      inputCourseTitle.value = currentTitle;
    }
    ModalController.open('modalEditCourseTitle');
    setTimeout(() => {
      inputCourseTitle?.focus();
      inputCourseTitle?.select();
    }, 60);
  };

  btnEditCourseTitle?.addEventListener('click', openEditCourseTitleModal);

  // Permitir clic directo sobre el título en la barra lateral para renombrar
  document.getElementById('sidebarCourseTitle')?.addEventListener('click', openEditCourseTitleModal);

  document.getElementById('formEditCourseTitle')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTitle = inputCourseTitle?.value?.trim();
    if (newTitle) {
      courseManager.updateCourseTitle(newTitle);
      ModalController.close('modalEditCourseTitle');
      showToast(`Curso renombrado a "${newTitle}"`, 'success');
    }
  });

  // --- CERRAR / DESCONECTAR CURSO ACTUAL ---
  const btnCloseCourse = document.getElementById('btnCloseCourse');
  const closeCourseSubtitle = document.getElementById('closeCourseSubtitle');
  const btnExportAndCloseCourse = document.getElementById('btnExportAndCloseCourse');
  const btnConfirmCloseCourse = document.getElementById('btnConfirmCloseCourse');

  btnCloseCourse?.addEventListener('click', () => {
    if (!courseManager.course || courseManager.getAllVideos().length === 0) {
      showToast('No hay ningún curso abierto actualmente.', 'info');
      return;
    }

    const title = courseManager.course.courseTitle || 'el curso actual';
    if (closeCourseSubtitle) {
      closeCourseSubtitle.innerHTML = `¿Deseas cerrar el curso <strong>«${title}»</strong> para comenzar uno nuevo?`;
    }

    ModalController.open('modalCloseCourse');
  });

  // Opción 1: Exportar respaldo JSON y cerrar
  btnExportAndCloseCourse?.addEventListener('click', () => {
    exportCurrentCourse();
    courseManager.closeCourse();
    if (typeof NotesManager !== 'undefined' && NotesManager.textarea) {
      NotesManager.loadNotes('');
    }
    if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.clearAll === 'function') {
      AttachmentManager.clearAll();
    }
    ModalController.close('modalCloseCourse');
    showToast('Curso respaldado y cerrado. Lienzo listo para uno nuevo.', 'success');
  });

  // Opción 2: Cerrar directamente sin exportar
  btnConfirmCloseCourse?.addEventListener('click', () => {
    courseManager.closeCourse();
    if (typeof NotesManager !== 'undefined' && NotesManager.textarea) {
      NotesManager.loadNotes('');
    }
    if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.clearAll === 'function') {
      AttachmentManager.clearAll();
    }
    ModalController.close('modalCloseCourse');
    showToast('Curso cerrado. Lienzo listo para un nuevo curso.', 'info');
  });

  // Modal Confirmar Eliminación de Módulo
  document.getElementById('btnConfirmDeleteModule')?.addEventListener('click', () => {
    const idInput = document.getElementById('deleteModuleIdInput');
    const moduleId = idInput?.value;

    if (moduleId) {
      const success = courseManager.deletePlaylist(moduleId);
      if (success) {
        ModalController.close('modalDeleteModule');
        showToast('Módulo eliminado', 'info');
      } else {
        showToast('No se pudo eliminar el módulo', 'error');
      }
    }
  });

  // Modal Confirmar Eliminación de Video
  document.getElementById('btnConfirmDeleteVideo')?.addEventListener('click', () => {
    const idInput = document.getElementById('deleteVideoIdInput');
    const videoId = idInput?.value;

    if (videoId) {
      courseManager.deleteVideo(videoId);
      ModalController.close('modalDeleteVideo');
      showToast('Video eliminado de la lista', 'info');
    }
  });

  // Modal Editar Datos de Video / Lección
  const editVideoIdInput = document.getElementById('editVideoIdInput');
  const editVideoUrl = document.getElementById('editVideoUrl');
  const editVideoTitleInput = document.getElementById('editVideoTitleInput');
  const editVideoStart = document.getElementById('editVideoStart');
  const editVideoEnd = document.getElementById('editVideoEnd');
  const editVideoPlaylistSelect = document.getElementById('editVideoPlaylistSelect');
  const editVideoDesc = document.getElementById('editVideoDesc');
  const editVideoPreviewBox = document.getElementById('editVideoPreviewBox');
  const editVideoPreviewThumb = document.getElementById('editVideoPreviewThumb');
  const editVideoPreviewId = document.getElementById('editVideoPreviewId');
  const editVideoAlert = document.getElementById('editVideoAlert');
  const formEditVideo = document.getElementById('formEditVideo');

  window.openEditVideoModal = function(videoId) {
    const video = courseManager.getVideoById(videoId);
    if (!video || !courseManager.course) return;

    if (editVideoIdInput) editVideoIdInput.value = video.id;
    if (editVideoUrl) editVideoUrl.value = video.url || YouTubeUtils.getWatchUrl(video.youtubeId);
    if (editVideoTitleInput) editVideoTitleInput.value = video.title || '';
    if (editVideoStart) editVideoStart.value = video.startFormatted || (video.startTime !== null ? YouTubeUtils.formatSecondsToTime(video.startTime) : '');
    if (editVideoEnd) editVideoEnd.value = video.endFormatted || (video.endTime !== null ? YouTubeUtils.formatSecondsToTime(video.endTime) : '');
    if (editVideoDesc) editVideoDesc.value = video.description || '';

    // Vista previa de miniatura
    if (video.youtubeId && editVideoPreviewThumb && editVideoPreviewId) {
      editVideoPreviewThumb.src = YouTubeUtils.getThumbnailUrl(video.youtubeId, 'mq');
      editVideoPreviewId.textContent = video.youtubeId;
      editVideoPreviewBox?.classList.remove('hidden');
    } else {
      editVideoPreviewBox?.classList.add('hidden');
    }

    // Poblar selector de módulos y seleccionar el actual
    if (editVideoPlaylistSelect) {
      editVideoPlaylistSelect.innerHTML = '';
      const currentParent = courseManager.course.playlists.find(pl => pl.videos.some(v => v.id === video.id));
      courseManager.course.playlists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.textContent = pl.title;
        if (currentParent && pl.id === currentParent.id) {
          opt.selected = true;
        }
        editVideoPlaylistSelect.appendChild(opt);
      });
    }

    if (editVideoAlert) editVideoAlert.classList.add('hidden');

    ModalController.open('modalEditVideo');
    setTimeout(() => {
      editVideoTitleInput?.focus();
      editVideoTitleInput?.select();
    }, 60);
  };

  // Vista previa automática al escribir el enlace de YouTube en edición
  editVideoUrl?.addEventListener('input', (e) => {
    const vidId = YouTubeUtils.extractVideoId(e.target.value);
    if (vidId && editVideoPreviewThumb && editVideoPreviewId) {
      editVideoPreviewThumb.src = YouTubeUtils.getThumbnailUrl(vidId, 'mq');
      editVideoPreviewId.textContent = vidId;
      editVideoPreviewBox?.classList.remove('hidden');
    } else {
      editVideoPreviewBox?.classList.add('hidden');
    }
  });

  // Guardar cambios en el formulario de edición de video
  formEditVideo?.addEventListener('submit', (e) => {
    e.preventDefault();
    const videoId = editVideoIdInput?.value;
    const title = editVideoTitleInput?.value?.trim();
    const url = editVideoUrl?.value?.trim();
    const desc = editVideoDesc?.value?.trim();
    const playlistId = editVideoPlaylistSelect?.value;
    const startTime = editVideoStart?.value?.trim();
    const endTime = editVideoEnd?.value?.trim();

    try {
      courseManager.updateVideo(videoId, {
        title,
        url,
        description: desc,
        playlistId,
        startTime,
        endTime
      });

      ModalController.close('modalEditVideo');
      showToast(`Lección "${title}" actualizada con éxito`, 'success');
    } catch (err) {
      if (editVideoAlert) {
        editVideoAlert.textContent = err.message || 'Error al actualizar la lección.';
        editVideoAlert.className = 'modal-feedback-alert error';
        editVideoAlert.classList.remove('hidden');
      }
    }
  });

  // ----------------------------------------
  // D. Carga de JSON (Local y Nube)
  // ----------------------------------------
  const jsonDropzone = document.getElementById('jsonDropzone');
  const jsonFileInput = document.getElementById('jsonFileInput');
  const jsonFeedbackAlert = document.getElementById('jsonFeedbackAlert');

  function showJsonFeedback(message, isError = false) {
    if (!jsonFeedbackAlert) return;
    jsonFeedbackAlert.className = `modal-feedback-alert ${isError ? 'error' : 'success'}`;
    jsonFeedbackAlert.textContent = message;
    jsonFeedbackAlert.classList.remove('hidden');
  }

  function handleJsonFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showJsonFeedback('Por favor selecciona un archivo con extensión .json válido.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const result = courseManager.loadCourseFromJson(parsed);
        if (result.success) {
          // Sincronizar recursos y enlaces del archivo JSON
          const resourcesToLoad = parsed.resources || parsed.attachments || [];
          if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.loadFromCourse === 'function') {
            await AttachmentManager.loadFromCourse(resourcesToLoad);
          }

          showJsonFeedback('¡Curso cargado exitosamente!', false);
          showToast('Curso importado con éxito', 'success');
          setTimeout(() => {
            ModalController.close('modalLoadJson');
            if (jsonFeedbackAlert) jsonFeedbackAlert.classList.add('hidden');
          }, 800);
        } else {
          showJsonFeedback(result.message || 'El formato del archivo JSON no es válido.', true);
        }
      } catch (err) {
        showJsonFeedback('El archivo no contiene un formato JSON válido.', true);
      }
    };
    reader.onerror = () => {
      showJsonFeedback('Error al leer el archivo desde el disco.', true);
    };
    reader.readAsText(file);
  }

  jsonFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleJsonFile(e.target.files[0]);
    }
  });

  // Drag & drop para JSON
  if (jsonDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      jsonDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      jsonDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        jsonDropzone.classList.remove('dragover');
      });
    });

    jsonDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleJsonFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Cargar JSON desde URL remota
  document.getElementById('btnFetchJsonUrl')?.addEventListener('click', async () => {
    const urlInput = document.getElementById('jsonUrlInput');
    const url = urlInput?.value.trim();

    if (!url) {
      showJsonFeedback('Ingresa una URL válida de archivo JSON.', true);
      return;
    }

    try {
      showJsonFeedback('Descargando archivo JSON...', false);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const result = courseManager.loadCourseFromJson(data);

      if (result.success) {
        // Sincronizar recursos y enlaces del archivo JSON remoto
        const resourcesToLoad = data.resources || data.attachments || [];
        if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.loadFromCourse === 'function') {
          await AttachmentManager.loadFromCourse(resourcesToLoad);
        }

        showJsonFeedback('¡Curso cargado exitosamente desde la nube!', false);
        showToast('Curso cargado desde la nube', 'success');
        setTimeout(() => {
          ModalController.close('modalLoadJson');
          if (jsonFeedbackAlert) jsonFeedbackAlert.classList.add('hidden');
        }, 800);
      } else {
        showJsonFeedback(result.message, true);
      }
    } catch (err) {
      showJsonFeedback(`No se pudo cargar la URL (${err.message}). Asegúrate de que admita CORS y sea un JSON público.`, true);
    }
  });

  // Botón Rápido Demo Course
  async function loadDemoCourse() {
    try {
      const res = await fetch('sample-course.json');
      if (!res.ok) throw new Error('No se pudo encontrar sample-course.json');
      const data = await res.json();
      courseManager.loadCourseFromJson(data);
      if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.loadFromCourse === 'function') {
        await AttachmentManager.loadFromCourse(data.resources || data.attachments || []);
      }
      showToast('Curso de demostración cargado', 'success');
      ModalController.close('modalLoadJson');
    } catch (err) {
      console.warn('Error al cargar sample-course.json por fetch, usando fallback:', err);
      // Fallback predeterminado en memoria
      const fallbackCourse = {
        courseTitle: 'Masterclass de Desarrollo Web Frontend',
        description: 'Aprende los fundamentos y técnicas avanzadas de HTML5, CSS3 y JavaScript moderno.',
        playlists: [
          {
            id: 'mod-1',
            title: 'Módulo 1: Fundamentos y Semántica Web',
            videos: [
              {
                id: 'v-1',
                title: '1. Estructura y Semántica Moderna en HTML5',
                url: 'https://www.youtube.com/watch?v=k783iVqA68A',
                description: 'Organiza aplicaciones con etiquetas semánticas y buenas prácticas.'
              },
              {
                id: 'v-2',
                title: '2. Arquitectura CSS: Flexbox y Grid',
                url: 'https://www.youtube.com/watch?v=JJSoEo8JSnc',
                description: 'Dominio de sistemas de maquetación modernos.'
              }
            ]
          }
        ]
      };
      courseManager.loadCourseFromJson(fallbackCourse);
      if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.loadFromCourse === 'function') {
        await AttachmentManager.loadFromCourse(fallbackCourse.resources || fallbackCourse.attachments || []);
      }
      showToast('Curso demo cargado', 'success');
      ModalController.close('modalLoadJson');
    }
  }

  document.getElementById('btnLoadDemoCourse')?.addEventListener('click', loadDemoCourse);
  document.getElementById('btnLoadSampleCourseModal')?.addEventListener('click', loadDemoCourse);

  // ----------------------------------------
  // E. Agregar Video Manualmente
  // ----------------------------------------
  const manualVideoUrl = document.getElementById('manualVideoUrl');
  const manualVideoPreviewBox = document.getElementById('manualVideoPreviewBox');
  const manualVideoPreviewThumb = document.getElementById('manualVideoPreviewThumb');
  const manualVideoPreviewId = document.getElementById('manualVideoPreviewId');
  const manualVideoPlaylistSelect = document.getElementById('manualVideoPlaylistSelect');
  const newPlaylistInputGroup = document.getElementById('newPlaylistInputGroup');
  const formAddVideo = document.getElementById('formAddVideo');
  const manualVideoAlert = document.getElementById('manualVideoAlert');

  // Vista previa automática al escribir el enlace de YouTube
  manualVideoUrl?.addEventListener('input', (e) => {
    const videoId = YouTubeUtils.extractVideoId(e.target.value);
    if (videoId) {
      manualVideoPreviewThumb.src = YouTubeUtils.getThumbnailUrl(videoId, 'mq');
      manualVideoPreviewId.textContent = videoId;
      manualVideoPreviewBox?.classList.remove('hidden');
    } else {
      manualVideoPreviewBox?.classList.add('hidden');
    }
  });

  // Mostrar / ocultar campo de nuevo módulo
  manualVideoPlaylistSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'NEW_PLAYLIST') {
      newPlaylistInputGroup?.classList.remove('hidden');
      document.getElementById('newPlaylistTitleInput')?.setAttribute('required', 'true');
    } else {
      newPlaylistInputGroup?.classList.add('hidden');
      document.getElementById('newPlaylistTitleInput')?.removeAttribute('required');
    }
  });

  // Envío del formulario de nuevo video
  formAddVideo?.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('manualVideoTitle')?.value;
    const url = manualVideoUrl?.value;
    const desc = document.getElementById('manualVideoDesc')?.value;
    const selectedPlaylist = manualVideoPlaylistSelect?.value;
    const newPlaylistTitle = document.getElementById('newPlaylistTitleInput')?.value;
    const startTime = document.getElementById('manualVideoStart')?.value;
    const endTime = document.getElementById('manualVideoEnd')?.value;

    try {
      const addedVideo = courseManager.addManualVideo({
        title,
        url,
        description: desc,
        playlistId: selectedPlaylist === 'NEW_PLAYLIST' ? null : selectedPlaylist,
        newPlaylistTitle: selectedPlaylist === 'NEW_PLAYLIST' ? newPlaylistTitle : null,
        startTime,
        endTime
      });

      showToast(`Video "${addedVideo.title}" agregado`, 'success');
      formAddVideo.reset();
      manualVideoPreviewBox?.classList.add('hidden');
      newPlaylistInputGroup?.classList.add('hidden');
      if (manualVideoAlert) manualVideoAlert.classList.add('hidden');
      ModalController.close('modalAddVideo');
    } catch (err) {
      if (manualVideoAlert) {
        manualVideoAlert.textContent = err.message || 'Error al guardar el video.';
        manualVideoAlert.className = 'modal-feedback-alert error';
        manualVideoAlert.classList.remove('hidden');
      }
    }
  });

  // ----------------------------------------
  // F. Gestor de Archivos Adicionales (10 MB)
  // ----------------------------------------
  const tabBtnLocalUpload = document.getElementById('tabBtnLocalUpload');
  const tabBtnCloudLink = document.getElementById('tabBtnCloudLink');
  const panelLocalUpload = document.getElementById('panelLocalUpload');
  const panelCloudLink = document.getElementById('panelCloudLink');
  const attachmentDropzone = document.getElementById('attachmentDropzone');
  const attachmentFileInput = document.getElementById('attachmentFileInput');
  const formCloudAttachment = document.getElementById('formCloudAttachment');
  const attachmentAlert = document.getElementById('attachmentAlert');

  function showAttachmentAlert(message, isError = false) {
    if (!attachmentAlert) return;
    attachmentAlert.className = `modal-feedback-alert ${isError ? 'error' : 'success'}`;
    attachmentAlert.textContent = message;
    attachmentAlert.classList.remove('hidden');
    setTimeout(() => attachmentAlert.classList.add('hidden'), 4000);
  }

  // Alternar pestañas en el modal de archivos
  tabBtnLocalUpload?.addEventListener('click', () => {
    tabBtnLocalUpload.classList.add('active');
    tabBtnCloudLink?.classList.remove('active');
    panelLocalUpload?.classList.remove('hidden');
    panelCloudLink?.classList.add('hidden');
  });

  tabBtnCloudLink?.addEventListener('click', () => {
    tabBtnCloudLink.classList.add('active');
    tabBtnLocalUpload?.classList.remove('active');
    panelCloudLink?.classList.remove('hidden');
    panelLocalUpload?.classList.add('hidden');
  });

  // Subida de archivo local
  async function handleAttachmentUpload(file) {
    if (!file) return;
    const res = await AttachmentManager.addLocalFile(file);
    if (res.success) {
      showAttachmentAlert(res.message, false);
      showToast('Recurso guardado', 'success');
    } else {
      showAttachmentAlert(res.message, true);
    }
  }

  attachmentFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAttachmentUpload(e.target.files[0]);
    }
  });

  // Drag & drop en zona de adjuntos
  if (attachmentDropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      attachmentDropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        attachmentDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      attachmentDropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        attachmentDropzone.classList.remove('dragover');
      });
    });

    attachmentDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleAttachmentUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // Registro de enlace en la nube
  formCloudAttachment?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('cloudAttachmentTitle')?.value;
    const url = document.getElementById('cloudAttachmentUrl')?.value;

    const res = await AttachmentManager.addCloudLink(title, url);
    if (res.success) {
      showAttachmentAlert(res.message, false);
      showToast('Enlace en la nube guardado', 'success');
      formCloudAttachment.reset();
    } else {
      showAttachmentAlert(res.message, true);
    }
  });

  // --- BOTÓN CABECERA: INICIAR RECORRIDO GUIADO ---
  document.getElementById('btnStartTour')?.addEventListener('click', () => {
    if (typeof TourManager !== 'undefined') {
      TourManager.start();
    }
  });

  // --- MODAL DE BIENVENIDA / ONBOARDING ---
  // Opción 1: Cargar Curso Demo e Iniciar Tour
  document.getElementById('btnOnboardingDemo')?.addEventListener('click', async () => {
    LocalStorageManager.set('licstream_onboarded', true);
    ModalController.close('modalWelcomeOnboarding');

    try {
      const res = await fetch('sample-course.json');
      if (res.ok) {
        const demoData = await res.json();
        courseManager.loadCourseFromJson(demoData);
        if (typeof AttachmentManager !== 'undefined' && typeof AttachmentManager.loadFromCourse === 'function') {
          await AttachmentManager.loadFromCourse(demoData.resources || demoData.attachments || []);
        }
        showToast('Curso demo cargado con éxito.', 'success');
        
        // Iniciar el tour guiado tras renderizar la interfaz
        if (typeof TourManager !== 'undefined') {
          setTimeout(() => {
            TourManager.start();
          }, 350);
        }
      }
    } catch (err) {
      console.error('Error cargando demo:', err);
      showToast('No se pudo cargar el curso demo.', 'error');
    }
  });

  // Opción 2: Comenzar desde Cero
  document.getElementById('btnOnboardingClean')?.addEventListener('click', () => {
    LocalStorageManager.set('licstream_onboarded', true);
    ModalController.close('modalWelcomeOnboarding');
    showToast('Iniciando en limpio. Carga un archivo JSON o agrega un video.', 'info');
  });
}

// ==========================================
// 5. INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar sistema de temas (6 paletas)
  ThemeManager.init();

  // 2. Inicializar gestor de cursos (carga desde localStorage)
  courseManager.init();

  // 3. Suscribir renderizado reactivo a cambios en el curso
  courseManager.subscribe((mgr) => {
    UIRenderer.renderProgress(mgr);
    UIRenderer.renderPlayer(mgr);
    UIRenderer.renderPlaylist(mgr);
    if (typeof NotesManager !== 'undefined' && mgr.getNotes) {
      const courseNotes = mgr.getNotes();
      if (NotesManager.textarea && !NotesManager.textarea.value && courseNotes) {
        NotesManager.loadNotes(courseNotes);
      }
    }
  });

  // 4. Inicializar gestor de archivos adicionales (IndexedDB)
  AttachmentManager.subscribe((attachments) => {
    UIRenderer.renderAttachments(attachments);
  });
  await AttachmentManager.init();

  // Si no hay ningún curso cargado actualmente, purgar recursos huérfanos residuales
  if (!courseManager.course || courseManager.getAllVideos().length === 0) {
    if (AttachmentManager.attachments.length > 0) {
      await AttachmentManager.clearAll();
    }
  }

  // 5. Inicializar libreta de apuntes (Notes Drawer)
  if (typeof NotesManager !== 'undefined') {
    NotesManager.init();
    NotesManager.loadNotes(courseManager.getNotes ? courseManager.getNotes() : '');
  }

  // 6. Configurar listeners de interfaz
  setupAppEvents();

  // 7. Inicializar módulo del Recorrido Guiado
  if (typeof TourManager !== 'undefined') {
    TourManager.init();
  }

  // 8. Experiencia de primera apertura (Onboarding)
  const isOnboarded = LocalStorageManager.get('licstream_onboarded');
  const hasCourse = courseManager.course && courseManager.getAllVideos().length > 0;

  if (!isOnboarded && !hasCourse) {
    // Si es la primera vez que se abre la app y no hay cursos previos, mostrar bienvenida
    setTimeout(() => {
      ModalController.open('modalWelcomeOnboarding');
    }, 250);
  }

  // 9. Detección de protocolo file:// (Causa del Error 153 en YouTube)
  if (window.location.protocol === 'file:') {
    const banner = document.getElementById('protocolWarningBanner');
    const closeBtn = document.getElementById('btnCloseProtocolWarning');
    if (banner) {
      banner.classList.remove('hidden');
    }
    closeBtn?.addEventListener('click', () => {
      banner?.classList.add('hidden');
    });
  }

  // 10. Render inicial
  courseManager.notify();
});
