/**
 * notes.js - LICStreamEdu
 * Módulo para la Libreta de Apuntes integrada (Notes Drawer).
 * Permite tomar apuntes enriquecidos en Markdown, cambiar tipografías
 * (incluyendo estilo mano alzada), colores, tamaños, formatear texto,
 * anexar archivos .md/.txt, descargar con nombre personalizado y
 * guardar automáticamente en el archivo JSON del curso y localStorage.
 */

const NotesManager = {
  drawer: null,
  trigger: null,
  backdrop: null,
  textarea: null,
  preview: null,
  saveStatus: null,
  fontSelect: null,
  fontSizeSelect: null,
  colorInput: null,
  colorSwatch: null,
  fileInput: null,
  currentView: 'editor', // 'editor' | 'preview'
  saveTimeout: null,

  /**
   * Inicializa la libreta de apuntes y asocia eventos
   */
  init() {
    this.drawer = document.getElementById('notesDrawer');
    this.trigger = document.getElementById('notesDrawerTrigger');
    this.backdrop = document.getElementById('notesDrawerBackdrop');
    this.textarea = document.getElementById('notesTextarea');
    this.preview = document.getElementById('notesPreviewContainer');
    this.saveStatus = document.getElementById('notesSaveStatus');
    this.fontSelect = document.getElementById('notesFontSelect');
    this.fontSizeSelect = document.getElementById('notesFontSizeSelect');
    this.colorInput = document.getElementById('notesColorInput');
    this.colorSwatch = document.getElementById('notesColorPreviewSwatch');
    this.fileInput = document.getElementById('notesFileInput');

    if (!this.drawer || !this.textarea) return;

    this.setupDrawerEvents();
    this.setupToolbarEvents();
    this.setupEditorEvents();
    this.setupFileEvents();
    this.loadInitialPreferences();
  },

  /**
   * Carga las notas iniciales desde el estado del curso
   * @param {string} initialText 
   */
  loadNotes(initialText = '') {
    if (this.textarea) {
      this.textarea.value = initialText || '';
      this.updateSaveIndicator('saved');
    }
  },

  /**
   * Configura eventos de apertura, cierre y accesibilidad del Drawer
   */
  setupDrawerEvents() {
    // Abrir o alternar al hacer clic en la pestaña flotante lateral
    this.trigger?.addEventListener('click', () => {
      this.toggle();
    });

    // Botón de cierre superior
    document.getElementById('btnCloseNotesDrawer')?.addEventListener('click', () => {
      this.close();
    });

    // Cerrar al hacer clic en el backdrop oscurecido
    this.backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Cerrar con Escape si el drawer está abierto
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Alternar entre modo Editor y Vista Previa
    document.getElementById('btnNotesViewEditor')?.addEventListener('click', () => {
      this.setView('editor');
    });

    document.getElementById('btnNotesViewPreview')?.addEventListener('click', () => {
      this.setView('preview');
    });
  },

  /**
   * Abre el Drawer con animación suave de derecha a izquierda
   */
  open() {
    if (!this.drawer) return;
    this.drawer.classList.add('open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.backdrop?.classList.add('open');
    this.trigger?.classList.add('active');

    // Cargar notas actuales del curso
    if (typeof courseManager !== 'undefined') {
      const currentNotes = courseManager.getNotes ? courseManager.getNotes() : (courseManager.course?.notes || '');
      if (this.textarea && !this.textarea.value && currentNotes) {
        this.textarea.value = currentNotes;
      }
    }

    // Foco en el editor si está en modo edición
    if (this.currentView === 'editor') {
      setTimeout(() => this.textarea?.focus(), 300);
    } else {
      this.renderPreview();
    }
  },

  /**
   * Cierra el Drawer con animación suave de izquierda a derecha
   */
  close() {
    if (!this.drawer) return;
    this.drawer.classList.remove('open');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.backdrop?.classList.remove('open');
    this.trigger?.classList.remove('active');
  },

  /**
   * Alterna apertura y cierre del Drawer
   */
  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  },

  /**
   * Indica si el Drawer se encuentra abierto
   */
  isOpen() {
    return this.drawer?.classList.contains('open');
  },

  /**
   * Cambia el modo de visualización: 'editor' o 'preview'
   */
  setView(view) {
    this.currentView = view;
    const btnEditor = document.getElementById('btnNotesViewEditor');
    const btnPreview = document.getElementById('btnNotesViewPreview');

    if (view === 'preview') {
      btnEditor?.classList.remove('active');
      btnPreview?.classList.add('active');
      this.textarea?.classList.add('hidden');
      this.preview?.classList.remove('hidden');
      this.renderPreview();
    } else {
      btnPreview?.classList.remove('active');
      btnEditor?.classList.add('active');
      this.preview?.classList.add('hidden');
      this.textarea?.classList.remove('hidden');
      this.textarea?.focus();
    }
  },

  /**
   * Renderiza el Markdown en la vista previa
   */
  renderPreview() {
    if (!this.preview || !this.textarea) return;
    const rawText = this.textarea.value.trim();
    if (!rawText) {
      this.preview.innerHTML = `
        <div class="empty-list-notice" style="padding: 30px 10px;">
          <p>No hay contenido escrito en la libreta todavía. Cambia al modo <strong>Editor</strong> para empezar a tomar apuntes.</p>
        </div>
      `;
      return;
    }
    this.preview.innerHTML = this.parseMarkdown(rawText);
  },

  /**
   * Configura eventos de la barra de herramientas de formato
   */
  setupToolbarEvents() {
    // 1. Selector de Fuentes (5 familias tipográficas)
    this.fontSelect?.addEventListener('change', (e) => {
      const selectedFont = e.target.value;
      this.applyFontFamily(selectedFont);
      LocalStorageManager.set('notes_pref_font', selectedFont);
    });

    // 2. Selector de Tamaño de Fuente
    this.fontSizeSelect?.addEventListener('change', (e) => {
      const selectedSize = e.target.value;
      this.applyFontSize(selectedSize);
      LocalStorageManager.set('notes_pref_size', selectedSize);
    });

    // 3. Selector de Color de Texto
    this.colorInput?.addEventListener('input', (e) => {
      const color = e.target.value;
      if (this.colorSwatch) {
        this.colorSwatch.style.backgroundColor = color;
      }
      this.applyTextColor(color);
    });

    // 4. Botones rápidos de formato Markdown
    document.querySelectorAll('.notes-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        this.applyFormatTool(tool);
      });
    });
  },

  /**
   * Aplica la clase de tipografía a textarea y preview
   */
  applyFontFamily(fontClass) {
    const fonts = ['font-architects', 'font-jakarta', 'font-merriweather', 'font-jetbrains', 'font-patrick'];
    fonts.forEach(f => {
      this.textarea?.classList.remove(f);
      this.preview?.classList.remove(f);
    });
    this.textarea?.classList.add(fontClass);
    this.preview?.classList.add(fontClass);
    if (this.fontSelect) this.fontSelect.value = fontClass;
  },

  /**
   * Aplica el tamaño de texto
   */
  applyFontSize(size) {
    if (this.textarea) this.textarea.style.fontSize = size;
    if (this.preview) this.preview.style.fontSize = size;
    if (this.fontSizeSelect) this.fontSizeSelect.value = size;
  },

  /**
   * Aplica color al texto seleccionado insertando etiquetas span
   */
  applyTextColor(color) {
    if (!this.textarea) return;

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selected = this.textarea.value.substring(start, end);

    if (selected) {
      const replacement = `<span style="color: ${color};">${selected}</span>`;
      this.insertTextAtSelection(replacement, start, start + replacement.length);
    } else {
      // Si no hay selección, insertar ejemplo
      const replacement = `<span style="color: ${color};">texto resaltado</span>`;
      this.insertTextAtSelection(replacement, start, start + replacement.length);
    }
  },

  /**
   * Aplica herramientas de formato Markdown
   */
  applyFormatTool(tool) {
    if (!this.textarea) return;

    // Si estamos en preview, cambiar a editor para formatear
    if (this.currentView === 'preview') {
      this.setView('editor');
    }

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selected = this.textarea.value.substring(start, end);

    let before = '';
    let after = '';
    let defaultVal = 'texto';

    switch (tool) {
      case 'h1':
        before = '\n# ';
        after = '\n';
        defaultVal = 'Encabezado 1';
        break;
      case 'h2':
        before = '\n## ';
        after = '\n';
        defaultVal = 'Encabezado 2';
        break;
      case 'h3':
        before = '\n### ';
        after = '\n';
        defaultVal = 'Encabezado 3';
        break;
      case 'bold':
        before = '**';
        after = '**';
        defaultVal = 'texto en negrita';
        break;
      case 'italic':
        before = '*';
        after = '*';
        defaultVal = 'texto en cursiva';
        break;
      case 'list':
        before = '\n- ';
        after = '\n';
        defaultVal = 'Elemento de lista';
        break;
      case 'quote':
        before = '\n> ';
        after = '\n';
        defaultVal = 'Nota o cita destacada';
        break;
      case 'code':
        before = '`';
        after = '`';
        defaultVal = 'código';
        break;
    }

    const content = selected || defaultVal;
    const replacement = before + content + after;
    this.insertTextAtSelection(replacement, start + before.length, start + before.length + content.length);
  },

  /**
   * Inserta texto en la posición del cursor de la textarea
   */
  insertTextAtSelection(text, selectStart, selectEnd) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const val = this.textarea.value;

    this.textarea.value = val.substring(0, start) + text + val.substring(end);
    this.textarea.focus();
    this.textarea.setSelectionRange(selectStart || start + text.length, selectEnd || start + text.length);

    // Disparar evento input para guardar automáticamente
    this.triggerAutoSave();
  },

  /**
   * Configura eventos de edición y guardado automático con debounce
   */
  setupEditorEvents() {
    this.textarea?.addEventListener('input', () => {
      this.triggerAutoSave();
    });
  },

  /**
   * Dispara el guardado automático con debounce
   */
  triggerAutoSave() {
    this.updateSaveIndicator('saving');

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      const text = this.textarea.value;
      if (typeof courseManager !== 'undefined') {
        courseManager.setNotes(text);
      }
      this.updateSaveIndicator('saved');
    }, 400);
  },

  /**
   * Actualiza el indicador visual de guardado en la cabecera
   */
  updateSaveIndicator(status) {
    if (!this.saveStatus) return;
    if (status === 'saving') {
      this.saveStatus.textContent = 'Guardando...';
      this.saveStatus.className = 'notes-save-badge saving';
    } else {
      this.saveStatus.textContent = 'Guardado ✓';
      this.saveStatus.className = 'notes-save-badge';
    }
  },

  /**
   * Configura eventos de los botones "Anexar archivo" y "Descargar .md"
   */
  setupFileEvents() {
    // Botón Anexar Archivo
    document.getElementById('btnAppendNotesFile')?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.appendFileContent(file);
      }
      // Limpiar input para permitir seleccionar el mismo archivo si es necesario
      if (this.fileInput) this.fileInput.value = '';
    });

    // Botón Descargar con Nombre Personalizado
    document.getElementById('btnDownloadNotes')?.addEventListener('click', () => {
      this.downloadMarkdownFile();
    });
  },

  /**
   * Lee un archivo .md o .txt y anexa su contenido al final de la libreta
   * @param {File} file 
   */
  appendFileContent(file) {
    if (!file) return;

    const validExtensions = ['.md', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext)) || file.type.startsWith('text/');

    if (!isValid) {
      if (typeof showToast === 'function') {
        showToast('Solo se admiten archivos .md o .txt para anexar.', 'error');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const appendedText = e.target.result;
      if (typeof appendedText !== 'string') return;

      const currentText = this.textarea.value;
      const separator = currentText.trim().length > 0 ? '\n\n---\n\n' : '';

      this.textarea.value = currentText + separator + appendedText;
      this.triggerAutoSave();

      if (this.currentView === 'preview') {
        this.renderPreview();
      }

      if (typeof showToast === 'function') {
        showToast(`Archivo "${file.name}" anexado correctamente al final`, 'success');
      }
    };

    reader.onerror = () => {
      if (typeof showToast === 'function') {
        showToast('Error al leer el archivo seleccionado.', 'error');
      }
    };

    reader.readAsText(file);
  },

  /**
   * Descarga el contenido actual de la libreta abriendo la ventana del Explorador
   * del sistema operativo (File System Access API) o descarga directa como respaldo.
   */
  async downloadMarkdownFile() {
    const content = this.textarea ? this.textarea.value : '';
    if (!content.trim()) {
      if (typeof showToast === 'function') {
        showToast('La libreta está vacía. Escribe algo antes de descargar.', 'error');
      }
      return;
    }

    // Nombre por defecto basado en el título del curso
    const courseTitle = (typeof courseManager !== 'undefined' && courseManager.course?.courseTitle) 
      ? courseManager.course.courseTitle 
      : 'apuntes_curso';
    
    const cleanDefault = courseTitle
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ_-]/gi, '_')
      .replace(/_+/g, '_')
      .trim();

    const defaultFilename = `apuntes_${cleanDefault || 'curso'}.md`;

    // 1. Vía Principal: Ventana nativa del explorador de archivos (File System Access API)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [
            {
              description: 'Documento Markdown (*.md)',
              accept: {
                'text/markdown': ['.md'],
                'text/plain': ['.txt']
              }
            }
          ]
        });

        const writableStream = await fileHandle.createWritable();
        await writableStream.write(content);
        await writableStream.close();

        if (typeof showToast === 'function') {
          showToast(`Archivo "${fileHandle.name}" guardado exitosamente`, 'success');
        }
        return;
      } catch (err) {
        // Si el usuario canceló en la ventana del explorador, salir silenciosamente
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('Error con showSaveFilePicker, procediendo con descarga estándar:', err);
      }
    }

    // 2. Vía de Respaldo: Descarga directa tradicional sin prompt
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = url;
      tempLink.download = defaultFilename;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      setTimeout(() => URL.revokeObjectURL(url), 2000);

      if (typeof showToast === 'function') {
        showToast(`Apuntes descargados como "${defaultFilename}"`, 'success');
      }
    } catch (err) {
      console.error('Error al descargar archivo Markdown:', err);
      if (typeof showToast === 'function') {
        showToast('Ocurrió un error al generar la descarga.', 'error');
      }
    }
  },

  /**
   * Carga preferencias guardadas de fuente y tamaño
   */
  loadInitialPreferences() {
    const savedFont = LocalStorageManager.get('notes_pref_font', 'font-jakarta');
    const savedSize = LocalStorageManager.get('notes_pref_size', '15px');

    this.applyFontFamily(savedFont);
    this.applyFontSize(savedSize);

    if (this.colorSwatch && this.colorInput) {
      this.colorSwatch.style.backgroundColor = this.colorInput.value;
    }
  },

  /**
   * Parser nativo y ligero de Markdown para renderizar vista previa
   * @param {string} md 
   * @returns {string}
   */
  parseMarkdown(md) {
    if (!md) return '';

    let html = md;

    // Preservar bloques de código con ```
    const codeBlocks = [];
    html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, (match, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`<pre class="notes-code-block"><code>${this.escapeHtml(code.trim())}</code></pre>`);
      return placeholder;
    });

    // Código inline `codigo`
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="notes-inline-code">${this.escapeHtml(code)}</code>`;
    });

    // Encabezados H1, H2, H3
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Citas > texto
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Negrita **texto** o __texto__
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Cursiva *texto* o _texto_
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Línea horizontal --- o ***
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');

    // Listas desordenadas (- elemento o * elemento)
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Enlaces [texto](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Saltos de línea y párrafos simples
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Restaurar bloques de código
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`__CODE_BLOCK_${idx}__`, block);
    });

    return `<div class="markdown-rendered">${html}</div>`;
  },

  /**
   * Escapa caracteres HTML para seguridad
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
