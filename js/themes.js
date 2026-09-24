/**
 * themes.js
 * Módulo para la gestión de 6 paletas de colores predefinidas.
 * Administra el cambio dinámico del tema, la actualización del atributo data-theme
 * y la persistencia en localStorage.
 */

const THEMES = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    description: 'Fondo oscuro moderno con acento Índigo',
    accentColor: '#6366f1',
    bgColor: '#0b0f19',
    cardColor: '#131b2e'
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    description: 'Oscuro con acento Verde Esmeralda / Menta',
    accentColor: '#10b981',
    bgColor: '#051814',
    cardColor: '#0a2e26'
  },
  {
    id: 'frost',
    name: 'Nordic Frost',
    description: 'Azul polar profundo con acento Cian Glaciar',
    accentColor: '#06b6d4',
    bgColor: '#0a1224',
    cardColor: '#122040'
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Carbón cálido con acento Ámbar / Fuego',
    accentColor: '#f59e0b',
    bgColor: '#17120c',
    cardColor: '#2b2014'
  },
  {
    id: 'light',
    name: 'Clean Light',
    description: 'Tema claro minimalista de alto contraste',
    accentColor: '#2563eb',
    bgColor: '#f8fafc',
    cardColor: '#ffffff'
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    description: 'Pizarra púrpura con acento Rosa Eléctrico',
    accentColor: '#f43f5e',
    bgColor: '#180e19',
    cardColor: '#2a162b'
  }
];

const ThemeManager = {
  currentTheme: 'obsidian',

  /**
   * Inicializa el tema guardado en localStorage o el predeterminado
   */
  init() {
    const savedTheme = LocalStorageManager.get(STORAGE_KEYS.THEME, 'obsidian');
    this.applyTheme(savedTheme);
  },

  /**
   * Aplica el tema por su ID
   * @param {string} themeId 
   */
  applyTheme(themeId) {
    const themeExists = THEMES.some(t => t.id === themeId);
    const selected = themeExists ? themeId : 'obsidian';

    this.currentTheme = selected;
    document.documentElement.setAttribute('data-theme', selected);
    LocalStorageManager.set(STORAGE_KEYS.THEME, selected);

    // Actualiza indicador visual en la UI
    this.updateActiveIndicators();
  },

  /**
   * Obtiene la lista de temas disponibles
   */
  getThemes() {
    return THEMES;
  },

  /**
   * Renderiza las opciones de tema en el contenedor especificado
   * @param {HTMLElement} container 
   */
  renderThemeOptions(container) {
    if (!container) return;

    container.innerHTML = THEMES.map(theme => `
      <button 
        type="button" 
        class="theme-option-btn ${theme.id === this.currentTheme ? 'active' : ''}" 
        data-theme-id="${theme.id}"
        title="${theme.name} - ${theme.description}"
        aria-label="Seleccionar tema ${theme.name}">
        <span class="theme-swatch" style="background-color: ${theme.bgColor}; border-color: ${theme.accentColor};">
          <span class="theme-swatch-accent" style="background-color: ${theme.accentColor};"></span>
        </span>
        <span class="theme-info">
          <span class="theme-title">${theme.name}</span>
          <span class="theme-desc">${theme.description}</span>
        </span>
        <span class="theme-check-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      </button>
    `).join('');

    // Asignar eventos de clic
    container.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const themeId = btn.getAttribute('data-theme-id');
        this.applyTheme(themeId);
      });
    });
  },

  /**
   * Actualiza el estado visual 'active' de los botones de tema en la interfaz
   */
  updateActiveIndicators() {
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      const id = btn.getAttribute('data-theme-id');
      if (id === this.currentTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualiza el botón de tema principal en la barra superior si existe
    const currentThemeMeta = THEMES.find(t => t.id === this.currentTheme);
    const dotIndicator = document.getElementById('currentThemeDot');
    if (dotIndicator && currentThemeMeta) {
      dotIndicator.style.backgroundColor = currentThemeMeta.accentColor;
    }
  }
};
