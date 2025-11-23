# Profe ELE – IA Voz

Un profesor virtual de español impulsado por IA que utiliza OpenAI Realtime API para conversación de voz en tiempo real con correcciones gramaticales inteligentes.

## Características

- **Conversación de voz en tiempo real** usando OpenAI Realtime API (gpt-realtime) con WebRTC
- **Transcripción en vivo** del habla del estudiante usando gpt-4o-transcribe
- **Correcciones gramaticales** impulsadas por gpt-5-mini con tarjetas visuales
- **Botón de micrófono interactivo** con ondas animadas que muestran el estado de habla
- **Cola inteligente de correcciones** que solo habla cuando es apropiado (sin interrumpir)
- **Interfaz de chat** que muestra burbujas de conversación para el asistente y el estudiante
- **Widget moderno** con diseño responsivo (380×680px)
- **Sistema de prompts basado en archivos** que permite personalización fácil sin cambios de código
- **Reproducción de audio** de respuestas del profesor de IA con voz expresiva (verse)
- **Indicadores visuales de estado** (estado de conexión, estado de habla) en el encabezado

## Configuración

### 1. Agregar la API Key de OpenAI

Esta aplicación requiere una clave de API de OpenAI para funcionar. Agrega tu clave en el panel de Secrets de Replit:

1. Ve a la pestaña "Secrets" (candado) en el panel izquierdo
2. Agrega una nueva secret:
   - Key: `OPENAI_API_KEY`
   - Value: tu clave de API de OpenAI

**Nota:** La API key **nunca** se expone al frontend. El frontend usa tokens efímeros generados por el backend.

### 2. Ejecutar la aplicación

Simplemente haz clic en el botón "Run" o ejecuta:

```bash
node backend/server.js
```

La aplicación estará disponible en `http://localhost:3000` o en la URL de Replit.

## Arquitectura

### Estructura de archivos

```
backend/
  server.js                    # Servidor Express principal
  services/
    realtimeSession.js        # Creación de sesiones Realtime
    grammarOracle.js          # Análisis gramatical con GPT-5-mini
    transcriber.js            # Transcripción de audio con GPT-4o-transcribe

frontend/
  index.html                  # Página principal
  ia-voz-core.js             # Lógica principal (WebRTC, Realtime API)
  ia-voz-ui.js               # Capa de UI (manipulación del DOM)
  ia-voz.css                 # Todos los estilos

prompts/
  realtime-prompt.md         # Instrucciones para el profesor ELE
  grammar-oracle-prompt.md   # Instrucciones para el oráculo de gramática
```

### Separación de responsabilidades

**Backend:**
- Gestiona la API key de OpenAI de forma segura
- Crea tokens efímeros para sesiones Realtime
- Procesa audio para transcripción
- Analiza gramática usando GPT-5-mini

**Frontend Core (ia-voz-core.js):**
- Gestiona conexión WebRTC
- Integración con Realtime API
- Grabación y procesamiento de audio
- Cola de correcciones
- **Sin manipulación del DOM**

**Frontend UI (ia-voz-ui.js):**
- Renderizado de la interfaz
- Gestión de eventos del usuario
- Actualización del DOM
- Callbacks del core

## Modelos de OpenAI utilizados

- **Conversación y voz:** `gpt-realtime` con voz `verse`
- **Oráculo de gramática:** `gpt-5-mini`
- **Transcripción:** `gpt-4o-transcribe`

## Personalización

### Cambiar el prompt del profesor

Edita `prompts/realtime-prompt.md` para modificar la personalidad y comportamiento del profesor virtual.

### Cambiar el prompt del oráculo de gramática

Edita `prompts/grammar-oracle-prompt.md` para ajustar cómo se detectan y explican los errores gramaticales.

### Cambiar la voz o modelo

Los modelos y configuración se pueden ajustar en `backend/server.js` en el endpoint `/config`.

### Personalizar el diseño

Todos los estilos visuales están en `frontend/ia-voz.css`. Las variables CSS están al principio del archivo para facilitar la personalización de colores.

## Endpoints de la API

- `GET /config` - Devuelve la configuración de la aplicación
- `POST /session` - Crea una nueva sesión Realtime
- `POST /correct` - Analiza texto para errores gramaticales
- `POST /transcribe` - Transcribe audio a texto en español

## Criterios de aceptación

Al pulsar el botón del micrófono:
- Se conecta (punto verde en el encabezado), se escuchan respuestas por voz
- Cuando el alumno deja de hablar, aparece el texto transcrito limpio
- Llega una tarjeta de corrección (incluso si no hay error, con "Está bien dicho.")
- Si hay error, el profesor lee una sola línea de corrección cuando no interrumpe al alumno ni a sí mismo

## Tecnologías

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript (sin frameworks)
- **APIs:** OpenAI Realtime, Audio Transcriptions, Chat Completions
- **Comunicación:** WebRTC + REST

## Licencia

MIT
