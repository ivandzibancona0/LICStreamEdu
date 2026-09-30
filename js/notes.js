/**
 * notes.js - LICStreamEdu
 * Módulo para la Libreta de Apuntes integrada estilo Obsidian.
 * Réplica fiel adaptada del motor de notas de LICBook:
 * - Soporte Markdown Obsidian de alta fidelidad (H1-H6, **bold**, *italic*, ~~strike~~, ==highlight==, etc.)
 * - Listas de tareas interactivas (- [ ] / - [x]) sincronizadas bidireccionalmente
 * - Atajos de teclado: Ctrl+B, Ctrl+I, Ctrl+Shift+H (resaltar), Ctrl+Shift+S (tachar)
 * - Indentación inteligente con Tab / Shift+Tab (2 espacios)
 * - Autocontinuación de listas y tareas al presionar Enter
 * - Barra de herramientas con envoltura y desenvoltura inteligente
 * - Descarga .md con selector de explorador de archivos nativo y respaldo Blob
 * - Anexión de archivos .md y .txt
 * - Contador de estadísticas (caracteres y palabras) en tiempo real
 * - Autoguardado debounced sincronizado con courseManager y localStorage
 */

const NotesManager = {
  drawer: null,
  trigger: null,
  backdrop: null,
  textarea: null,
  preview: null,
  saveStatus: null,
  titleEl: null,
  fileInput: null,
  btnDownload: null,
  btnAppend: null,
  btnTabEdit: null,
  btnTabPreview: null,
  formattingTools: null,
  charCountEl: null,
  wordCountEl: null,
  currentView: 'edit', // 'edit' | 'preview'
  saveTimeout: null,

  /**
   * Inicializa la libreta de apuntes y asocia eventos
   */
  init() {
    this.drawer = document.getElementById('reader-notes-drawer') || document.getElementById('notesDrawer');
    this.trigger = document.getElementById('notesDrawerTrigger') || document.getElementById('btn-reader-notes-tab');
    this.backdrop = document.getElementById('notesDrawerBackdrop');
    this.textarea = document.getElementById('reader-notes-textarea') || document.getElementById('notesTextarea');
    this.preview = document.getElementById('reader-notes-preview') || document.getElementById('notesPreviewContainer');
    this.saveStatus = document.getElementById('notes-save-status') || document.getElementById('notesSaveStatus');
    this.titleEl = document.getElementById('notes-book-title') || document.getElementById('notesDrawerSubtitle');
    this.fileInput = document.getElementById('notes-file-input') || document.getElementById('notesFileInput');
    this.btnDownload = document.getElementById('btn-download-notes') || document.getElementById('btnDownloadNotes');
    this.btnAppend = document.getElementById('btn-append-notes') || document.getElementById('btnAppendNotesFile');
    this.btnTabEdit = document.getElementById('btn-notes-tab-edit') || document.getElementById('btnNotesViewEditor');
    this.btnTabPreview = document.getElementById('btn-notes-tab-preview') || document.getElementById('btnNotesViewPreview');
    this.formattingTools = document.getElementById('notes-formatting-tools') || document.getElementById('notes-markdown-toolbar');
    this.charCountEl = document.getElementById('notes-char-count') || document.getElementById('notesCharCount');
    this.wordCountEl = document.getElementById('notes-word-count') || document.getElementById('notesWordCount');

    if (!this.drawer || !this.textarea) return;

    this.setupDrawerEvents();
    this.setupToolbarEvents();
    this.setupEditorEvents();
    this.setupFileEvents();
    this.setupPreviewEvents();
    this.updateCourseSubtitle();
    this.updateNotesStats();
  },

  /**
   * Carga las notas iniciales desde el estado del curso
   * @param {string} initialText 
   */
  loadNotes(initialText = '') {
    if (this.textarea) {
      this.textarea.value = initialText || '';
      this.updateSaveIndicator('saved');
      this.updateCourseSubtitle();
      this.updateNotesStats();
      if (this.currentView === 'preview') {
        this.renderNotesPreview();
      }
    }
  },

  /**
   * Configura eventos de apertura, cierre y accesibilidad del Drawer
   */
  setupDrawerEvents() {
    // Abrir o alternar al hacer clic en la pestaña flotante lateral
    this.trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Botón de cierre superior
    const btnClose = document.getElementById('btn-close-notes') || document.getElementById('btnCloseNotesDrawer');
    btnClose?.addEventListener('click', () => {
      this.close();
    });

    // Cerrar al hacer clic en el backdrop
    this.backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Cerrar con Escape si el drawer está abierto
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  },

  /**
   * Abre el Drawer con animación suave
   */
  open() {
    if (!this.drawer) return;
    this.drawer.classList.add('open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.backdrop?.classList.add('open');
    this.trigger?.classList.add('active');

    // Cargar notas actuales del curso si el textarea está vacío
    if (typeof courseManager !== 'undefined') {
      const currentNotes = courseManager.getNotes ? courseManager.getNotes() : (courseManager.course?.notes || '');
      if (this.textarea && !this.textarea.value && currentNotes) {
        this.textarea.value = currentNotes;
      }
    }

    this.updateCourseSubtitle();
    this.updateNotesStats();

    // Foco en el editor si está en modo edición
    if (this.currentView === 'edit') {
      setTimeout(() => this.textarea?.focus(), 250);
    } else {
      this.renderNotesPreview();
    }
  },

  /**
   * Cierra el Drawer
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
   * Cambia el modo de visualización: 'edit' o 'preview'
   */
  setNotesViewMode(mode) {
    this.currentView = mode;

    if (mode === 'preview') {
      this.btnTabEdit?.classList.remove('active');
      this.btnTabPreview?.classList.add('active');
      if (this.textarea) this.textarea.style.display = 'none';
      if (this.preview) this.preview.style.display = 'block';
      this.formattingTools?.classList.add('disabled');
      this.renderNotesPreview();
    } else {
      this.btnTabPreview?.classList.remove('active');
      this.btnTabEdit?.classList.add('active');
      if (this.preview) this.preview.style.display = 'none';
      if (this.textarea) this.textarea.style.display = 'block';
      this.formattingTools?.classList.remove('disabled');
      this.textarea?.focus();
    }
  },

  /**
   * Alias de compatibilidad para setNotesViewMode
   */
  setView(view) {
    const mode = (view === 'preview') ? 'preview' : 'edit';
    this.setNotesViewMode(mode);
  },

  /**
   * Configura eventos de la barra de herramientas y botones de formato
   */
  setupToolbarEvents() {
    // Pestaña Editar
    this.btnTabEdit?.addEventListener('click', () => {
      this.setNotesViewMode('edit');
    });

    // Pestaña Previa
    this.btnTabPreview?.addEventListener('click', () => {
      this.setNotesViewMode('preview');
    });

    // Botones de la barra de formato (delegación de clics)
    if (this.formattingTools) {
      this.formattingTools.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-tool') || e.target.closest('.notes-tool-btn');
        if (!btn) return;
        const action = btn.dataset.action || btn.dataset.tool;
        if (!action) return;

        // Pasar primero al modo edición para ver el cambio
        this.setNotesViewMode('edit');
        this.applyMarkdownFormat(action);
      });
    }
  },

  /**
   * Aplica formato Markdown con envoltura y desenvoltura inteligente (LICBook Engine)
   */
  applyMarkdownFormat(action) {
    if (!this.textarea) return;

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;
    const hasSelection = start !== end;
    const selectedText = hasSelection ? text.substring(start, end) : '';

    // Normalizar nombres de herramientas
    const actionMap = {
      'bold': 'bold',
      'italic': 'italic',
      'strike': 'strike',
      'highlight': 'highlight',
      'code': 'code',
      'h1': 'h1',
      'h2': 'h2',
      'h3': 'h3',
      'quote': 'quote',
      'list': 'bullet-list',
      'bullet-list': 'bullet-list',
      'task-list': 'task-list',
      'hr': 'hr'
    };
    const act = actionMap[action] || action;

    // 1. Formatos de envoltura inline
    const inlineFormats = {
      bold: { prefix: '**', suffix: '**', defaultText: 'texto en negrita' },
      italic: { prefix: '*', suffix: '*', defaultText: 'texto en cursiva' },
      strike: { prefix: '~~', suffix: '~~', defaultText: 'texto tachado' },
      highlight: { prefix: '==', suffix: '==', defaultText: 'texto resaltado' },
      code: { prefix: '`', suffix: '`', defaultText: 'código' }
    };

    if (inlineFormats[act]) {
      const { prefix, suffix, defaultText } = inlineFormats[act];
      if (hasSelection) {
        if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length >= prefix.length + suffix.length) {
          // Desenvolver (quitar formato)
          const unwrapped = selectedText.slice(prefix.length, -suffix.length);
          this.textarea.value = text.substring(0, start) + unwrapped + text.substring(end);
          this.textarea.setSelectionRange(start, start + unwrapped.length);
        } else {
          // Envolver
          const wrapped = prefix + selectedText + suffix;
          this.textarea.value = text.substring(0, start) + wrapped + text.substring(end);
          this.textarea.setSelectionRange(start, start + wrapped.length);
        }
      } else {
        const insertion = prefix + defaultText + suffix;
        this.textarea.value = text.substring(0, start) + insertion + text.substring(end);
        this.textarea.setSelectionRange(start + prefix.length, start + prefix.length + defaultText.length);
      }
      this.textarea.focus();
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // 2. Formatos de prefijo de línea (H1, H2, H3, cita, viñetas, tareas)
    const linePrefixes = {
      h1: '# ',
      h2: '## ',
      h3: '### ',
      quote: '> ',
      'bullet-list': '- ',
      'task-list': '- [ ] '
    };

    if (linePrefixes[act]) {
      const prefix = linePrefixes[act];
      const startOfLine = text.lastIndexOf('\n', start - 1) + 1;
      let endOfLine = text.indexOf('\n', end);
      if (endOfLine === -1) endOfLine = text.length;

      const lines = text.substring(startOfLine, endOfLine).split('\n');

      const formatted = lines.map(line => {
        if (prefix.startsWith('#')) {
          const clean = line.replace(/^#{1,6}\s*/, '');
          const fallback = act === 'h1' ? 'Título Principal' : act === 'h2' ? 'Subtítulo' : 'Sección';
          return prefix + (clean || fallback);
        }
        if (prefix === '- [ ] ') {
          if (line.match(/^[-*+]\s+\[[ xX]\]\s+/)) {
            return line.replace(/^[-*+]\s+\[[ xX]\]\s+/, '');
          }
          const clean = line.replace(/^(\s*[-*+]|\s*\d+\.)\s*/, '');
          return prefix + clean;
        }
        if (prefix === '- ') {
          if (line.startsWith('- ')) return line.substring(2);
          return prefix + line.replace(/^[-*+]\s+/, '');
        }
        if (prefix === '> ') {
          if (line.startsWith('> ')) return line.substring(2);
          return prefix + line;
        }
        return prefix + line;
      });

      const replacement = formatted.join('\n');
      this.textarea.value = text.substring(0, startOfLine) + replacement + text.substring(endOfLine);
      this.textarea.setSelectionRange(startOfLine, startOfLine + replacement.length);
      this.textarea.focus();
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // 3. Separador horizontal
    if (act === 'hr') {
      const insertion = '\n\n---\n\n';
      this.textarea.value = text.substring(0, start) + insertion + text.substring(end);
      const newPos = start + insertion.length;
      this.textarea.setSelectionRange(newPos, newPos);
      this.textarea.focus();
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  },

  /**
   * Alias de compatibilidad para applyMarkdownFormat
   */
  applyFormatTool(tool) {
    this.applyMarkdownFormat(tool);
  },

  /**
   * Eventos del editor: guardado automático y atajos de teclado avanzados
   */
  setupEditorEvents() {
    if (!this.textarea) return;

    // 1. Guardado automático con debounce y estadísticas
    this.textarea.addEventListener('input', () => {
      this.updateNotesStats();
      this.updateSaveIndicator('saving');

      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        const text = this.textarea.value;
        if (typeof courseManager !== 'undefined') {
          courseManager.setNotes(text);
        }
        if (typeof LocalStorageManager !== 'undefined') {
          LocalStorageManager.set('lic_notes_current', text);
        }
        this.updateSaveIndicator('saved');
      }, 400);
    });

    // 2. Atajos de teclado avanzados (LICBook)
    this.textarea.addEventListener('keydown', (e) => {
      // Ctrl+B / Cmd+B -> Negrita
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        this.applyMarkdownFormat('bold');
        return;
      }

      // Ctrl+I / Cmd+I -> Cursiva
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        this.applyMarkdownFormat('italic');
        return;
      }

      // Ctrl+Shift+H -> Resaltado Obsidian
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        this.applyMarkdownFormat('highlight');
        return;
      }

      // Ctrl+Shift+S -> Tachado
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        this.applyMarkdownFormat('strike');
        return;
      }

      // Tab -> Indentación de 2 espacios
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (e.shiftKey) {
          const lineStart = this.textarea.value.lastIndexOf('\n', start - 1) + 1;
          const line = this.textarea.value.substring(lineStart, end);
          if (line.startsWith('  ')) {
            this.textarea.value = this.textarea.value.substring(0, lineStart) + line.substring(2) + this.textarea.value.substring(end);
            this.textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
          }
        } else {
          this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
          this.textarea.setSelectionRange(start + 2, start + 2);
        }
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // Enter -> Autocontinuación de listas y tareas
      if (e.key === 'Enter') {
        const start = this.textarea.selectionStart;
        const lineStart = this.textarea.value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = this.textarea.value.substring(lineStart, start);

        // Ítem de tarea: - [ ] o - [x]
        const taskMatch = currentLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)(.*)$/);
        if (taskMatch) {
          e.preventDefault();
          if (!taskMatch[2].trim()) {
            this.textarea.value = this.textarea.value.substring(0, lineStart) + this.textarea.value.substring(start);
            this.textarea.setSelectionRange(lineStart, lineStart);
          } else {
            const prefix = currentLine.match(/^\s*[-*+]\s+/)[0] + '[ ] ';
            this.textarea.value = this.textarea.value.substring(0, start) + '\n' + prefix + this.textarea.value.substring(start);
            this.textarea.setSelectionRange(start + 1 + prefix.length, start + 1 + prefix.length);
          }
          this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }

        // Ítem de viñeta: - o *
        const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
        if (bulletMatch) {
          e.preventDefault();
          if (!bulletMatch[2].trim()) {
            this.textarea.value = this.textarea.value.substring(0, lineStart) + this.textarea.value.substring(start);
            this.textarea.setSelectionRange(lineStart, lineStart);
          } else {
            const prefix = bulletMatch[1];
            this.textarea.value = this.textarea.value.substring(0, start) + '\n' + prefix + this.textarea.value.substring(start);
            this.textarea.setSelectionRange(start + 1 + prefix.length, start + 1 + prefix.length);
          }
          this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    });
  },

  /**
   * Eventos de la vista previa: interactividad en casillas de verificación
   */
  setupPreviewEvents() {
    if (!this.preview) return;

    this.preview.addEventListener('change', (e) => {
      if (e.target.classList.contains('obsidian-task-checkbox')) {
        const taskItem = e.target.closest('.obsidian-task-item');
        if (!taskItem || !this.textarea) return;
        const lineIdx = parseInt(taskItem.dataset.lineIndex, 10);
        const isChecked = e.target.checked;

        const lines = this.textarea.value.split('\n');
        if (lines[lineIdx] !== undefined) {
          if (isChecked) {
            lines[lineIdx] = lines[lineIdx].replace(/^(\s*[-*+]\s+\[)\s*(\])/, '$1x$2');
          } else {
            lines[lineIdx] = lines[lineIdx].replace(/^(\s*[-*+]\s+\[)[xX](\])/, '$1 $2');
          }
          this.textarea.value = lines.join('\n');
          taskItem.classList.toggle('completed', isChecked);

          if (typeof courseManager !== 'undefined') {
            courseManager.setNotes(this.textarea.value);
          }
          this.updateNotesStats();
          this.updateSaveIndicator('saved');
        }
      }
    });
  },

  /**
   * Renderiza la vista previa usando el parser Obsidian
   */
  renderNotesPreview() {
    if (!this.preview || !this.textarea) return;
    const rawText = this.textarea.value;
    this.preview.innerHTML = this.parseObsidianMarkdown(rawText);
  },

  /**
   * Parser nativo y fiel de Markdown estilo Obsidian (LICBook Engine)
   * Soporta: H1-H6, **negrita**, *cursiva*, ~~tachado~~, ==resaltado==, listas, tareas interactivas,
   * citas en bloque, bloques de código, código inline, enlaces, wikilinks y reglas horizontales.
   * @param {string} markdown 
   * @returns {string}
   */
  parseObsidianMarkdown(markdown) {
    if (!markdown || !markdown.trim()) {
      return `
        <div class="obsidian-empty-preview">
          <p style="font-size: 1.1rem; margin-bottom: 6px; font-weight: 600;">📓 Libreta sin notas</p>
          <p style="font-size: 0.82rem; opacity: 0.8;">Escribe tus apuntes en la pestaña <strong>Editar</strong> con formato Markdown tipo Obsidian.</p>
        </div>
      `;
    }

    const escapeHtml = (str) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // 1. Proteger bloques de código
    const codeBlocks = [];
    let processed = markdown.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre class="obsidian-code-block"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code.trim())}</code></pre>`);
      return `§CODEBLOCK${idx}§`;
    });

    // 2. Proteger código inline
    const inlineCodes = [];
    processed = processed.replace(/`([^`\n]+)`/g, (match, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code class="obsidian-inline-code">${escapeHtml(code)}</code>`);
      return `§INLINECODE${idx}§`;
    });

    // Helper para formato inline
    const parseInline = (str) => {
      let s = escapeHtml(str);
      // Obsidian Highlight: ==texto==
      s = s.replace(/==(.*?)==/g, '<mark class="obsidian-highlight">$1</mark>');
      // Negrita + Cursiva: ***texto***
      s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      // Negrita: **texto** o __texto__
      s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__(.*?)__/g, '<strong>$1</strong>');
      // Cursiva: *texto* o _texto_
      s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
      // Tachado: ~~texto~~
      s = s.replace(/~~(.*?)~~/g, '<del>$1</del>');
      // Obsidian Wikilink: [[página]]
      s = s.replace(/\[\[(.*?)\]\]/g, '<span class="obsidian-wikilink">[[ $1 ]]</span>');
      // Enlace estándar: [texto](url)
      s = s.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="obsidian-link">$1</a>');
      return s;
    };

    const lines = processed.split('\n');
    const output = [];
    let inList = null;
    let inBlockquote = false;
    let blockquoteBuffer = [];

    const flushList = () => {
      if (inList) {
        if (inList === 'task') output.push('</ul>');
        else output.push(`</${inList}>`);
        inList = null;
      }
    };

    const flushBlockquote = () => {
      if (inBlockquote) {
        const content = blockquoteBuffer.map(b => parseInline(b)).join('<br>');
        output.push(`<blockquote class="obsidian-quote">${content}</blockquote>`);
        inBlockquote = false;
        blockquoteBuffer = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      // Bloque de código protegido
      const cbMatch = line.trim().match(/^§CODEBLOCK(\d+)§$/);
      if (cbMatch) {
        flushList();
        flushBlockquote();
        const idx = parseInt(cbMatch[1], 10);
        output.push(codeBlocks[idx]);
        return;
      }

      // Citas en bloque: > texto
      const bqMatch = line.match(/^>\s?(.*)$/);
      if (bqMatch) {
        flushList();
        inBlockquote = true;
        blockquoteBuffer.push(bqMatch[1]);
        return;
      } else {
        flushBlockquote();
      }

      // Regla horizontal: --- o *** o ___
      if (/^(?:---|\*\*\*|___)\s*$/.test(line)) {
        flushList();
        output.push('<hr class="obsidian-hr">');
        return;
      }

      // Encabezados: # H1 a ###### H6
      const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        flushList();
        const level = hMatch[1].length;
        const text = parseInline(hMatch[2]);
        output.push(`<h${level} class="obsidian-h${level}">${text}</h${level}>`);
        return;
      }

      // Lista de tareas interactivas: - [ ] o - [x]
      const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        if (inList !== 'task') {
          flushList();
          output.push('<ul class="obsidian-task-list">');
          inList = 'task';
        }
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const text = parseInline(taskMatch[2]);
        output.push(`<li class="obsidian-task-item ${isChecked ? 'completed' : ''}" data-line-index="${lineIdx}">
          <input type="checkbox" class="obsidian-task-checkbox" ${isChecked ? 'checked' : ''}>
          <span>${text}</span>
        </li>`);
        return;
      }

      // Lista de viñetas: - o * o +
      const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
      if (bulletMatch) {
        if (inList !== 'ul') {
          flushList();
          output.push('<ul class="obsidian-ul">');
          inList = 'ul';
        }
        output.push(`<li>${parseInline(bulletMatch[1])}</li>`);
        return;
      }

      // Lista numerada: 1.
      const numMatch = line.match(/^\d+\.\s+(.*)$/);
      if (numMatch) {
        if (inList !== 'ol') {
          flushList();
          output.push('<ol class="obsidian-ol">');
          inList = 'ol';
        }
        output.push(`<li>${parseInline(numMatch[1])}</li>`);
        return;
      }

      // Línea vacía de espaciado
      if (!line.trim()) {
        flushList();
        output.push('<div class="obsidian-spacing"></div>');
        return;
      }

      // Párrafo estándar
      flushList();
      output.push(`<p class="obsidian-p">${parseInline(line)}</p>`);
    });

    flushList();
    flushBlockquote();

    let html = output.join('\n');

    // Restaurar bloques protegidos
    codeBlocks.forEach((block, idx) => {
      html = html.replace(new RegExp(`§CODEBLOCK${idx}§`, 'g'), block);
    });
    inlineCodes.forEach((code, idx) => {
      html = html.replace(new RegExp(`§INLINECODE${idx}§`, 'g'), code);
    });

    return html;
  },

  /**
   * Alias de compatibilidad para parseObsidianMarkdown
   */
  parseMarkdown(md) {
    return this.parseObsidianMarkdown(md);
  },

  /**
   * Actualiza el indicador visual de guardado en la cabecera
   */
  updateSaveIndicator(status) {
    if (!this.saveStatus) return;
    if (status === 'saving') {
      this.saveStatus.innerHTML = '<span class="save-status-dot saving"></span> Guardando...';
    } else {
      this.saveStatus.innerHTML = '<span class="save-status-dot"></span> Guardado';
    }
  },

  /**
   * Actualiza los contadores de caracteres y palabras con formato localizado
   */
  updateNotesStats() {
    if (!this.textarea) return;
    const text = this.textarea.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

    if (this.charCountEl) {
      this.charCountEl.textContent = `${chars.toLocaleString()} ${chars === 1 ? 'carácter' : 'caracteres'}`;
    }
    if (this.wordCountEl) {
      this.wordCountEl.textContent = `${words.toLocaleString()} ${words === 1 ? 'palabra' : 'palabras'}`;
    }
  },

  /**
   * Alias de compatibilidad para updateNotesStats
   */
  updateCounters() {
    this.updateNotesStats();
  },

  /**
   * Actualiza el subtítulo dinámicamente con el título del curso actual
   */
  updateCourseSubtitle() {
    if (!this.titleEl) return;
    const courseTitle = (typeof courseManager !== 'undefined' && courseManager.course?.courseTitle)
      ? courseManager.course.courseTitle
      : 'Clean Code: Manual de Desarrollo Ágil';
    this.titleEl.textContent = courseTitle;
    this.titleEl.title = courseTitle;
  },

  /**
   * Configura eventos de los botones "Anexar archivo" y "Descargar .md"
   */
  setupFileEvents() {
    // Botón Anexar Archivo
    this.btnAppend?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.appendFileContent(file);
      }
      if (this.fileInput) this.fileInput.value = '';
    });

    // Botón Descargar con Nombre Personalizado
    this.btnDownload?.addEventListener('click', () => {
      this.downloadNotesMarkdown();
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
      this.textarea.dispatchEvent(new Event('input', { bubbles: true }));

      if (this.currentView === 'preview') {
        this.renderNotesPreview();
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
   * Descarga los apuntes en formato .md
   */
  async downloadNotesMarkdown() {
    const content = this.textarea ? this.textarea.value : '';
    if (!content.trim()) {
      if (typeof showToast === 'function') {
        showToast('La libreta está vacía. Escribe algo antes de descargar.', 'error');
      }
      return;
    }

    const courseTitle = (typeof courseManager !== 'undefined' && courseManager.course?.courseTitle) 
      ? courseManager.course.courseTitle 
      : 'apuntes_curso';
    
    const cleanDefault = courseTitle
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ_-]/gi, '_')
      .replace(/_+/g, '_')
      .trim();

    const defaultFilename = `apuntes_${cleanDefault || 'curso'}.md`;

    // 1. Vía Principal: File System Access API
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
        if (err.name === 'AbortError') return;
        console.warn('Error con showSaveFilePicker, procediendo con descarga estándar:', err);
      }
    }

    // 2. Vía de Respaldo: Descarga tradicional con Blob
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
   * Alias de compatibilidad para downloadNotesMarkdown
   */
  downloadMarkdownFile() {
    this.downloadNotesMarkdown();
  }
};
