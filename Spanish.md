# Docker quick start
---

```
version: '3.8'
services:
  backend:
    image: acgtic211/things-generator-backend:1.0.0
    container_name: things-generator-backend
    environment:
      - FLASK_RUN_HOST=0.0.0.0
      - FLASK_RUN_PORT=5000
    ports:
      - "5000:5000"


  frontend:
    image: acgtic211/things-generator-frontend:1.0.0
    container_name: things-generator-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://0.0.0.0:5000
```

## Uso de la aplicación
La aplicación tiene 3 páginas divididas por su funcionalidad:
- Generar un archivo
- Generar nodos / Generar archivos aleatorios
- Generar varios archivos

### Página principal
![Pagina principal](imgs/Screenshot%202025-01-31%20111002.png)
En la página principal se muestran las dos opciones principales de la aplicación. Haciendo click en una de ellas, se accede a las funcionalidades de generar un solo archivo o varios por separado.
### Generar un archivo
![[Generar un solo archivo](imgs/Screenshot%202025-01-31%20110447.png)]
En generar un solo archivo, como su nombre indica, se lleva a cabo la creación de un archivo en base al tipo elegido y éste puede ser editado de dos maneras: haciendo uso de las opciones del panel izquierdo o escribiendo directamente en el archivo. Paso a paso:

#### 1. Elegir el tipo de dispositivo (“Esquema”) a generar
1. **Seleccionar el tipo de esquema**: Verás un desplegable (menú) con diferentes tipos de dispositivos (por ejemplo, _Bombilla_, _Sensor de movimiento_, _Puerta_, etc.).
2. **Haz clic** en el menú y elige el dispositivo que más se ajuste a lo que deseas crear o modificar.

---

#### 2. Generar un archivo base
1. Una vez seleccionado el tipo de dispositivo en el menú, haz clic en el botón **“Generar archivo”**.
2. La aplicación creará un archivo de ejemplo con la información principal de ese dispositivo.
3. A la **derecha** de la pantalla, en el **editor de texto**, verás el contenido del archivo recién generado (en código JSON).

---

#### 3. Cargar (subir) un archivo propio (opcional)
Si ya tienes un archivo guardado en tu ordenador con la descripción de un dispositivo y quieres modificarlo o revisarlo:

1. Haz clic en el botón **“Choose file”** (o “Cargar archivo”).
2. Selecciona tu archivo JSON desde tu ordenador.
3. La aplicación lo mostrará en el editor (a la derecha) y, si puede identificar de qué tipo de dispositivo se trata, actualizará el menú de selección con ese tipo.
    - Si no lo reconoce, intentará “adivinar” el tipo y te avisará.

---

#### 4. Elegir las propiedades que deseas modificar
1. Debajo de “Elegir las propiedades a modificar”, verás otro menú desplegable (por ejemplo, _properties_, _actions_, etc.).
2. Elige en ese menú la sección que quieras ajustar. Normalmente, para una bombilla, puedes encontrar **properties** como “lightOn”, “status”, “led”, etc.
3. Inmediatamente, aparecerá un grupo de “chips” (pequeñas etiquetas) que representan las **propiedades** que podrías agregar o quitar en el archivo.
4. **Haz clic** en las chips que quieras **incluir** en tu archivo.
    - Si vuelves a hacer clic en una chip marcada, dejarás de seleccionarla.

---

#### 5. Ajustar el rango con el deslizador
1. Debajo de las chips, encontrarás un **deslizador** (Slider) con un rango que empieza en 0 y termina en la cantidad de chips que elegiste.
2. Este **rango** indica cuántas propiedades de las seleccionadas deseas finalmente incluir.
    - Por ejemplo: si seleccionaste 3 propiedades y mueves el deslizador al rango **“1 - 3”**, significa que la aplicación podría tomar entre 1 y 3 de esas propiedades para el archivo.
    - Si ajustas el rango a **“0 - 2”**, entonces incluirá entre 0 y 2 de las propiedades que elegiste.
3. El número final (por ejemplo, “Rango seleccionado: 0 - 2”) aparece debajo del deslizador para que sepas qué valores seleccionaste.

---

#### 6. Modificar el archivo
1. Cuando ya estés conforme con la selección de propiedades y hayas ajustado el rango en el deslizador, haz clic en el botón **“Modificar”**.
2. La aplicación creará internamente una nueva versión del archivo con los cambios que solicitaste.
3. Podrás ver el resultado inmediatamente a la derecha, en el editor de texto.
    - Allí notarás cómo se han agregado o eliminado las propiedades que escogiste.

---

#### 7. Revisar el archivo en el editor (columna derecha)
En el panel de la derecha, se muestra en tiempo real el contenido final del archivo en formato JSON. En general, en el archivo final se puede ver:

- **“id”** del dispositivo (identificador).
- **“description”** (una pequeña descripción).
- Secciones como **“properties”** o **“actions”**, donde aparecen los detalles que seleccionaste.

Si deseas cambiar algo manualmente, puedes escribirlo directamente en el editor.

---

#### 8. Guardar el archivo
Una vez que estás conforme:

1. Pulsa el botón **“Guardar”**.
2. El sistema descargará en tu ordenador un archivo llamado, por ejemplo, **“archivo_modificado.json”** con todos los cambios realizados.

---

#### 9. Página principal

Si deseas **volver al inicio** de la aplicación o cambiar de sección, haz clic en **“Página principal”** para regresar a la pantalla inicial.

---

#### Resumen de los pasos principales

1. **Seleccionar tipo de dispositivo** en el primer menú.
2. **Generar archivo** para ver un ejemplo de esquema. (Aparecerá en el editor)
3. (Opcional) **Cargar** tu archivo desde tu ordenador.
4. Elegir en el segundo menú las **propiedades** o la sección que deseas modificar (properties, actions, etc.).
5. **Seleccionar las propiedades** (chips) que te interesan.
6. Ajustar el **rango** con el deslizador (cuántas de esas propiedades se incluirán).
7. Hacer clic en **“Modificar”** para aplicar los cambios.
8. Revisar el archivo en el **editor** de la derecha.
9. Presionar **“Guardar”** para descargar el archivo con tus cambios.
10. **“Página principal”** para volver al inicio.
### Generar nodos
#### 1. Pantalla principal: “Generar Archivos”
Al entrar en esta opción, verás un **título** que dice “Generar Archivos”. Debajo de él aparecerán **dos opciones**:

1. **Generar Nodos Personalizados**
2. **Generar Archivos Aleatorios**

Selecciona la que necesites según lo que quieras hacer:

- **Opción 1:** “Generar Nodos Personalizados”  
    Esta sección sirve para crear un número específico de nodos para luego ir a Generar varios archivos (página que veremos más adelante).
    
- **Opción 2:** “Generar Archivos Aleatorios”  
    Aquí podrás configurar, para cada nodo, ciertos “tipos” de dispositivos y cuántos archivos (JSON) se generarán con esos tipos de forma aleatoria.
    

La aplicación se divide, por tanto, en **dos pantallas** principales según la opción elegida. A continuación, se explican por separado.

---

#### 2. Generar Nodos Personalizados
![Generar nodos personalizados](imgs/Screenshot%202025-01-31%20112308.png)

1. **Elegir número de nodos a generar**  
    Verás una casilla donde puedes escribir un número, por ejemplo “1”, “2”, “3”...
    
    - Indica cuántos nodos quieres crear.
    - Por ejemplo, si pones “2”, el sistema creará dos nodos llamados `nodo_0` y `nodo_1`.
2. **Botón “Generar Nodos”**  
    Al darle clic, la aplicación comunicará al servidor cuántos nodos crear. Recibirás un mensaje de confirmación si todo va bien.
    
3. **Página principal**
    
    - Debajo del botón “Generar Nodos” hay otro botón llamado “Página principal”.
    - Te lleva de vuelta a la pantalla inicial de la aplicación en caso de que quieras cambiar de modo o salir.

**¿Qué pasa luego?**
- Una vez generados los nodos, la aplicación te envía a "Generar varios archivos".

---

#### 3. Generar Archivos Aleatorios
![Generar archivos aleatorios](imgs/Screenshot%202025-01-31%20112356.png)

Esta es la parte más extensa y con más opciones. Al seleccionar la opción “Generar Archivos Aleatorios”, verás varios bloques:

##### 3.1. Generar Nodos
- **Cantidad de nodos**: Aquí eliges cuántos nodos quieres crear (por ejemplo, “1”).
- **Botón “Generar Nodos”**: Crea en segundo plano las carpetas y “nodos” necesarios en el servidor.
- **Subir archivos JSON (TDs personalizados)**:
    - Si tienes ficheros JSON en tu ordenador (por ejemplo, descripciones de dispositivos que tú mismo creaste), puedes subirlos aquí para que el sistema los tenga en cuenta al crear los archivos.
    - Tras cargar uno o varios archivos, la aplicación te confirmará si se han subido correctamente.

##### 3.2. Configuraciones por Nodo
Una vez generados los nodos, aparece una sección llamada “Configuraciones por Nodo”. Por ejemplo:

- `nodo_0`
- `nodo_1`
- etc.

Dentro de cada **nodo**:
1. **Ubicación**
    - Puedes escribir una palabra como “universidad”, “casa”, “oficina”, etc.
    - Sirve para especificar dónde se ubicarán virtualmente los dispositivos que genere este nodo.
2. **Botón “Añadir Tipo”**
    - Cada nodo puede tener varios **tipos** de dispositivo. Por ejemplo, “Bombilla”, “Puerta”, “Sensor de temperatura”, etc.
    - Al pulsar “Añadir Tipo”, aparecerá una nueva fila donde configuras:
        - El **tipo** (seleccionado de un menú desplegable que incluye tanto tipos “globales” como los “Custom” que subiste desde tus archivos JSON).
        - **NumFiles**: La cantidad de archivos JSON que quieres generar para ese tipo en particular.
3. **Eliminar un Tipo**
    - Si añades un tipo y te equivocas, tienes un pequeño botón de “basura” (o “x”) para quitarlo.

Repites estos pasos para cada nodo que tengas. Así, por ejemplo, un mismo nodo puede generar 2 archivos de tipo “Bombilla” y 1 de tipo “Sensor de humedad”.

| Nota: Si generas un número de nodos, a la hora de generar archivos tienes que tener todas las opciones de cada nodo completadas, es decir, una ubicación y al menos un tipo con una cantidad de archivos.

---

##### 3.3. Botones para finalizar
Después de configurar la ubicación y tipos para cada nodo, verás varios botones:
1. **Generar Archivos**
    - Crea en el servidor todos los archivos JSON solicitados para cada nodo y tipo.
    - Te mostrará un resumen en la columna derecha, indicando cuántos archivos se han creado, sus nombres, y cuáles propiedades/acciones se incluyeron.
2. **Descargar ZIP**
    - Una vez generados, puedes descargar **todos** esos archivos en un único fichero ZIP.
    - Al hacer clic, el navegador descargará un archivo (normalmente llamado `archivos_generados.zip`).
3. **Previsualizar Estructura**
    - Muestra un **explorador de archivos** en el panel derecho.
    - Verás una especie de árbol:
        - Cada **nodo** (por ejemplo, `nodo_0`) como una carpeta.
        - Dentro de esa carpeta, una subcarpeta por cada **tipo** (por ejemplo, “light”, “door”, etc.).
        - Dentro de la subcarpeta, cada **archivo JSON** que se ha generado.
    - Puedes hacer clic en el nombre de un archivo para “abrirlo” y ver su contenido.
4. **Página principal**
    - Retorna a la pantalla de inicio de la aplicación.

---

##### 3.4. Abrir y editar un archivo (desde la Previsualización)
![Previsualizacion](imgs/Screenshot%202025-01-31%20113949.png)

Cuando hagas clic en un archivo desde el árbol (por ejemplo, `acg_home_light165.json`):
1. **Se abrirá una ventana (modal) de edición**
    - Mostrará el contenido JSON en un editor de texto.
    - Si quieres, puedes modificarlo manualmente (¡ten cuidado de no romper la estructura JSON!).
2. **Guardar Cambios**
    - Al pulsar “Guardar Cambios”, la aplicación envía esas modificaciones al servidor y actualiza el archivo.
    - Te notificará si se guardó con éxito.
3. **Cancelar**
    - Cierra la ventana sin guardar.

---

#### Resumen de usos más habituales
1. **Generar uno o varios “nodos”**.
2. En cada nodo, indicar su **ubicación** y los **tipos** de dispositivo que quieres generar.
3. Para cada tipo, poner cuántos archivos JSON se van a crear automáticamente.
4. (Opcional) **Subir archivos JSON** propios antes, para que el sistema los use como plantillas o referencias (“Custom: ...”).
5. Hacer clic en **“Generar Archivos”** y ver en la parte derecha el **resumen** de lo generado.
6. Descargar el **ZIP** con todos los archivos.
    - O, si lo prefieres, hacer clic en **“Previsualizar Estructura”** para navegar y abrirlos individualmente.
7. Si decides **abrir y editar** un archivo específico, se mostrará una ventana para modificar su contenido y **guardarlo**.
8. Finalmente, puedes volver a la **“Página principal”**.

---

#### 5. Consideraciones finales
- **Si no ves los archivos** en la previsualización o en el ZIP, revisa que hayas pulsado **“Generar Archivos”** y no hayas recibido errores.
- **La ubicación** que escribas en cada nodo (p. ej. “universidad”) se reflejará en los archivos JSON como parte de la descripción (“Device located in universidad”).

### Generar varios archivos
![Generar varios archivos](imgs/Screenshot%202025-01-31%20114255.png)

#### 1. Pantalla principal
Al entrar a esta sección, verás en la **columna izquierda** varios campos y botones que te permitirán:

1. Subir archivos JSON personales.
2. Elegir el nodo (o destino) donde se guardará la información.
3. Escoger el tipo de dispositivo (esquema).
4. Seleccionar las propiedades que quieras añadir o modificar en esos dispositivos.
5. Definir ubicaciones (por ejemplo, “universidad”, “casa”) y cuántos archivos se generarán para cada ubicación.

En la **columna derecha**, verás un cuadro de resumen donde se listarán tus selecciones y, finalmente, tendrás la opción de **generar** y **descargar** dichos archivos, así como **previsualizarlos**.

---
#### 2. Cargar archivos JSON personalizados (opcional)
1. En la parte superior izquierda, encontrarás el botón **“Choose files”** (o “Cargar archivos JSON”).
2. Selecciona uno o varios archivos con extensión `.json` desde tu ordenador.
3. Presiona el botón **“Cargar archivo”**.
    - Verás una notificación de éxito si se han cargado correctamente.
    - Esto sirve para que la aplicación reconozca tipos de dispositivos “personalizados” que no estén incluidos en su catálogo “global”.

---
#### 3. Seleccionar nodo destino
Debajo del botón para cargar archivos, hay un menú desplegable para elegir el **nodo** donde se guardarán los archivos.

- Si la lista está vacía o no aparece tu nodo, quizás necesites ir primero a la sección de la aplicación donde se **generan nodos** (en este caso, “Generar Nodos Personalizados”).
- Selecciona en ese menú el nodo deseado, p. ej. “nodo_0”.

---
#### 4. Elegir el tipo de esquema (dispositivo)
En el siguiente menú desplegable, verás distintos tipos reconocidos por la aplicación, como:

- _light_ (Bombilla)
- _movement_ (Sensor de movimiento)
- … o bien los tipos “Custom” que tú hayas subido.

Selecciona uno, por ejemplo, “light”.

---
#### 5. Elegir las propiedades a modificar
Una vez seleccionado el tipo de esquema, la aplicación cargará automáticamente las **propiedades disponibles** (pueden llamarse “actions”, “properties”, etc.).

- Elige una en el desplegable (por ejemplo, “actions”) que quieras modificar.

---
#### 6. Seleccionar elementos (chips)
Justo debajo, la aplicación mostrará unos “chips” (pequeñas etiquetas con nombres como `ledon`, `lightOn`, `switch`, etc.), que son los **elementos** disponibles dentro de la propiedad elegida.
1. **Haz clic** en los chips que te interesen (se marcarán de otro color para indicar que están seleccionados).
2. **Deslizador (Range)**: ajusta cuántos de esos elementos quieres que aparezcan en el archivo (por ejemplo, “0 a 3”).
    - Esto significa que, cuando se generen los archivos, se incluirá entre 0 y 3 de esos elementos seleccionados de manera aleatoria.

---
#### 7. Ubicaciones y cantidad de archivos
Debajo de los chips, verás una sección para **“Ubicaciones”**. Allí puedes:
1. Escribir un nombre de ubicación (p. ej. “universidad”).
2. Especificar el número de archivos que se generarán para esa ubicación (p. ej. “10”).
3. Pulsar **“Agregar ubicación”** si deseas más de una (cada una con su propio número de archivos).
4. Si te equivocas, puedes borrar una ubicación con el botón de papelera.

---
#### 8. Guardar Selección
Cuando estés conforme con:

- **Nodo** que elegiste.
- **Tipo** de esquema.
- **Propiedad** (actions/properties) y los **chips** marcados.
- **Rango** (0-3, 1-2, etc.).
- **Ubicaciones** y el número de archivos por ubicación…

Presiona el botón **“Guardar Selección”** para que la aplicación la recuerde.

- Tu selección aparecerá a la **derecha**, en una **tabla** bajo las columnas: “Nodo”, “Tipo”, “Atributos seleccionados”, “Elementos”, “Rango”, “Ubicaciones” y “Acciones”.

Si quieres **editar** esa selección (por ejemplo, cambiar algún chip) o **borrarla**, puedes usar los íconos de lápiz o papelera en la columna de “Acciones”.

Puedes repetir estos pasos para crear **distintas selecciones** en el mismo nodo u otros nodos (por ejemplo, un mismo nodo con “light/actions” y también “light/properties”).

---
#### 9. Generar Archivos
Cuando ya tengas todas las selecciones que desees en la tabla, usa los botones finales:
1. **Generar Archivos**
    - Envía la configuración al servidor, el cual creará todos los ficheros JSON correspondientes según tus rangos y ubicaciones.
    - Aparecerá un **Resumen** (a la derecha) indicando cuántos archivos se han creado para cada nodo, qué propiedades se han incluido, etc.
2. **Descargar ZIP**
    - Descarga, en un solo fichero comprimido, todos los archivos generados.
3. **Mostrar Previsualización**
    - Despliega un **explorador** de archivos en la sección derecha.
    - Podrás expandir “nodo_0” → “light” → y ver cada JSON.
    - Al hacer clic en el nombre de un archivo, se te abrirá en un **editor** donde podrás ver y modificar su contenido si así lo deseas.
4. **Página principal**
    - Te lleva de vuelta al inicio de la aplicación.

---
#### 10. Abrir y editar un archivo
Si en la previsualización haces clic en uno de los archivos (por ejemplo: `acg_home_light80`):
1. Se abrirá un **modal** donde se ve el contenido JSON.
2. Puedes **editarlo** manualmente (cambiando valores, añadiendo secciones, etc.).
3. Pulsa **“Guardar Cambios”** para enviar la actualización al servidor (el sistema avisará si se guardó correctamente).
4. O bien pulsa **“Cancelar”** para cerrar sin guardar.

---
#### 11. Recomendaciones finales
- Si algo no aparece en el resumen, asegúrate de haber pulsado **“Guardar Selección”** antes de “Generar Archivos”.
- Verifica que para cada ubicación hayas especificado un número de archivos mayor que **0**.
- El deslizador de rango “0-3” (por ejemplo) indica que el sistema elegirá aleatoriamente entre 0 y 3 de los chips seleccionados para cada archivo.
- Puedes hacer tantas selecciones como quieras para un mismo nodo o para varios nodos, con la misma o distinta ubicación.
- Puedes agrupar varias selecciones de elementos "chips" con sus rangos para una misma propiedad. Si para el tipo "light", la propiedad "actions", tienes "ledon", "ledoff", "switch", "lightOn", puedes definir, por ejemplo, "ledon", "ledoff" con rango 0 - 2 y "switch" con "lightOn" en rango 1-2.
- Finalmente, **descarga el ZIP** con todos los archivos generados para usarlos donde necesites.
