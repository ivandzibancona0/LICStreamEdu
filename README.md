# LICStreamEdu - Reproductor Inteligente de Cursos

<p align="center">
  <img src="assets/logo.png" alt="LICStreamEdu Logo" width="130"><br>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="Licencia MIT"></a>
  <img src="https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E.svg?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/HTML5-CSS3-E34F26.svg?logo=html5&logoColor=white" alt="HTML5 & CSS3">
</p>

Una aplicación web moderna, minimalista y de alto rendimiento desarrollada exclusivamente con **HTML5, CSS3 y JavaScript moderno (ES6+ Vanilla)**, sin dependencias, librerías ni frameworks externos.

Diseñada con enfoque **Mobile-First**, soporte de **6 paletas de colores intercambiables**, persistencia local completa (`localStorage` e `IndexedDB`), reproductor embebido de YouTube con soporte de fraccionamiento por minutos, libreta de apuntes en Markdown, recorrido guiado interactivo (*Spotlight Tour*), gestor de recursos y exportación/importación bidireccional en formato JSON.

---

## Características Principales

### 1. Diseño Moderno y Minimalista (Mobile-First)
- Tipografía refinada `Plus Jakarta Sans`.
- Sistema de diseño con elevaciones, bordes translúcidos y micro-interacciones suaves.
- Iconografía vectorial 100% SVG en línea optimizada.
- Layout adaptable: vista compacta con menú desplegable en pantallas móviles y panel dividido con consola de reproducción en pantallas de escritorio.
- Relación de aspecto 16:9 responsiva en cualquier resolución.

### 2. Experiencia de Bienvenida y Recorrido Guiado (Spotlight Tour)
- **Modal de Bienvenida (Onboarding)**: Al abrir por primera vez la aplicación, el usuario puede elegir entre **«Explorar Curso Demo»** (con tour interactivo guiado) o **«Comenzar desde Cero»**.
- **Spotlight Tour Nativo**: Recorrido de 5 pasos clave que resalta visualmente los elementos esenciales: *Progreso y Temas*, *Reproductor 16:9*, *Módulos y Lecciones*, *Búsqueda y Filtros*, y *Libreta de Apuntes*.
- **Atajos de Teclado**: Navegación fluida con `Enter` / `Flecha derecha` (avanzar), `Flecha izquierda` (retroceder) y `Escape` (omitir).
- **Botón de Reinicio**: Botón con brújula SVG en la cabecera para reiniciar el recorrido guiado en cualquier momento.

### 3. Libreta de Apuntes Integrada (Notes Drawer)
- Cajón lateral deslizable para tomar notas en tiempo real mientras se visualizan las lecciones.
- **Renderizado de Markdown instantáneo**: Formateo en vivo de títulos (`#`), listas, citas, negritas y bloques de código.
- **Selector de Tipografías**: Alterna al instante entre Sans-Serif (`Plus Jakarta Sans`), Monoespaciada (`JetBrains Mono`) o Serif (`Merriweather`).
- **Anexar Archivos**: Botón para incorporar apuntes existentes desde archivos locales `.md` o `.txt`.
- **Descarga Nativa con Ventana de Windows**: Integración con la API moderna `window.showSaveFilePicker` para guardar el archivo `.md` seleccionando nombre y carpeta de destino directamente en el sistema operativo.

### 4. 6 Paletas de Colores Predefinidas
- **Obsidian Dark**: Fondo oscuro moderno con acento Índigo/Violeta.
- **Cyber Emerald**: Oscuro profundo con acento Verde Esmeralda y Menta.
- **Nordic Frost**: Azul marino ártico con acento Cian Glaciar.
- **Sunset Amber**: Grafito cálido con acento Ámbar/Fuego.
- **Clean Light**: Modo claro minimalista con alto contraste y acento Azul Zafiro.
- **Rose Quartz**: Púrpura sofisticado con acento Rosa Eléctrico.
- Selector interactivo con vista previa visual y persistencia en `localStorage`.

### 5. Carga y Gestión Flexible de Cursos (JSON)
- Carga archivos `.json` locales mediante arrastrar y soltar (Drag & Drop) o explorador de archivos.
- Carga remota directamente desde URLs en la nube (soporta CORS).
- Botón rápido para cargar el curso de demostración incluido (`sample-course.json`).
- Admite estructuras jerárquicas con módulos/playlists o listas planas de videos.

### 6. Seguimiento de Progreso y Filtrado Inteligente
- Indicador de progreso global con porcentaje dinámico en tiempo real (`X de Y completados - Z%`).
- Casillas interactivas (checkbox con SVG animado) para marcar lecciones como vistas o pendientes.
- Avance automático a la siguiente lección al completar un video.
- Filtros de navegación rápida: **Todos**, **Pendientes** y **Completados**, además de barra de búsqueda instantánea por título o descripción.

### 7. Fraccionamiento de Videos por Minutos (Start / End)
- Soporte para reproducir fragmentos o lecciones específicas dentro de videos largos de YouTube (ej. conferencias, directos o tutoriales extensos).
- Admite formatos de tiempo como `02:30` (minutos y segundos) o `150` (segundos).
- Píldora indicadora con el fragmento de tiempo activo visible junto al reproductor.

### 8. Edición y Reorganización de Lecciones
- **Edición Completa**: Cada lección cuenta con un botón de edición (✏️) que permite modificar en caliente su título, URL de YouTube (con vista previa de miniatura), minutos de inicio/fin, descripción y módulo asignado.
- **Reorganizar por Arrastrar y Soltar (Drag & Drop)**: Tirador táctil (`⋮⋮`) en cada tarjeta para reordenar lecciones dentro del mismo módulo o moverlas entre módulos distintos, con líneas guía visuales y renumeración secuencial automática.
- **Renombrado del Curso**: Posibilidad de cambiar el título general del curso mediante clic directo o botón de edición en la barra lateral.

### 9. Cerrar y Desconectar Curso Actual
- Botón de cierre (`#btnCloseCourse`) ubicado junto al título del curso en la barra lateral.
- Ventana modal de confirmación con dos opciones seguras:
  - **«Exportar y Cerrar»**: Genera y descarga un archivo `.json` de respaldo completo (con videos, apuntes y recursos) antes de limpiar la sesión.
  - **«Cerrar Curso»**: Desconecta el curso actual y reinicia el lienzo en blanco para comenzar uno nuevo.
- Restablecimiento automático del título de la barra lateral a su valor original (*«Contenido del Curso»*).

### 10. Gestor de Recursos Adicionales y Enlaces en la Nube
- Almacenamiento de archivos binarios (PDFs, diapositivas, proyectos, código) de hasta 10 MB en **IndexedDB**.
- Soporte para registrar enlaces directos a recursos en la nube (Google Drive, Dropbox, GitHub, etc.).
- **Vinculación con el Archivo del Curso**: Al exportar a JSON, se incluyen los recursos y enlaces vinculados; al importar el JSON en cualquier dispositivo, se restauran automáticamente.
- **Limpieza Automática**: Al cerrar el curso, los recursos asociados se eliminan de `IndexedDB` y memoria, devolviendo el contador a `Recursos (0)`. Depuración automática de archivos huérfanos al iniciar sin curso activo.

---

## Estructura del Proyecto

```
App Reproductor de Cursos/
├── index.html              # Estructura semántica, accesibilidad y modales
├── styles.css              # Sistema de diseño, variables de temas y layout responsivo
├── sample-course.json      # Curso demo con 3 módulos, 8 lecciones, notas y recursos
├── README.md               # Documentación general del proyecto
├── LICENSE                 # Texto legal canónico de la Licencia MIT (Inglés)
├── LICENSE_ES              # Traducción de referencia de la Licencia MIT (Español)
├── assets/
│   └── logo.png            # Logotipo oficial de LICStreamEdu con fondo transparente
└── js/
    ├── storage.js          # Capa de persistencia (LocalStorage e IndexedDBManager)
    ├── youtube.js          # Extractor de IDs, URLs con timestamp y miniaturas de YouTube
    ├── themes.js           # Definición y alternancia de las 6 paletas de colores
    ├── courses.js          # Gestor de cursos, playlists, lecciones, progreso y cierre
    ├── attachments.js      # Validación (10 MB), gestión de recursos locales y en la nube
    ├── notes.js            # Libreta de apuntes, Markdown en vivo y descarga nativa .md
    ├── tour.js             # Módulo TourManager nativo para el recorrido guiado interactivo
    └── app.js              # Controlador principal, renderizado y eventos de usuario
```

---

## Cómo Ejecutar la Aplicación

No requiere instalaciones, configuraciones complejas ni `npm install`.

### Opción 1: Abrir directamente
Haz doble clic sobre el archivo `index.html` en tu explorador de archivos para abrirlo en cualquier navegador web moderno (Chrome, Firefox, Edge, Safari, Brave, Opera).

### Opción 2: Usar un servidor local estático (Recomendado)
Para aprovechar de forma óptima la carga directa de archivos JSON por `fetch`, puedes iniciar un servidor local:

- **Con Python**:
  ```bash
  python -m http.server 8080
  ```
  Luego abre en tu navegador: `http://localhost:8080`

- **Con Node.js (npx serve)**:
  ```bash
  npx serve .
  ```

- **Con la extensión Live Server de VS Code**:
  Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.

---

## Formato del Archivo JSON

La aplicación utiliza un formato JSON estructurado, legible y completo que conserva videos, notas y recursos:

```json
{
  "courseTitle": "Masterclass de Desarrollo Web Frontend",
  "description": "Aprende los fundamentos y técnicas avanzadas de desarrollo web moderno.",
  "notes": "# Mis Apuntes del Curso 📚\n\n- Usar etiquetas semánticas.\n- Dominar Flexbox y Grid.",
  "playlists": [
    {
      "id": "modulo-1",
      "title": "Módulo 1: Fundamentos y Semántica Web",
      "videos": [
        {
          "id": "vid-101",
          "title": "1. Estructura y Semántica Moderna en HTML5",
          "url": "https://www.youtube.com/watch?v=k783iVqA68A",
          "description": "Organiza aplicaciones web con etiquetas semánticas y accesibilidad."
        },
        {
          "id": "vid-102",
          "title": "2. Fragmento: Ejes y Alineación en Flexbox",
          "url": "https://www.youtube.com/watch?v=JJSoEo8JSnc",
          "start": "02:30",
          "end": "12:45",
          "description": "Fragmento especializado en alineación de contenedores."
        }
      ]
    }
  ],
  "resources": [
    {
      "id": "res-flexbox-guide",
      "name": "Guía Visual de Flexbox y CSS Moderno (MDN)",
      "type": "cloud/url",
      "isCloudLink": true,
      "cloudUrl": "https://developer.mozilla.org/es/docs/Web/CSS/CSS_Flexible_Box_Layout"
    }
  ]
}
```

> **Nota de Compatibilidad**: Si cargas un archivo JSON que contenga únicamente una lista plana de videos `[ { "title": "...", "url": "..." } ]`, la aplicación lo normalizará automáticamente agrupándolos en una lista principal.

---

## Licencia

Este proyecto está distribuido bajo la Licencia de Código Abierto **MIT**. Eres libre de utilizarlo, modificarlo, redistribuirlo y adaptarlo tanto para fines educativos, personales como comerciales.

- [LICENSE](LICENSE): Texto legal canónico y oficial en inglés.
- [LICENSE_ES](LICENSE_ES): Traducción de referencia al español.

