import Image from "next/image";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import "./globals.css"; // Importa los estilos globales con nuestras clases custom
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Slider, SliderChangeEvent } from 'primereact/slider';
import { Chip } from 'primereact/chip';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'primeicons/primeicons.css';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Montserrat } from 'next/font/google';
import Editor from "react-simple-code-editor";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // Estilo del editor


/* estados posibles de un chip a la hora de seleccionarlos */
type ChipState = 'unselected' | 'selected';

/* Tipos de las estructuras de datos */

/* Estructura de una ubicación: Nombre de la ubicación y numero de archivos para esa ubicación*/
interface LocationSet {
  location: string;
  numFiles: number;
}

/* Estructura de una selección: Tipo de esquema, propiedad elegida, elementos (chips) seleccionados, rango de aparición, el nodo donde se quiere guardar y localizaciones*/
interface Selection {
  scheme: string | null;
  property: string | null;
  chips: string[];           // p.ej. ["!ledOn","lightOn","switch"]
  range: [number, number];   // p.ej. [0,2]
  node: string | null;
  locationSets: LocationSet[];
}

/* Estructura de un documento subido por un usuario para utilizarlo como tipo seleccionable */
interface UserDoc {
  id?: string;
  [key: string]: unknown;
}



/* Estructura de un item del resumen: Guarda todos los valores utilizados para generar un resumen de los archivos generados a partir de la selección realizada */
interface ResumenItem {
  nodo: string;
  tipo: string;
  numero_archivos: number;
  detalles_archivos?: {
    archivo: string;
    atributos: {
      atributo: string;
      propiedades_incluidas: string[]; // OJO: ahora viene 'propiedades_incluidas'
    }[];
  }[];
  // El backend ya no envía combinaciones_atributos ni conteo_atributos,
  // pero si tu backend las genera, puedes seguir mostrándolas.
  combinaciones_atributos?: {
    [atributo: string]: {
      [comboStr: string]: number;
    };
  };
  conteo_atributos?: {
    atributo: string;
    con_prop: number;
    sin_prop: number;
    elementos: string[];
  }[];
}
interface FileItem { // Estructura de un item de la previsualización de archivos
  name: string; // Nombre del archivo
  children?: FileItem[]; // Hijos del archivo
  node?: string; // nombre del nodo dondes se ha guardado
}
interface GroupedSubSelection {
  property: string;
  chips: string[];
  range: string;  // "0 - 2", "0 - 1", ...
}
// Estructura que usaremos al agrupar (unificar) varias Selection en una sola.
interface GroupedSelection {
  node: string;
  scheme: string;
  subSelections: GroupedSubSelection[];
  locationSets: LocationSet[];
}

const montserrat = Montserrat({ // Fuente utilizada en la aplicación (probablemente no necesaria ya que se ha incluido en los estilos globales)
  subsets: ['latin'],
  weight: ['400', '700'],
});

interface FileItem {
  name: string;
  children?: FileItem[];
  node?: string;
}

interface FileExplorerProps {
  estructura: FileItem[];
  onFileSelect: (file: { name: string; node: string }) => void;
}

export function FileExplorer({ estructura, onFileSelect }: FileExplorerProps) {
  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>({});

  // Función para alternar (abrir/cerrar) el estado de un "nodo" concreto
  const toggleNode = React.useCallback((path: string) => {
    setOpenStates((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  // Render recursivo con indentación
  const renderNodes = (nodes: FileItem[], parentPath: string, level: number = 0) => {
    return nodes.map((node) => {
      // Construimos una clave única para cada <details>
      const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

      // La indentación la hacemos con margen a la izquierda según el nivel
      const styleIndent = { marginLeft: `${level * 1.5}rem` };

      // onClick de la <summary>:
      //  - Si tiene hijos (carpeta), togglear openStates
      //  - Si no tiene hijos (archivo), llamar a onFileSelect
      const handleSummaryClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (node.children && node.children.length > 0) {
          toggleNode(currentPath);
        } else {
          onFileSelect({
            name: node.name,
            node: node.node ?? "root",
          });
        }
      };

      return (
        <div key={currentPath} style={styleIndent}>
          <details open={!!openStates[currentPath]}>
            <summary onClick={handleSummaryClick}>{node.name}</summary>
            {node.children && openStates[currentPath] && (
              <div>
                {renderNodes(node.children, currentPath, level + 1)}
              </div>
            )}
          </details>
        </div>
      );
    });
  };

  return <div>{renderNodes(estructura, "", 0)}</div>;
}

export default function Genfiles() { // Componente principal
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null); // Archivos subidos por el usuario
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]); // Documentos subidos por el usuario
  const [globalSchemes, setGlobalSchemes] = useState<string[]>([]); // Esquemas globales
  const [schemes, setSchemes] = useState<string[]>([]); // Esquemas seleccionables (tipos: light, movement, ...)
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null); // Esquema seleccionado
  const [properties, setProperties] = useState<string[]>([]); // lista de properties, actions, etc del esquema seleccionado
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null); // atributo seleccionado del tipo seleccionado
  const [chips, setChips] = useState<string[]>([]); // lista de elementos seleccionables del properties, actions, etc seleccionado
  const [selectedChips, setSelectedChips] = useState<string[]>([]); // elementos seleccionado de la lista de chips
  const [valueRange, setRangeValue] = useState<[number, number]>([0, 1]); // Rango de aparición de los elementos seleccionados
  const [savedSelections, setSavedSelections] = useState<Selection[]>([]); // Selecciones guardadas con guardar selección
  const [selectedNode, setSelectedNode] = useState<string | null>(null); // Nodo destino seleccionado
  const [nodes, setNodesList] = useState<string[]>([]); // Lista de nodos destino
  const [generatedDictionary, setGeneratedDictionary] = useState<Record<string, Record<string, { atributos: Record<string, { elementosSeleccionados: string[]; rango: [number, number]; }[]>; ubicaciones: LocationSet[]; }>> | null>(null);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null); // Resumen de los archivos generados
  const [locationSets, setLocationSets] = useState<LocationSet[]>([]); // Ubicaciones
  const [previewData, setPreviewData] = useState<FileItem[]>([]); // Estructura de previsualización de archivos
  const [isPreviewVisible, setIsPreviewVisible] = useState(false); // Visibilidad de la previsualización
  const [isFileModalOpen, setIsFileModalOpen] = useState(false); // Modal de edición de archivo
  const [openedFileContent, setOpenedFileContent] = useState<Record<string, unknown> | null>(null); // Contenido del archivo abierto
  const [editedFileContent, setEditedFileContent] = useState<string>(""); // Contenido del archivo editado
  const [chipsState, setChipsState] = useState<Record<string, ChipState>>({}); // Estado de los chips (seleccionados, fijados, no seleccionados)

  console.log(generatedDictionary);
  console.log(selectedChips);

  // Devuelve la cantidad de chips en estado "selected"
  const selectedChipsCount = useMemo( // Cantidad de chips seleccionados
    () => Object.values(chipsState).filter((state) => state === "selected").length,
    [chipsState]
  );

  // -------------------------------------------
  //  useEffects y funciones auxiliares
  // -------------------------------------------
  useEffect(() => { // Inicialización de los estados de los chips
    if (chips.length > 0) { // Si hay chips
      const initialState: Record<string, ChipState> = {};
      chips.forEach((chip) => {
        initialState[chip] = 'unselected';
      });
      setChipsState(initialState);
    }
  }, [chips]);

  useEffect(() => { // Cargar los esquemas y nodos disponibles
    axios
      .get("http://127.0.0.1:5000/things_types")
      .then((response) => {
        const types = response.data;  // [{ id: 'light', name: 'Bombilla'}, ...]
        let typesId = types.map((t: { id: string }) => t.id);
        // Ordenamos alfabéticamente
        typesId = typesId.sort((a: string, b: string) => a.localeCompare(b));

        setGlobalSchemes(typesId);
        setSchemes(typesId);
      })
      .catch((error) => {
        console.error("Error al obtener esquemas", error);
      });

    axios
      .get("http://127.0.0.1:5000/nodes_list")
      .then((response) => {
        const sortedNodes = [...response.data].sort((a, b) => a.localeCompare(b));
        setNodesList(sortedNodes);
      })
      .catch((error) => {
        console.log("Error al obtener lista de nodos", error);
      });
  }, []);

  const isGlobalType = useCallback(
    (tipo: string) => globalSchemes.includes(tipo),
    [globalSchemes]
  );

  useEffect(() => { // Cargar las propiedades del esquema seleccionado
    if (selectedScheme) {
      if (isGlobalType(selectedScheme)) {
        axios
          .get(`http://127.0.0.1:5000/things_types/${selectedScheme}`)
          .then((response) => {
            const sortedProperties = [...response.data].sort((a, b) => a.localeCompare(b));
            setProperties(sortedProperties);
          })
          .catch((error) => {
            console.error("Error al obtener propiedades", error);
          });
      } else {
        // Tipo de usuario: extraer las propiedades del doc correspondiente
        const doc = userDocs.find((d) => d.id && d.id.includes(selectedScheme));
        if (doc) {
          const propKeys = Object.keys(doc).filter(
            (k) => typeof doc[k] === "object"
          );
          setProperties(propKeys);
        } else {
          setProperties([]);
        }
      }
      setRangeValue([0, 0]);
      setSelectedProperty(null);
      setSelectedChips([]);
    }
  }, [selectedScheme, isGlobalType, userDocs]);

  useEffect(() => { // Cargar los chips del property seleccionado
    if (selectedScheme && selectedProperty) {
      if (isGlobalType(selectedScheme)) {
        axios
          .get(`http://127.0.0.1:5000/things_types/${selectedScheme}/${selectedProperty}`)
          .then((response) => {
            const sortedChips = [...response.data].sort((a, b) => a.localeCompare(b));
            setChips(sortedChips);
          })
          .catch((error) => {
            console.error("Error al obtener esquemas", error);
          });
      } else {
        // Tipo no global: extraer chips del doc
        const doc = userDocs.find((d) => d.id && d.id.includes(selectedScheme));
        if (doc && doc[selectedProperty] && typeof doc[selectedProperty] === "object") {
          const chipKeys = Object.keys(doc[selectedProperty]);
          setChips(chipKeys);
        } else {
          setChips([]);
        }
      }
      setRangeValue([0, 0]);
    }
  }, [selectedScheme, selectedProperty, isGlobalType, userDocs]);

  useEffect(() => { // Actualizar el rango de aparición de los elementos seleccionados
    if (valueRange[1] > selectedChipsCount) {
      setRangeValue(([min]) => [min, selectedChipsCount]);
    }
    if (valueRange[0] > selectedChipsCount) {
      setRangeValue([0, selectedChipsCount]);
    }
  }, [selectedChipsCount, valueRange]);

  // -------------------------------------------
  //  Handlers
  // -------------------------------------------
  const handleChipClick = (chip: string) => { // Manejar el click en un chip
    setChipsState((prev) => {
      const current = prev[chip];
      let nextState: ChipState;
      if (current === 'unselected') {
        nextState = 'selected';
      } else {
        nextState = 'unselected';
      }
      return {
        ...prev,
        [chip]: nextState,
      };
    });
  };

  const handleLoadFile = () => { // Cargar los archivos subidos por el usuario
    if (!filesToUpload || filesToUpload.length === 0) {
      toast.error("Debe seleccionar al menos un archivo para cargar en el frontend.");
      return;
    }

    const fileArray = Array.from(filesToUpload);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonContent = JSON.parse(event.target?.result as string);
          setUserDocs((prev) => [...prev, jsonContent]);
          toast.success(`Archivo ${file.name} cargado en el frontend exitosamente!`);

          const docType = identifyTypeFromDoc(jsonContent);
          if (docType) {
            if (!schemes.includes(docType)) {
              setSchemes((prev) => [...prev, docType]);
            }
          } else {
            toast.info(`No se pudo identificar el tipo del archivo ${file.name}.`);
          }
        } catch {
          toast.error(`El archivo ${file.name} no es un JSON válido`);
        }
      };
      reader.readAsText(file);
    });
  };

  const identifyTypeFromDoc = (doc: { id?: string }): string | null => { // Identificar el tipo de un documento
    if (!doc || !doc.id) {
      return null;
    }
    const segments = doc.id.split(":");
    const lastSegment = segments[segments.length - 1];
    const match = lastSegment.match(/^([a-zA-Z]+)(\d+)?$/);
    const cleanedType = match ? match[1] : lastSegment;
    if (schemes.includes(cleanedType)) {
      return cleanedType;
    }
    return cleanedType;
  };

  // Ubicaciones
  const handleAddLocationSet = () => { // Añadir una ubicación
    setLocationSets((prev) => [...prev, { location: "", numFiles: 1 }]);
  };

  const handleRemoveLocationSet = (index: number) => { // Eliminar una ubicación
    setLocationSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, value: string) => { // Cambiar el nombre de una ubicación
    setLocationSets((prev) => {
      const newSets = [...prev];
      newSets[index].location = value;
      return newSets;
    });
  };

  const handleLocationNumFilesChange = (index: number, value: number) => { // Cambiar el número de archivos de una ubicación
    setLocationSets((prev) => {
      const newSets = [...prev];
      newSets[index].numFiles = value;
      return newSets;
    });
  };
  const handleDownloadZip = () => { // Descargar los archivos generados
    axios
      .get("http://127.0.0.1:5000/download_files", { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "archivos_generados.zip");
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => {
        console.error("Error downloading zip:", error);
      });
  };
  // Guardar selección
  const handleSaveSelection = () => { // Guardar la selección realizada
    if (!selectedNode) {
      toast.error('El campo "Nodo" debe tener un valor');
      return;
    }
    if (!selectedScheme) {
      toast.error('El campo "Tipo" debe tener un valor');
      return;
    }
    if (!selectedProperty) {
      toast.error('El campo "Atributos seleccionados" debe tener un valor');
      return;
    }
    if (locationSets.length === 0) {
      toast.error("Debe definir al menos una ubicación");
      return;
    }
    for (const ls of locationSets) {
      if (!ls.location.trim()) {
        toast.error("Todas las ubicaciones deben tener un nombre.");
        return;
      }
      if (ls.numFiles <= 0) {
        toast.error("El número de archivos por ubicación debe ser mayor que 0.");
        return;
      }
    }
  
    // Construimos las dos listas (chips fijados y seleccionados)
    const chipsFixed: string[] = [];
    const chipsSelected: string[] = [];
  
    Object.entries(chipsState).forEach(([chip, state]) => { // Separar los chips fijados de los seleccionados
      if (state === 'selected') {
        chipsSelected.push(chip);
      }
    });
  
    const newSelection: Selection = {
      scheme: selectedScheme,
      property: selectedProperty,
      chips: [
        ...chipsFixed.map((chip) => "!" + chip),
        ...chipsSelected
      ],
      range: valueRange,
      node: selectedNode,
      locationSets: locationSets.map((loc) => ({ ...loc })),
    };
  
    // --- [1] Filtramos fuera cualquier selección "igual" (mismo node+scheme+property+chips) ---
    setSavedSelections((prevSelections) => { // Filtrar las selecciones guardadas
      return [
        ...prevSelections.filter((oldSel) => {
          if (
            oldSel.node !== newSelection.node ||
            oldSel.scheme !== newSelection.scheme ||
            oldSel.property !== newSelection.property
          ) {
            return true; // distinto node/scheme/property => se conserva
          }
          // Si es mismo node+scheme+property, comparamos los chips ignorando orden
          return !sameChipSet(oldSel.chips, newSelection.chips);
        }),
        // --- [2] añadimos la nueva selección ---
        newSelection
      ];
    });
  
    toast.success("Selección guardada correctamente.");
  };
  
  function sameChipSet(a: string[], b: string[]): boolean { // Comprobar si dos conjuntos de chips son iguales
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
  
  

  const handleEditSelection = (grouped: GroupedSelection) => { // Editar una selección guardada
    if (!grouped.subSelections.length) return; // Si no hay sub-selecciones, no hacemos nada
    
    const firstSub = grouped.subSelections[0];
    // Ej. firstSub.range = "0 - 2"
    const [minVal, maxVal] = firstSub.range.split(" - ").map(Number);
  
    setSelectedScheme(grouped.scheme);
    setSelectedProperty(firstSub.property);
    setSelectedChips(firstSub.chips);    // Si quieres verlas marcadas en el panel
    setRangeValue([minVal, maxVal]);
    setSelectedNode(grouped.node);
    setLocationSets(grouped.locationSets);
  };
  

  const handleDeleteSelection = (grouped: GroupedSelection) => { // Eliminar una selección guardada
    setSavedSelections((prevSelections) =>
      prevSelections.filter(
        (sel) =>
          sel.node !== grouped.node ||
          sel.scheme !== grouped.scheme
      )
    );
    toast.success("Selección eliminada.");
  };
  

  // Agrupar en una sola fila por (node, scheme)
  const getGroupedSelections = useCallback((): GroupedSelection[] => {
    const groupingMap = new Map<string, GroupedSelection>();
  
    savedSelections.forEach((sel) => {
      const key = `${sel.node}---${sel.scheme}`;
      const rangeStr = `${sel.range[0]} - ${sel.range[1]}`;
  
      if (!groupingMap.has(key)) {
        groupingMap.set(key, {
          node: sel.node || "",
          scheme: sel.scheme || "",
          subSelections: [{
            property: sel.property || "",
            chips: [...sel.chips],
            range: rangeStr
          }],
          locationSets: [...sel.locationSets]
        });
      } else {
        const group = groupingMap.get(key)!;
        // Añadimos un "subSelection" más (aunque sea la misma property, se muestra aparte)
        group.subSelections.push({
          property: sel.property || "",
          chips: [...sel.chips],
          range: rangeStr
        });
        // Fusionamos locationSets
        sel.locationSets.forEach((loc) => {
          if (!group.locationSets.find((l) => l.location === loc.location)) {
            group.locationSets.push({ ...loc });
          }
        });
      }
    });
  
    // Devolvemos un array
    return Array.from(groupingMap.values());
  }, [savedSelections]);
  


  const groupedSelections = getGroupedSelections();

  // Generar / Previsualizar / Descargar

  // 1) Construye la estructura que <FileExplorer> necesita a partir del "resumen" real
  function buildTreeFromResumen(resumen: ResumenItem[]): FileItem[] { // Construir la estructura de previsualización de archivos
    const estructura_nodos: FileItem[] = [];

    for (const item of resumen) {
      const nodo_name = item.nodo;
      const tipo_name = item.tipo;

      const nodoEstructura: FileItem = {
        name: nodo_name,
        children: []
      };
      const tipoCarpeta: FileItem = {
        name: tipo_name,
        children: []
      };

      for (const archivoInfo of item.detalles_archivos || []) {
        tipoCarpeta.children?.push({
          name: archivoInfo.archivo, // El nombre REAL, p.ej. "acg_home_light123.json"
          node: nodo_name,
        });
      }

      nodoEstructura.children?.push(tipoCarpeta);
      estructura_nodos.push(nodoEstructura);
    }

    return estructura_nodos;
  }

  const handleGenerateFiles = async () => { 
    /**
     * Cada "Selection" se convertirá en un "sub-selección" para la property en cuestión.
     * En lugar de:
     *
     * diccionario[node][scheme].atributos[property] = { elementosSeleccionados, rango }
     *
     * Hace:
     *
     * diccionario[node][scheme].atributos[property] = [
     *    { elementosSeleccionados, rango },
     *    { elementosSeleccionados, rango },
     *    ...
     * ]
     */
    const diccionario: Record<string, Record<string, { atributos: Record<string, { elementosSeleccionados: string[]; rango: [number, number]; }[]>; ubicaciones: LocationSet[]; }>> = {};

    // Recorremos las selecciones guardadas
    savedSelections.forEach((sel) => {
      const { node, scheme, property, chips, range, locationSets } = sel;
      if (!node || !scheme || !property) return;

      if (!diccionario[node]) {
        diccionario[node] = {};
      }
      if (!diccionario[node][scheme]) {
        diccionario[node][scheme] = {
          atributos: {},
          ubicaciones: locationSets.map((ls) => ({
            location: ls.location,
            numFiles: ls.numFiles,
          })),
        };
      } else {
        // Si ya existe, nos aseguramos de fusionar las ubicaciones (si hubiera diferencias)
        locationSets.forEach((ls) => {
          const existLoc = diccionario[node][scheme].ubicaciones.find(
            (u) => u.location === ls.location
          );
          if (!existLoc) {
            diccionario[node][scheme].ubicaciones.push({ ...ls });
          }
        });
      }

      // Convertimos la property en array de sub-selecciones
      if (!diccionario[node][scheme].atributos[property]) {
        diccionario[node][scheme].atributos[property] = [];
      }

      diccionario[node][scheme].atributos[property].push({
        elementosSeleccionados: chips,
        rango: range
      });
    });

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/prepare_files/",
        {
          diccionario,
          user_docs: userDocs,
        },
        {
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      setResumen(res.data.resumen);

      // Creamos la previsualización de archivos a partir del resumen
      const preview = buildTreeFromResumen(res.data.resumen);
      setPreviewData(preview);

      toast.success("Archivos generados correctamente. ¡Puedes previsualizarlos!");
      setGeneratedDictionary(diccionario);

    } catch (error) {
      console.error("Error generating files:", error);
      toast.error("Error al generar archivos en el backend.");
    }
  };


  // Con la Opción 2, NO llamamos a /preview_structure. 
  // Solo togglear la visibilidad:
  const handleTogglePreview = () => {
    setIsPreviewVisible(!isPreviewVisible);
  };

  // Modal de edición de archivo
  const highlightCode = (code: string) => {
    try {
      return hljs.highlight(code, { language: "json" }).value;
    } catch {
      return code;
    }
  };

  const handleFileOpen = (file: { name: string; node: string}) => { // Abrir un archivo
    if (!file.name || !file.node) {
      toast.error("No se pudo abrir el archivo. Falta nombre o nodo.");
      return;
    }
    // Suponemos un 'type' arbitrario, a veces no es necesario
    const encodedNode = encodeURIComponent(file.node);
    const encodedName = encodeURIComponent(file.name);
    // Llamada GET
    axios
      .get(`http://127.0.0.1:5000/open_file/${encodedNode}/${encodedName}`)
      .then((response) => {
        setOpenedFileContent({
          node: file.node,
          name: file.name,
          content: response.data,
        });
        setIsFileModalOpen(true);
      })
      .catch((error) => {
        console.error("Error al abrir el archivo:", error);
        toast.error(`Error al abrir el archivo: ${file.name}`);
      });
  };

  const handleCloseModal = () => { // Cerrar el modal de edición de archivo
    setIsFileModalOpen(false);
    setOpenedFileContent(null);
  };
  const handleSliderChange = (e: SliderChangeEvent) => { // Cambiar el rango de aparición de los elementos seleccionados
    let [minVal, maxVal] = e.value as [number, number];
  
    // Si se han invertido por arrastre (min>max), intercambiarlos
    if (minVal > maxVal) {
      [minVal, maxVal] = [maxVal, minVal];
    }
  
    // Ajustar para que no excedan los límites
    if (minVal < 0) minVal = 0;
    if (maxVal > selectedChipsCount) maxVal = selectedChipsCount;
  
    setRangeValue([minVal, maxVal]);
  };
  const handleSaveFile = async () => { // Guardar el archivo editado
    if (!openedFileContent) return;
    const { node, name } = openedFileContent;
    try {
      await axios.post(
        `http://127.0.0.1:5000/save_file/${encodeURIComponent(node as string)}/${encodeURIComponent(name as string)}`,
        {
          content: editedFileContent,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      toast.success("Archivo actualizado correctamente.");
      handleCloseModal();
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el archivo");
    }
  };

  

  // Column con botones de editar/borrar
  const groupedActionBodyTemplate = (rowData: GroupedSelection) => { // Plantilla de la columna de acciones
    return (
      <div>
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm"
          onClick={() => handleEditSelection(rowData)}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-text p-button-sm p-button-danger"
          onClick={() => handleDeleteSelection(rowData)}
        />
      </div>
    );
  };
  

  // -------------------------------------------
  //  Render principal
  // -------------------------------------------
  return (
    <div className={`genfiles-container ${montserrat.className}`}>
      {/* Panel/columna izquierda */}
      <div className="genfiles-leftPanel">
        <div className="genfiles-title">
          <span className="genfiles-titleText">
            Generar varios archivos
            <Image
              className="w-10 h-10"
              src="/archive.svg"
              alt="File icon"
              style={{ filter: "invert(1)" }}
              width={50}
              height={50}
            />
          </span>
        </div>
        <main className="genfiles-main">
          <div className="genfiles-section">
            <div className="genfiles-block">
              <label htmlFor="fileUpload" className="genfiles-label">
                Cargar archivos JSON
              </label>
              <input
                id="fileUpload"
                type="file"
                multiple
                onChange={(e) => setFilesToUpload(e.target.files)}
                style={{ fontFamily: 'Montserrat', fontSize: '1rem' }}
              />
              <Button
                label="Cargar archivo"
                icon="pi pi-upload"
                onClick={handleLoadFile}
                className="p-button-help"
              />

              <p>Seleccionar nodo destino</p>
              <Dropdown
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.value)}
                options={nodes}
                optionLabel="name"
                placeholder=""
                className="genfiles-dropdownNode"
              />

              <p>Elegir el tipo de esquema a generar</p>
              <Dropdown
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.value)}
                options={schemes}
                className="genfiles-dropdownSchemes"
              />

              <p>Elegir las propiedades a modificar</p>
              <Dropdown
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.value)}
                options={properties}
                optionLabel="name"
                className="genfiles-dropdownProps"
              />

              <div>
                <p>Seleccionar elementos (chips):</p>
                <div className="genfiles-chipsContainer">
                  {chips.map((chip, index) => {
                    const state = chipsState[chip] || 'unselected';
                    return (
                      <Chip
                        key={index}
                        label={chip}
                        className={
                          state === 'unselected'
                            ? "chip-unselected"
                            : state === 'selected'
                            ? "chip-selected"
                            : "chip-fixed"
                        }
                        onClick={() => handleChipClick(chip)}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="genfiles-sliderWrapper">
                <Slider
                  value={valueRange}
                  onChange={handleSliderChange}
                  className="w-14rem"
                  range
                  min={0}
                  max={selectedChipsCount}
                />

                <p className="genfiles-rangeText">
                  Rango seleccionado: {valueRange[0]}-{valueRange[1]}
                </p>
              </div>

              <p>Ubicaciones:</p>
              <div className="genfiles-locationsList">
                {locationSets.map((ls, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <InputText
                      value={ls.location}
                      onChange={(e) => handleLocationChange(i, e.target.value)}
                      placeholder="Nombre de la ubicación"
                      className="genfiles-locationName"
                    />
                    <InputNumber
                      value={ls.numFiles}
                      onValueChange={(e) =>
                        handleLocationNumFilesChange(i, e.value as number)
                      }
                      min={1}
                      placeholder="Número de archivos"
                      className="custom-input-number"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-danger"
                      onClick={() => handleRemoveLocationSet(i)}
                    />
                  </div>
                ))}
                <Button
                  label="Agregar ubicación"
                  icon="pi pi-plus"
                  onClick={handleAddLocationSet}
                  className="genfiles-addLocation"
                />
              </div>

              <Button
                label="Guardar Selección"
                icon="pi pi-save"
                onClick={handleSaveSelection}
                className="genfiles-saveSelection"
              />
              <ToastContainer />
            </div>
          </div>
        </main>
      </div>

      {/* Panel/columna derecha */}
      <div className="genfiles-rightPanel">
        <footer className="genfiles-footer">
          <DataTable
            value={groupedSelections}
            className="genfiles-datatable"
            dataKey="node"
          >
            <Column
              field="node"
              header="Nodo"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
            />
            <Column
              field="scheme"
              header="Tipo"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
            />
            <Column
              header="Atributos seleccionados"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
              body={(rowData: GroupedSelection) =>
                rowData.subSelections
                  .map((sub) => sub.property)
                  .join(" | ")
              }
            />
            <Column
              header="Elementos"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
              body={(rowData: GroupedSelection) =>
                rowData.subSelections
                  .map((sub) => sub.chips.join(", "))
                  .join(" | ")
              }
            />
            <Column
              header="Rango"
              headerClassName="genfiles-columnHeader"
              className="genfiles-columnRange"
              body={(rowData: GroupedSelection) =>
                rowData.subSelections
                  .map((sub) => sub.range)
                  .join(" | ")
              }
            />
            <Column
              header="Ubicaciones"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
              body={(rowData: GroupedSelection) =>
                rowData.locationSets
                  .map((ls) => `${ls.location}: ${ls.numFiles}`)
                  .join(" | ")
              }
            />
            <Column
              header="Acciones"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
              body={groupedActionBodyTemplate}
            />
          </DataTable>

          <div className="genfiles-actionsRow">
            <Button
              onClick={handleGenerateFiles}
              label="Generar Archivos"
              className="genfiles-btnGenerate"
            />
            <Button
              onClick={handleDownloadZip}
              label="Descargar ZIP"
              className="genfiles-btnDownload"
            />
            <Button
              label={isPreviewVisible ? "Ocultar Previsualización" : "Mostrar Previsualización"}
              onClick={handleTogglePreview}
              className="genfiles-btnPreview"
            />
            <Link
              className="border-black/[.08] dark:border-white/[.145] items-center justify-center"
              href="/"
              target=""
              rel="noopener noreferrer"
            >
              <Button
                label="Página principal"
                className="genfiles-btnMain"
              />
            </Link>

            <div className="genfiles-summary">
              {isPreviewVisible ? (
                <FileExplorer
                  estructura={previewData}
                  onFileSelect={handleFileOpen}
                />
              ) : (
                // Muestra el resumen textual
                resumen?.map((info, index) => (
                  <div key={index}>
                    <p>
                      Se han generado para el nodo &#39;{info.nodo}&#39;:{" "}
                      {info.numero_archivos} archivos de tipo &#39;{info.tipo}&#39;.
                    </p>
                    
                    {info.combinaciones_atributos &&
                      Object.entries(info.combinaciones_atributos).map(
                        ([atributo, combos]) => (
                          <div key={atributo} className="genfiles-blockMargin">
                            <p>
                              Combinaciones de propiedades para el atributo &#39;
                              {atributo}&#39;:
                            </p>
                            {Object.entries(combos).map(([comboStr, count], j) => (
                              <p key={j}>
                                {count} archivos con{" "}
                                {comboStr || "cero propiedades"}
                              </p>
                            ))}
                          </div>
                        )
                      )}
                    <p>Detalles por archivo:</p>
                    {info.detalles_archivos?.map((archivo, j) => (
                      <div key={j} className="genfiles-blockMargin">
                        <p>Archivo {archivo.archivo}:</p>
                        {archivo.atributos.map((attr, k) =>
                          attr.propiedades_incluidas.length >= 0 ? (
                            <p key={k}>
                              Atributo &#39;{attr.atributo}&#39; con propiedades:{" "}
                              {attr.propiedades_incluidas.join(", ")}
                            </p>
                          ) : (
                            <p key={k}>
                              Atributo &#39;{attr.atributo}&#39; con propiedades:
                            </p>
                          )
                        )}
                      </div>
                    ))}
                    <br />
                  </div>
                ))
              )}
              {isFileModalOpen && (
                <div className="modal-overlay">
                  <div
                    className="modal-content bg-[#1E1E1E] text-[#F1F1F1] p-6 rounded shadow-lg"
                    style={{ maxHeight: "50vh", overflowY: "auto" }}
                  >
                    <button
                      onClick={handleCloseModal}
                      className="p-button-modal-close"
                    >
                      &times;
                    </button>
                    <h2 className="text-xl font-bold mb-4">Editar Archivo</h2>
                    <Editor
                      value={
                        editedFileContent ||
                        JSON.stringify(openedFileContent?.content, null, 2)
                      }
                      onValueChange={(newValue) => setEditedFileContent(newValue)}
                      highlight={(code) => highlightCode(code)}
                      padding={10}
                      style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: 14,
                        backgroundColor: "#2D2D2D",
                        color: "#F1F1F1",
                        border: "1px solid #444",
                        borderRadius: "4px",
                      }}
                    />
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          try {
                            JSON.parse(editedFileContent);
                            handleSaveFile();
                            toast.success("Archivo actualizado correctamente.");
                            handleCloseModal();
                          } catch {
                            toast.error("El contenido no es un JSON válido.");
                          }
                        }}
                        className="p-button-modal-save"
                      >
                        Guardar Cambios
                      </button>
                      <button
                        onClick={handleCloseModal}
                        className="p-button-modal-cancel"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
