Actúa como un desarrollador frontend experto en React y Tailwind CSS.

Quiero que refactorices por completo el componente que se renderiza en la ruta /dashboard/chatbot. El objetivo es transformar la interfaz de usuario (UI) a un panel de control completo, sin modificar ni eliminar ninguna lógica de backend o llamadas a API existentes. La funcionalidad actual debe ser integrada en el nuevo diseño.

Instrucción Crítica de Backend:
No elimines ni modifiques la lógica de conexión existente. El nuevo botón "Conectar WhatsApp" debe reutilizar la misma función que usa el botón actual ("Generar código QR"). El estado de "Conectado"/"Desconectado" debe seguir siendo controlado por los mismos datos que ya provienen del backend. Tu tarea es puramente de adaptación del frontend.

Nuevo Diseño y Funcionalidad (Descripción Detallada):

Necesito que construyas la nueva interfaz siguiendo esta estructura y estilo al pie de la letra:

Contenedor Principal y Títulos:

Crea un contenedor principal para toda la sección.

En la parte superior, añade un título <h2> que diga "Chatbot de WhatsApp" con una fuente grande y en negrita (text-2xl font-bold).

Debajo, un subtítulo <p> que diga "Automatiza la atención al cliente y mejora las ventas con inteligencia artificial" con un texto más pequeño y de color gris (text-gray-500).

Panel de Estadísticas (Tarjetas Superiores):

Crea un contenedor grid responsivo (con 5 columnas en escritorio, y que se ajuste en móviles) para las siguientes 5 tarjetas.

Estilo de las Tarjetas: Cada tarjeta debe tener un fondo blanco, esquinas redondeadas (rounded-lg), un padding interno (p-4) y una sombra sutil (shadow-md).

Contenido de cada tarjeta:

Tarjeta 1 (Estado): Un div con flex y items-center. A la izquierda, el ícono Circle de lucide-react (tamaño h-5 w-5, color text-green-500, y con fill="currentColor" para que esté relleno). A la derecha, un div con el texto "Estado" y debajo la palabra "Conectado" en negrita y color verde (font-bold text-green-500).

Tarjeta 2 (Mensajes Hoy): Un div con el ícono MessageSquare de lucide-react (text-blue-500). Al lado, un div con el texto "Mensajes Hoy" y debajo el número "24" en un tamaño de fuente grande y en negrita (text-2xl font-bold).

Tarjeta 3 (Automatizaciones): Un div con el ícono Wand2 de lucide-react (text-purple-500). Al lado, un div con el texto "Automatizaciones" y debajo el número "3" (text-2xl font-bold).

Tarjeta 4 (Promociones): Un div con el ícono Zap de lucide-react (text-yellow-500). Al lado, un div con el texto "Promociones" y debajo el número "2" (text-2xl font-bold).

Tarjeta 5 (Configuración): Esta es diferente. Debe ser un contenedor flex que alinee un único ícono Settings de lucide-react a la derecha del todo. Hazlo parecer un botón de acción.

Sistema de Pestañas (Tabs):

Debajo del panel de estadísticas, crea una barra de navegación con 5 botones que funcionarán como pestañas. Los textos deben ser: "Conexión", "Mensajes", "Mi Negocio", "Promociones" y "Automatización".

Estilo de las Pestañas: Deben ser botones sin fondo. La pestaña activa debe tener el texto en color azul (text-blue-600) y un borde inferior de color azul (border-b-2 border-blue-600). Las inactivas deben tener el texto en color gris.

Comportamiento CRÍTICO: La funcionalidad debe ser manejada con un estado local ( useState en React). Al hacer clic en una pestaña, el contenido inferior debe cambiar dinámicamente sin recargar la página ni cambiar la URL del navegador. La URL debe permanecer siempre en /dashboard/chatbot.

Contenido Condicional de las Pestañas:

Crea un área debajo de las pestañas donde se renderizará el contenido según la pestaña activa.

Contenido de "Conexión" (Pestaña por defecto):

Debe mostrarse al cargar la página.

Crea una tarjeta grande con fondo blanco y padding.

Título: "Conectar WhatsApp Business"

Subtítulo: "Escanea el código QR con tu WhatsApp Business para conectar tu cuenta."

Crea una sección con un flex y justify-between. A la izquierda, el texto "Estado de WhatsApp". A la derecha, una "píldora" o badge con esquinas redondeadas, fondo rojo (bg-red-100) y texto rojo (text-red-700) que diga "Desconectado".

Finalmente, un botón grande y oscuro (bg-gray-800 text-white) con el ícono de WhatsApp y el texto "Conectar WhatsApp". Este botón debe ejecutar la misma función que el botón original de la página.

Contenido de las otras 4 pestañas: Para "Mensajes", "Mi Negocio", "Promociones" y "Automatización", simplemente renderiza un componente placeholder. Por ejemplo, un div con un h2 que diga "Sección de [Nombre de la Pestaña] en construcción".

Tecnologías:

Framework: React (componentes funcionales y hooks).

Estilos: Tailwind CSS.

Iconos: lucide-react.