import "./globals.css";
import { InputNumber } from 'primereact/inputnumber';
import { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Montserrat } from 'next/font/google';
import Image from 'next/image';
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from 'react-toastify';
import { RadioButton } from 'primereact/radiobutton';
import Link from 'next/link';
import { InputText } from 'primereact/inputtext';
import 'primeicons/primeicons.css';
import Editor from "react-simple-code-editor";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css"; // Estilo del editor
import { Dropdown } from "primereact/dropdown";

/* -------------------------------------------------------------------------
   INTERFACES
------------------------------------------------------------------------- */

// Para el resumen de archivos generados
interface AtributoModificado {
  atributo: string;
  elementos: string[];
  rango: [number, number];
}

// Para el detalle de archivos generados
interface ArchivoDetalle {
  archivo: string;  // Ej: "ubicacion_0" (luego en el explorador se añade ".json")
  atributos: {
    atributo: string;
    propiedades_seleccionadas: string[];
  }[];
}
// Para el resumen de archivos generados
interface ResumenItem {
  nodo: string;
  tipo: string;
  numero_archivos: number;
  atributos_modificados: AtributoModificado[];
  combinaciones_atributos?: {
    [atributo: string]: {
      [comboStr: string]: number;
    };
  };
  detalles_archivos?: ArchivoDetalle[];
}
// Para la configuración de nodos
interface NodeConfig {
  node: string;
  location: string;  // un solo string para la ubicación
  types: {
    typeName: string;
    numFiles: number;
  }[];
}
// Para los tipos globales del backend
interface ThingType {
  id: string;
  name: string;
}

// Para el explorador de archivos en la previsualización
interface FileItem {
  name: string;
  type?: string; 
  children?: FileItem[];
  node?: string;
  tipo?: string;
}

/* -------------------------------------------------------------------------
   HIGHLIGHT HELPERS
------------------------------------------------------------------------- */
const highlightCode = (code: string) => { // Función para resaltar el código JSON
  try {
    return hljs.highlight(code, { language: "json" }).value;
  } catch {
    return code;
  }
};

const montserrat = Montserrat({ // Fuente de la aplicacion
  subsets: ['latin'],
  weight: ['400', '700'],
});

/* =========================================================================
   COMPONENTE PARA GENERAR ARCHIVOS ALEATORIOS
   =========================================================================*/
const GenerateRandomFiles = () => { // Componente principal

  /* ---------------------------- ESTADOS ---------------------------- */
  // -- Para la previsualización de carpetas/archivos:
  const [isPreviewVisible, setIsPreviewVisible] = useState(false); // Estado para mostrar la previsualización
  const [previewData, setPreviewData] = useState<FileItem[]>([]); // Estado para los datos de previsualización
  const [isFileModalOpen, setIsFileModalOpen] = useState(false); // Estado para abrir/cerrar el modal de archivo
  const [openedFileContent, setOpenedFileContent] = useState<{ // Estado para el contenido del archivo abierto
    node: string;
    name: string;
    content: unknown;
  } | null>(null);
  const [editedFileContent, setEditedFileContent] = useState<string>(""); // Estado para el contenido editado del archivo

  // -- Nodos a generar
  const [numNodos, setNumNodos] = useState<number>(1); // Estado para la cantidad de nodos a generar
  const [generatedNodes, setGeneratedNodes] = useState<string[]>([]); // Estado para los nodos generados
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig[]>([]); // Estado para la configuración de nodos

  // -- Docs personalizados subidos
  const [customDocs, setCustomDocs] = useState<{ filename: string; content: Record<string, unknown> }[]>([]); // Estado para los documentos personalizados

  // -- Tipos globales del backend
  const [thingsTypes, setThingsTypes] = useState<ThingType[]>([]); // Estado para los tipos globales

  // -- Resumen final que se muestra y del que se hace previsualización
  const [resumen, setResumen] = useState<ResumenItem[]>([]); // Estado para el resumen de archivos

  /* =========================================================================
     1) CARGAR LISTA DE TIPOS (THINGS_TYPES)
  =========================================================================*/
  useEffect(() => { // Cargar los tipos globales del backend
    axios.get('http://127.0.0.1:5000/things_types')
      .then((res) => setThingsTypes(res.data))
      .catch((err) => console.error('Error al cargar things_types:', err));
  }, []);

  /* =========================================================================
     2) Cuando cambian "generatedNodes", actualizar nodeConfigs
  =========================================================================*/
  useEffect(() => { // Actualizar la configuración de nodos
    setNodeConfigs((prev) => {
      const newConfigs = generatedNodes.map((nodo) => {
        const existing = prev.find((nc) => nc.node === nodo);
        if (existing) return existing;
        return {
          node: nodo,
          location: "",
          types: []
        };
      });
      return newConfigs;
    });
  }, [generatedNodes]);

  /* =========================================================================
     3) GENERAR NODOS en el backend
  =========================================================================*/
  const handleGenerateNodes = async () => { // Función para generar nodos
    try {
      const res = await axios.post('http://127.0.0.1:5000/generate_nodes/', {
        num_nodos: numNodos
      });
      const nodos = res.data.nodos || [];
      setGeneratedNodes(nodos);
      toast.success(`Se han generado ${nodos.length} nodos en el backend`);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar nodos");
    }
  };

  /* =========================================================================
     4) Manejo de UBICACIÓN en cada nodo
  =========================================================================*/
  const handleNodeLocationChange = (nodeIndex: number, newLocation: string) => { // Función para cambiar la ubicación de un nodo
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].location = newLocation;
      return updated;
    });
  };

  /* =========================================================================
     5) Manejo de TIPOS en cada nodo
  =========================================================================*/
  const handleAddType = (nodeIndex: number) => { // Función para añadir un tipo a un nodo
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types.push({ typeName: "", numFiles: 1 });
      return updated;
    });
  };

  const handleRemoveType = (nodeIndex: number, typeIndex: number) => { // Función para eliminar un tipo de un nodo
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types.splice(typeIndex, 1);
      return updated;
    });
  };

  const handleTypeNameChange = (nodeIndex: number, typeIndex: number, newType: string) => { // Función para cambiar el nombre de un tipo
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types[typeIndex].typeName = newType;
      return updated;
    });
  };

  const handleNumFilesChange = (nodeIndex: number, typeIndex: number, newVal: number) => { // Función para cambiar la cantidad de archivos de un tipo
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types[typeIndex].numFiles = newVal;
      return updated;
    });
  };

  /* =========================================================================
     6) Subir archivos JSON personalizados
  =========================================================================*/
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { // Función para subir archivos JSON personalizados
    const files = e.target.files;
    if (!files) return;
  
    const newDocs = [...customDocs];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
  
        // Ejemplo: si "id" es "acg:home:blind13", se parsea a "blind"
        const rawId = jsonData.id || file.name;
        const parsedId = parseDocId(rawId);
        jsonData.id = parsedId;
        
        newDocs.push({
          filename: file.name,
          content: jsonData
        });
  
        toast.success(`Archivo ${file.name} cargado correctamente`);
      } catch (error) {
        console.error("Error parseando JSON:", error);
        toast.error(`Error parseando el archivo ${file.name}`);
      }
    }
    setCustomDocs(newDocs);
  };

  function parseDocId(fullId: string): string { // Función para parsear el ID de un documento
    // 1) Separar por ':'
    const segments = fullId.split(':');
    // 2) Último segmento
    let lastSegment = segments[segments.length - 1]; // "blind13"
    // 3) Eliminar dígitos del final
    lastSegment = lastSegment.replace(/\d+$/, '');   // "blind"
    return lastSegment || 'unknown';
  }

  /* =========================================================================
     7) Combinar cosas en el Dropdown (tipos globales + custom docs)
  =========================================================================*/
  const allTypeOptions = [ // Función para combinar los tipos globales con los documentos personalizados
    ...thingsTypes.map((t) => ({ label: t.name, value: t.id })),
    ...customDocs.map((doc) => {
      const docId = doc.content?.id || doc.filename;
      return {
        label: `Custom: ${docId}`,
        value: docId
      };
    })
  ];

  /* =========================================================================
     8) GENERAR ARCHIVOS ALEATORIOS (POST a /prepare_random_files)
  =========================================================================*/
  const handlePrepareRandomFiles = async () => { // Función para generar archivos aleatorios
    // Validaciones
    for (const nc of nodeConfigs) {
      if (!nc.location.trim()) {
        toast.error(`El nodo ${nc.node} no tiene ubicación definida`);
        return;
      }
      if (nc.types.length === 0) {
        toast.error(`El nodo ${nc.node} no tiene tipos definidos`);
        return;
      }
      for (const t of nc.types) {
        if (!t.typeName) {
          toast.error(`Uno de los tipos en ${nc.node} está vacío`);
          return;
        }
        if (t.numFiles < 1) {
          toast.error(`El tipo ${t.typeName} en ${nc.node} tiene numFiles < 1`);
          return;
        }
      }
    }

    try {
      const payload = {
        nodeConfigs,
        user_docs: customDocs.map((doc) => doc.content)  // solo mandamos el contenido
      };
      const res = await axios.post(
        'http://127.0.0.1:5000/prepare_random_files/',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      setResumen(res.data.resumen || []);
      toast.success("Archivos generados. Puedes descargar el ZIP o ver el resumen.");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar archivos");
    }
  };

  /* =========================================================================
     9) DESCARGAR ZIP
  =========================================================================*/
  const handleDownloadZip = async () => { // Función para descargar el ZIP
    try { 
      const res = await axios.get('http://127.0.0.1:5000/download_random_files', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'archivos_generados.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading zip:', error);
      toast.error('Error al descargar el ZIP');
    }
  };

  /* =========================================================================
     10) PREVISUALIZACIÓN (construir árbol de nodos -> tipos -> archivos)
  =========================================================================*/
  const buildPreviewStructure = (resumenData: ResumenItem[]): FileItem[] => { // Función para construir la previsualización
    const structure: FileItem[] = [];

    resumenData.forEach((item) => {
      // 1) Buscamos (o creamos) el nodo
      let nodoEntry = structure.find((f) => f.name === item.nodo);
      if (!nodoEntry) {
        nodoEntry = { name: item.nodo, type: 'folder', children: [] };
        structure.push(nodoEntry);
      }

      // 2) Buscamos (o creamos) la carpeta de tipo
      if (!nodoEntry.children) nodoEntry.children = [];

      let tipoEntry = nodoEntry.children.find((f) => f.name === item.tipo);
      if (!tipoEntry) {
        tipoEntry = { name: item.tipo, type: 'folder', children: [] };
        nodoEntry.children.push(tipoEntry);
      }

      // 3) Crear cada "archivo"
      if (item.detalles_archivos && tipoEntry.children) {
        item.detalles_archivos.forEach((archivoDet) => {
          const fileName = archivoDet.archivo + ".json";
          tipoEntry!.children!.push({
            name: fileName,
            type: 'file',
            node: item.nodo,
            tipo: item.tipo
          });
        });
      }
    });

    return structure;
  };

  const handleTogglePreview = () => { // Función para mostrar/ocultar la previsualización
    if (!resumen || resumen.length === 0) {
      toast.error("No hay datos de resumen para previsualizar.");
      return;
    }
    // Al abrir la previsualización, construimos el árbol
    if (!isPreviewVisible) {
      const structure = buildPreviewStructure(resumen);
      setPreviewData(structure);
    }
    setIsPreviewVisible(!isPreviewVisible);
  };

  /* -------------------------------------------------------------------------
     COMPONENTE EXPLORADOR DE ARCHIVOS (recursivo simple)
  ------------------------------------------------------------------------- */
  const FileExplorer = ({
    estructura,
    onFileSelect
  }: {
    estructura: FileItem[];
    onFileSelect: (file: FileItem) => void;
  }) => {
    // Estado que guarda si un nodo (carpeta) está abierto: { "nodo/tipo": true/false, ... }
    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  
    // Función para alternar (abrir/cerrar) un nodo
    const toggleNode = (path: string) => {
      setOpenStates((prev) => ({
        ...prev,
        [path]: !prev[path]
      }));
    };
  
    // Render recursivo, recibiendo la "ruta padre" para construir una key única
    const renderNodes = (nodes: FileItem[], parentPath = "") => {
      return nodes.map((node) => {
        // Construimos un path único concatenando parentPath + nombre
        const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  
        if (node.type === "folder" && node.children) {
          const isOpen = !!openStates[currentPath];
  
          const handleSummaryClick = (e: React.MouseEvent) => {
            e.preventDefault(); // Evita que <details> abra/cierre por defecto
            toggleNode(currentPath); // Lo hacemos nosotros a mano
          };
  
          return (
            <div key={currentPath} style={{ marginLeft: "1rem" }}>
              <details open={isOpen}>
                <summary onClick={handleSummaryClick}>{node.name}</summary>
                {isOpen && (
                  <div>
                    {renderNodes(node.children, currentPath)}
                  </div>
                )}
              </details>
            </div>
          );
        } else {
          // Es un archivo
          return (
            <p
              key={currentPath}
              style={{ cursor: 'pointer', marginLeft: '2rem', color: '#8ff' }}
              onClick={() => onFileSelect(node)}
            >
              {node.name}
            </p>
          );
        }
      });
    };
  
    return <div>{renderNodes(estructura)}</div>;
  };
  

  /* -------------------------------------------------------------------------
     ABRIR ARCHIVO
  ------------------------------------------------------------------------- */
  const handleFileOpen = async (file: FileItem) => { // Función para abrir un archivo
    if (!file.node || !file.tipo || !file.name) {
      toast.error("Faltan datos para abrir el archivo (nodo, tipo o nombre).");
      return;
    }
    try {
      const encodedNode = encodeURIComponent(file.node);
      const encodedName = encodeURIComponent(file.name);
      const res = await axios.get(
        `http://127.0.0.1:5000/open_file/${encodedNode}/${encodedName}`
      );
      
      setOpenedFileContent({
        node: file.node,
        name: file.name,
        content: res.data,
      });
      setIsFileModalOpen(true);
      setEditedFileContent(JSON.stringify(res.data, null, 2));
    } catch (error) {
      console.error("Error al abrir el archivo:", error);
      toast.error(`No se pudo abrir el archivo: ${file.name}`);
    }
  };

  /* -------------------------------------------------------------------------
     GUARDAR ARCHIVO (tras edición)
  ------------------------------------------------------------------------- */
  const handleSaveFile = async () => { // Función para guardar un archivo
    if (!openedFileContent) return;
    const { node, name } = openedFileContent;
    try {
      const parsed = JSON.parse(editedFileContent);
      await axios.post(
        `http://127.0.0.1:5000/save_file/${encodeURIComponent(node)}/${encodeURIComponent(name)}`,
        { content: parsed },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success("Archivo guardado correctamente.");
      handleCloseModal();
    } catch (err) {
      console.error("Error al guardar:", err);
      toast.error("Error al guardar el archivo (¿JSON válido?).");
    }
  };

  const handleCloseModal = () => { // Función para cerrar el editor de archivo
    setIsFileModalOpen(false);
    setOpenedFileContent(null);
    setEditedFileContent("");
  };

  return (
    <div className="gennodes-randomContainer">
      {/* Panel Izquierdo */}
      <div style={{ color: '#FFF' }}>
        <h2>Generar Nodos</h2>
        <div style={{ marginBottom: '1rem' }}>
          <span>Cantidad de nodos:</span>
          <InputNumber
            value={numNodos}
            onValueChange={(e) => setNumNodos(e.value || 1)}
            min={1}
            style={{ marginLeft: '1rem' }}
            className="custom-input-number"
          />
          <Button
            label="Generar Nodos"
            onClick={handleGenerateNodes}
            style={{ marginLeft: '1rem' }}
            className="gennodes-btnGenerateNodes"
          />
        </div>

        {/* Subir JSON personalizados */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="fileUpload" className="gennodes-fileUploadLabel">
            Subir archivos JSON (TDs personalizados):
          </label>
          <input type="file" accept=".json" multiple onChange={handleFileUpload} title="Upload JSON files" />
        </div>

        {/* Config de cada nodo */}
        {generatedNodes.length > 0 && (
          <>
            <h3>Configuraciones por Nodo</h3>
            {nodeConfigs.map((nc, nodeIndex) => (
              <div
                key={nc.node}
                style={{
                  border: '1px solid #aaa',
                  margin: '1rem 0',
                  padding: '1rem'
                }}
              >
                <p>
                  <b>{nc.node}</b>
                </p>
                <label>Ubicación: </label>
                <InputText
                  value={nc.location}
                  onChange={(e) => handleNodeLocationChange(nodeIndex, e.target.value)}
                  style={{ marginLeft: '0.5rem' }}
                  className="custom-input-text"
                />
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    label="Añadir Tipo"
                    onClick={() => handleAddType(nodeIndex)}
                    className="gennodes-btnAddType"
                  />
                </div>
                {nc.types.map((t, tIndex) => (
                  <div
                    key={tIndex}
                    style={{
                      border: '1px solid #555',
                      margin: '0.5rem 0',
                      padding: '0.5rem'
                    }}
                  >
                    <Dropdown
                      value={t.typeName}
                      options={allTypeOptions}
                      onChange={(e) => handleTypeNameChange(nodeIndex, tIndex, e.value)}
                      placeholder="Selecciona tipo"
                      style={{ marginRight: '1rem' }}
                      className="custom-dropdown"
                    />
                    <InputNumber
                      value={t.numFiles}
                      onValueChange={(e) => handleNumFilesChange(nodeIndex, tIndex, e.value || 1)}
                      min={1}
                      style={{ width: '5rem', marginRight: '1rem' }}
                      className="custom-input-number"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-danger p-button-sm"
                      onClick={() => handleRemoveType(nodeIndex, tIndex)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Botones finales */}
        {generatedNodes.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <Button
              label="Generar Archivos"
              onClick={handlePrepareRandomFiles}
              style={{ marginRight: '1rem' }}
              className="gennodes-btnGenerateRandom"
            />
            <Button
              label="Descargar ZIP"
              onClick={handleDownloadZip}
              className="gennodes-btnDownloadZip"
            />
            <Button
              label={isPreviewVisible ? "Mostrar Resumen" : "Previsualizar Estructura"}
              onClick={handleTogglePreview}
              className="gennodes-btnPreview"
            />
            <Link href="/" passHref>
              <Button
                label="Página principal"
                className="gennodes-btnHomeRandom"
              />
            </Link>
          </div>
        )}
      </div>

      {/* Panel Derecho: Resumen o Previsualización */}
      <div className="gennodes-summaryContainer">
        <h3 className="gennodes-summaryTitle">Resumen de Archivos Generados</h3>
        {!isPreviewVisible ? (
          // ===================== MODO: VER RESUMEN =====================
          resumen && resumen.length > 0 ? (
            resumen.map((info: ResumenItem, index: number) => (
              <div key={index} className="gennodes-summaryBlock">
                <p>
                  Nodo <b>{info.nodo}</b>: {info.numero_archivos} archivos de tipo <b>{info.tipo}</b>.
                </p>
                {/* Si hubiera atributos modificados o combinaciones, se muestran */}
                {info.atributos_modificados?.map((attr, i) => {
                  // attr.elementos puede ser undefined, así que lo chequeas.
                  const elementosArray = attr.elementos || []; 
                  return (
                    <span key={i}>
                      Atributo {attr.atributo} con elementos [{elementosArray.join(", ")}] y rango [
                      {attr.rango[0]}, {attr.rango[1]}]
                      <br />
                    </span>
                  );
                })}

                {info.combinaciones_atributos &&
                  Object.keys(info.combinaciones_atributos).map((atributo, i) => (
                    <div key={i} className="gennodes-summarySpacing">
                      <p>Combinaciones para el atributo {atributo}:</p>
                      {Object.entries(info.combinaciones_atributos?.[atributo] ?? {}).map(
                        ([comboStr, count], j) => (
                          <p key={j}>
                            {count} archivos con {comboStr || "sin propiedades"}
                          </p>
                        )
                      )}
                    </div>
                  ))}
                {info.detalles_archivos && info.detalles_archivos.map((archivo, k) => (
                  <div key={k}>
                    <p>– Archivo <b>{archivo.archivo}.json</b>:</p>
                    {archivo.atributos.map((a, m) => {
                      // Si propiedades_seleccionadas no existe, usar un array vacío.
                      const propsArray = a.propiedades_seleccionadas || [];
                      return (
                        <p key={m}>
                          Atributo {a.atributo} con propiedades: {propsArray.join(", ")}
                        </p>
                      );
                    })}
                  </div>
                ))}

              </div>
            ))
          ) : (
            <p>No se ha generado ningún resumen aún.</p>
          )
        ) : (
          // ===================== MODO: PREVISUALIZAR ESTRUCTURA =====================
          <FileExplorer estructura={previewData} onFileSelect={handleFileOpen} />
        )}
      </div>

      {/* Modal para editar un archivo */}
      {isFileModalOpen && openedFileContent && (
        <div className="modal-overlay">
          <div
            className="modal-content bg-[#1E1E1E] text-[#F1F1F1] p-6 rounded shadow-lg"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <button
              onClick={handleCloseModal}
              className="p-button-modal-close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Editar Archivo</h2>
            <Editor
              value={editedFileContent}
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
                onClick={handleSaveFile}
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
  );
};

/* =========================================================================
   COMPONENTE PARA (OPCIONAL) GENERAR NODOS DE FORMA SENCILLA
   =========================================================================*/
const GenerateNodes = () => {
  const [numNodos, setNumNodos] = useState<number>(1);
  const [response, setResponse] = useState(null);
  const router = useRouter();
  console.log('response:', response);
  const handleGenerateNodes = async () => {
    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/generate_nodes/',
        { num_nodos: numNodos },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setResponse(res.data);
      toast.success('Nodos generados exitosamente');
      // Redirige a otra página si lo deseas
      router.push('/genfiles');
    } catch (error) {
      console.error('Error generating nodes:', error);
      toast.error('Error al generar nodos');
    }
  };

  return (
    <div className="gennodes-generateNodesContainer">
      <p className="gennodes-textWhite">
        Elegir número de nodos a generar
      </p>
      <InputNumber
        value={numNodos}
        onValueChange={(e) => setNumNodos(e.value || 1)}
        min={1}
        className="custom-input-number"
      />
      <div className="flex-col mt-4">
        <Button
          label="Generar Nodos"
          onClick={handleGenerateNodes}
          className="gennodes-btnGenerateNodes"
        />
        <Link href="/" passHref>
          <Button
            label="Página principal"
            icon="pi pi-home"
            className="gennodes-btnHome"
          />
        </Link>
      </div>
    </div>
  );
};

/* =========================================================================
   COMPONENTE PRINCIPAL
   =========================================================================*/
export default function Gennodes() { // Componente principal
  const [selectedOption, setSelectedOption] = useState('');

  return (
    <div className={`gennodes-mainContainer ${montserrat.className}`}>
      <div className="gennodes-titleWrapper">
        <span className="gennodes-title">
          Generar Archivos
          <Image
            className="gennodes-titleIcon"
            src="/archive.svg"
            alt="File icon"
            style={{ filter: "invert(1)" }}
            width={300}
            height={300}
          />
        </span>
      </div>

      {/* Selector de opciones */}
      <div className="gennodes-optionSelector">
        <div className="flex">
          <RadioButton
            inputId="option1"
            name="option"
            value="generateNodes"
            onChange={(e) => setSelectedOption(e.value)}
            checked={selectedOption === 'generateNodes'}
          />
          <label htmlFor="option1" className="gennodes-optionLabel">
            Generar Nodos Personalizados
          </label>
        </div>
        <div className="flex items-center">
          <RadioButton
            inputId="option2"
            name="option"
            value="generateRandomFiles"
            onChange={(e) => setSelectedOption(e.value)}
            checked={selectedOption === 'generateRandomFiles'}
          />
          <label htmlFor="option2" className="gennodes-optionLabel">
            Generar Archivos Aleatorios
          </label>
        </div>
      </div>

      {selectedOption === 'generateNodes' && <GenerateNodes />}
      {selectedOption === 'generateRandomFiles' && <GenerateRandomFiles />}

      {selectedOption === '' && (
        <p className="gennodes-fallbackText">
          Por favor, selecciona una opción para continuar.
        </p>
      )}
    </div>
  );
}
