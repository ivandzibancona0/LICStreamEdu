/**
 * tour.js - LICStreamEdu
 * Gestor del Recorrido Guiado Interactivo (Spotlight Tour).
 * 100% Vanilla JavaScript y CSS nativo sin librerías externas.
 */

const TourManager = {
  steps: [
    {
      target: '#headerProgressWidget',
      title: 'Progreso y Personalización',
      description: 'Supervisa tu avance en tiempo real con el porcentaje y contador de lecciones. Además, puedes cambiar entre 6 paletas de colores exclusivas desde el botón de temas.',
      placement: 'bottom'
    },
    {
      target: '#videoContainer',
      title: 'Reproductor Inteligente 16:9',
      description: 'Disfruta de tus lecciones de YouTube con soporte para fragmentación por minutos (inicio y fin automáticos) y persistencia del último video visto.',
      placement: 'bottom'
    },
    {
      target: '#playlistContainer',
      title: 'Módulos y Lecciones',
      description: 'Navega por el temario de tu curso. Marca lecciones como completadas con la casilla de verificación y gestiona módulos fácilmente con los botones de acción.',
      placement: 'left'
    },
    {
      target: '.sidebar-header',
      title: 'Búsqueda y Filtros Rápidos',
      description: 'Encuentra cualquier tema al instante escribiendo en el buscador o filtrando entre lecciones pendientes y completadas para enfocar tu estudio.',
      placement: 'left'
    },
    {
      target: '#notesDrawerTrigger',
      title: 'Libreta de Apuntes en Markdown',
      description: 'Abre la libreta flotante para tomar notas enriquecidas en Markdown, elegir entre 5 tipografías, cambiar colores de texto y descargar tus apuntes en tu equipo.',
      placement: 'left'
    }
  ],

  currentStepIndex: 0,
  isActive: false,
  containerEl: null,
  highlightBoxEl: null,
  cardEl: null,

  /**
   * Inicializa los elementos DOM necesarios para el tour
   */
  init() {
    if (this.containerEl) return;

    // Crear contenedor principal del tour
    const container = document.createElement('div');
    container.id = 'tourContainer';
    container.className = 'tour-container hidden';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', 'Recorrido guiado de la aplicación');

    // Caja de foco spotlight (recorte visual con sombra gigante)
    const highlightBox = document.createElement('div');
    highlightBox.id = 'tourHighlightBox';
    highlightBox.className = 'tour-highlight-box';

    // Tarjeta emergente con la explicación y controles
    const card = document.createElement('div');
    card.id = 'tourCard';
    card.className = 'tour-card';
    card.innerHTML = `
      <div class="tour-card-header">
        <span class="tour-step-badge" id="tourStepBadge">Paso 1 de 5</span>
        <button type="button" class="btn btn-icon btn-xs tour-close-btn" id="btnTourClose" aria-label="Cerrar recorrido guiado" title="Cerrar tour (Esc)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="tour-card-body">
        <h3 class="tour-card-title" id="tourCardTitle">Título del paso</h3>
        <p class="tour-card-text" id="tourCardText">Descripción detallada del paso.</p>
      </div>

      <div class="tour-card-footer">
        <button type="button" class="btn btn-ghost btn-xs tour-skip-btn" id="btnTourSkip">
          Omitir
        </button>
        <div class="tour-nav-buttons">
          <button type="button" class="btn btn-secondary btn-sm" id="btnTourPrev">
            Anterior
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btnTourNext">
            Siguiente
          </button>
        </div>
      </div>
      <div class="tour-arrow" id="tourArrow"></div>
    `;

    container.appendChild(highlightBox);
    container.appendChild(card);
    document.body.appendChild(container);

    this.containerEl = container;
    this.highlightBoxEl = highlightBox;
    this.cardEl = card;

    // Conectar eventos de botones
    document.getElementById('btnTourClose')?.addEventListener('click', () => this.skip());
    document.getElementById('btnTourSkip')?.addEventListener('click', () => this.skip());
    document.getElementById('btnTourPrev')?.addEventListener('click', () => this.prev());
    document.getElementById('btnTourNext')?.addEventListener('click', () => this.next());

    // Eventos de teclado (Escape, Enter, Flechas)
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      }
    });

    // Reajustar posición en resize o scroll
    window.addEventListener('resize', () => {
      if (this.isActive) this.updatePosition();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (this.isActive) this.updatePosition();
    }, { passive: true });
  },

  /**
   * Inicia el recorrido guiado desde el paso indicado
   * @param {number} fromIndex 
   */
  start(fromIndex = 0) {
    this.init();
    this.isActive = true;
    this.containerEl.classList.remove('hidden');
    this.containerEl.classList.add('active');
    this.showStep(fromIndex);
  },

  /**
   * Muestra un paso específico del recorrido
   * @param {number} index 
   */
  showStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIndex = index;
    const step = this.steps[index];

    // Obtener elemento objetivo
    let targetEl = document.querySelector(step.target);
    if (!targetEl) {
      console.warn(`[Tour] Elemento no encontrado: ${step.target}`);
      if (index < this.steps.length - 1) {
        this.showStep(index + 1);
      } else {
        this.finish();
      }
      return;
    }

    // Si estamos en móvil y el paso es de la barra lateral, abrir sidebar móvil
    if (window.innerWidth <= 1024 && (step.target === '#playlistContainer' || step.target === '.sidebar-header')) {
      const sidebar = document.getElementById('playlistSidebar');
      const backdrop = document.getElementById('mobileSidebarBackdrop');
      if (sidebar && !sidebar.classList.contains('open')) {
        sidebar.classList.add('open');
        backdrop?.classList.add('active');
      }
    }

    // Scroll suave hacia el elemento si no está visible
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    // Actualizar contenido de la tarjeta
    const badgeEl = document.getElementById('tourStepBadge');
    const titleEl = document.getElementById('tourCardTitle');
    const textEl = document.getElementById('tourCardText');
    const prevBtn = document.getElementById('btnTourPrev');
    const nextBtn = document.getElementById('btnTourNext');

    if (badgeEl) badgeEl.textContent = `Paso ${index + 1} de ${this.steps.length}`;
    if (titleEl) titleEl.textContent = step.title;
    if (textEl) textEl.textContent = step.description;

    // Configuración de botones de navegación
    if (prevBtn) {
      if (index === 0) {
        prevBtn.style.display = 'none';
      } else {
        prevBtn.style.display = 'inline-flex';
      }
    }

    if (nextBtn) {
      if (index === this.steps.length - 1) {
        nextBtn.innerHTML = `
          <span>Finalizar</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      } else {
        nextBtn.innerHTML = `
          <span>Siguiente</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;
      }
    }

    // Pequeño retardo para permitir que el scroll termine antes de calcular coordenadas
    setTimeout(() => {
      this.updatePosition();
    }, 60);
  },

  /**
   * Actualiza la posición del foco y la tarjeta emergente según el elemento objetivo
   */
  updatePosition() {
    if (!this.isActive || !this.steps[this.currentStepIndex]) return;

    const step = this.steps[this.currentStepIndex];
    const targetEl = document.querySelector(step.target);
    if (!targetEl || !this.highlightBoxEl || !this.cardEl) return;

    const rect = targetEl.getBoundingClientRect();
    const padding = 6;

    // Posicionar la caja de resalte (Spotlight)
    const hlTop = Math.max(0, rect.top - padding);
    const hlLeft = Math.max(0, rect.left - padding);
    const hlWidth = rect.width + (padding * 2);
    const hlHeight = rect.height + (padding * 2);

    this.highlightBoxEl.style.top = `${hlTop}px`;
    this.highlightBoxEl.style.left = `${hlLeft}px`;
    this.highlightBoxEl.style.width = `${hlWidth}px`;
    this.highlightBoxEl.style.height = `${hlHeight}px`;

    // Posicionar la tarjeta según el dispositivo
    const isMobile = window.innerWidth <= 768;
    const arrow = document.getElementById('tourArrow');

    if (isMobile) {
      // En móviles, fijar la tarjeta en la parte inferior de la pantalla para máxima ergonomía
      this.cardEl.style.top = 'auto';
      this.cardEl.style.bottom = '18px';
      this.cardEl.style.left = '16px';
      this.cardEl.style.right = '16px';
      this.cardEl.style.width = 'auto';
      this.cardEl.style.maxWidth = 'calc(100vw - 32px)';
      if (arrow) arrow.style.display = 'none';
      return;
    }

    // En pantallas grandes, calcular colocación óptima (arriba, abajo, izquierda, derecha)
    if (arrow) arrow.style.display = 'block';

    const cardWidth = 360;
    const cardHeight = this.cardEl.offsetHeight || 190;
    const offset = 14;

    let preferredPlacement = step.placement || 'bottom';
    let top = 0;
    let left = 0;

    // Ajuste según colocación
    if (preferredPlacement === 'bottom') {
      top = rect.bottom + offset;
      left = rect.left + (rect.width / 2) - (cardWidth / 2);

      // Si no cabe abajo, intentar arriba
      if (top + cardHeight > window.innerHeight - 15) {
        top = Math.max(15, rect.top - cardHeight - offset);
        preferredPlacement = 'top';
      }
    } else if (preferredPlacement === 'top') {
      top = rect.top - cardHeight - offset;
      left = rect.left + (rect.width / 2) - (cardWidth / 2);

      if (top < 15) {
        top = rect.bottom + offset;
        preferredPlacement = 'bottom';
      }
    } else if (preferredPlacement === 'left') {
      top = rect.top + (rect.height / 2) - (cardHeight / 2);
      left = rect.left - cardWidth - offset;

      // Si se sale por la izquierda, pasar a la derecha o abajo
      if (left < 15) {
        left = rect.right + offset;
        preferredPlacement = 'right';
        if (left + cardWidth > window.innerWidth - 15) {
          left = 15;
          top = rect.bottom + offset;
          preferredPlacement = 'bottom';
        }
      }
    } else if (preferredPlacement === 'right') {
      top = rect.top + (rect.height / 2) - (cardHeight / 2);
      left = rect.right + offset;

      if (left + cardWidth > window.innerWidth - 15) {
        left = rect.left - cardWidth - offset;
        preferredPlacement = 'left';
      }
    }

    // Clamping para asegurar que nunca se desborde la ventana
    left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));

    this.cardEl.style.top = `${top}px`;
    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.bottom = 'auto';
    this.cardEl.style.right = 'auto';
    this.cardEl.style.width = `${cardWidth}px`;
    this.cardEl.style.maxWidth = '90vw';

    // Posicionar flecha indicadora
    if (arrow) {
      arrow.className = `tour-arrow arrow-${preferredPlacement}`;
      if (preferredPlacement === 'bottom') {
        arrow.style.top = '-6px';
        arrow.style.left = `${Math.max(15, Math.min(cardWidth - 25, rect.left + (rect.width / 2) - left))}px`;
      } else if (preferredPlacement === 'top') {
        arrow.style.bottom = '-6px';
        arrow.style.top = 'auto';
        arrow.style.left = `${Math.max(15, Math.min(cardWidth - 25, rect.left + (rect.width / 2) - left))}px`;
      } else if (preferredPlacement === 'left') {
        arrow.style.right = '-6px';
        arrow.style.left = 'auto';
        arrow.style.top = `${Math.max(15, Math.min(cardHeight - 25, rect.top + (rect.height / 2) - top))}px`;
      } else if (preferredPlacement === 'right') {
        arrow.style.left = '-6px';
        arrow.style.right = 'auto';
        arrow.style.top = `${Math.max(15, Math.min(cardHeight - 25, rect.top + (rect.height / 2) - top))}px`;
      }
    }
  },

  /**
   * Avanza al siguiente paso
   */
  next() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.showStep(this.currentStepIndex + 1);
    } else {
      this.finish();
    }
  },

  /**
   * Retrocede al paso anterior
   */
  prev() {
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1);
    }
  },

  /**
   * Omite o cancela el recorrido
   */
  skip() {
    this.stop();
    if (typeof showToast === 'function') {
      showToast('Recorrido omitido. Puedes reiniciarlo cuando desees con el icono de brújula en la cabecera.', 'info');
    }
  },

  /**
   * Finaliza con éxito el recorrido guiado
   */
  finish() {
    this.stop();

    // Abrir la libreta de apuntes automáticamente para una grata experiencia interactiva
    if (typeof NotesManager !== 'undefined' && typeof NotesManager.open === 'function') {
      setTimeout(() => {
        NotesManager.open();
      }, 300);
    }

    if (typeof showToast === 'function') {
      showToast('¡Has completado el recorrido guiado! Disfruta aprendiendo en LICStreamEdu.', 'success');
    }
  },

  /**
   * Detiene el tour y oculta los elementos visuales
   */
  stop() {
    this.isActive = false;
    if (this.containerEl) {
      this.containerEl.classList.add('hidden');
      this.containerEl.classList.remove('active');
    }
  }
};
