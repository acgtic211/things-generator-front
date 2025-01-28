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

interface AtributoModificado {
  atributo: string;
  elementos: string[];
  rango: [number, number];
}

interface ArchivoDetalle {
  archivo: string;  // en random files es del estilo "ubicacion_0"
  atributos: {
    atributo: string;
    propiedades_seleccionadas: string[];
  }[];
}

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

interface NodeConfig {
  node: string;
  location: string;  // un solo string para la ubicación
  types: {
    typeName: string;
    numFiles: number;
  }[];
}

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

// ============== Helpers para resaltar JSON en el editor ==============
const highlightCode = (code: string) => {
  try {
    return hljs.highlight(code, { language: "json" }).value;
  } catch {
    return code;
  }
};

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});

/* =============================================================================
   COMPONENTE PARA GENERAR ARCHIVOS ALEATORIOS
   =============================================================================*/
const GenerateRandomFiles = () => {

  // ------------- ESTADOS PARA NODOS, TIPOS, DOCUMENTOS, RESUMEN -------------
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<FileItem[]>([]);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [openedFileContent, setOpenedFileContent] = useState<{
    node: string;
    tipo: string;
    name: string;
    content: unknown;
  } | null>(null);
  const [editedFileContent, setEditedFileContent] = useState<string>("");

  // Cantidad de nodos
  const [numNodos, setNumNodos] = useState<number>(1);
  // Lista de nombres de nodos generados (p.e. ["nodo_0", "nodo_1", ...])
  const [generatedNodes, setGeneratedNodes] = useState<string[]>([]);
  // Configuración de cada nodo
  const [nodeConfigs, setNodeConfigs] = useState<NodeConfig[]>([]);

  // Documentos personalizados que se suben como JSON
  const [customDocs, setCustomDocs] = useState<{ filename: string; content: Record<string, unknown> }[]>([]);

  // Tipos globales retornados por el backend (things_types)
  const [thingsTypes, setThingsTypes] = useState<ThingType[]>([]);

  // Resumen final de archivos generados
  const [resumen, setResumen] = useState<ResumenItem[]>([]);

  // ============== CARGAR LISTA DE TIPOS (THINGS_TYPES) ==============
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/things_types')
      .then((res) => setThingsTypes(res.data))
      .catch((err) => console.error('Error al cargar things_types:', err));
  }, []);

  // ============== ACTUALIZAR nodeConfigs AL CREAR NODOS ==============
  useEffect(() => {
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
     1) GENERAR NODOS (carpetas) en el BACKEND 
     =========================================================================*/
  const handleGenerateNodes = async () => {
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
     2) Manejo de UBICACIÓN en cada nodo
     =========================================================================*/
  const handleNodeLocationChange = (nodeIndex: number, newLocation: string) => {
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].location = newLocation;
      return updated;
    });
  };

  /* =========================================================================
     3) Manejo de TIPOS (varios) en cada nodo
     =========================================================================*/
  const handleAddType = (nodeIndex: number) => {
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types.push({ typeName: "", numFiles: 1 });
      return updated;
    });
  };

  const handleRemoveType = (nodeIndex: number, typeIndex: number) => {
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types.splice(typeIndex, 1);
      return updated;
    });
  };

  const handleTypeNameChange = (nodeIndex: number, typeIndex: number, newType: string) => {
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types[typeIndex].typeName = newType;
      return updated;
    });
  };

  const handleNumFilesChange = (nodeIndex: number, typeIndex: number, newVal: number) => {
    setNodeConfigs((prev) => {
      const updated = [...prev];
      updated[nodeIndex].types[typeIndex].numFiles = newVal;
      return updated;
    });
  };

  /* =========================================================================
     4) Subir archivos JSON (docs custom) -> handleFileUpload
     =========================================================================*/
     const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
    
      const newDocs = [...customDocs];  // customDocs es tu state
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const text = await file.text();
          const jsonData = JSON.parse(text);
    
          // En tu JSON, el "id" podría ser "acg:home:blind13"
          // Extraemos la parte que nos interesa:
          const rawId = jsonData.id || file.name;    // por si no trae "id" en el JSON
          const parsedId = parseDocId(rawId);        // "blind"
          
          // Guardamos en newDocs un "content" con el id original,
          // y además podríamos sobreescribir el ID si prefieres
          // que en el backend también llegue "id": "blind"
          // (Depende de tu lógica).
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
    

    /**
   * Recibe un id estilo "acg:home:blind13"
   * - Toma el último segmento tras los ":" → "blind13"
   * - Quita dígitos finales → "blind"
   * - Devuelve el resultado ("blind")
   */
  function parseDocId(fullId: string): string {
    // 1) Separar por ':'
    const segments = fullId.split(':');
    // 2) Último segmento
    let lastSegment = segments[segments.length - 1];  // "blind13"
    // 3) Eliminar dígitos del final
    lastSegment = lastSegment.replace(/\d+$/, '');    // "blind"
    // Si quedara vacío, usa fallback
    return lastSegment || 'unknown';
  }

  /* =========================================================================
     5) Unir thingsTypes + customDocs en un solo array para el Dropdown
     =========================================================================*/
  const allTypeOptions = [
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
     6) GENERAR ARCHIVOS ALEATORIOS (llamada al backend)
     =========================================================================*/
  const handlePrepareRandomFiles = async () => {
    // Validaciones mínimas
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
        user_docs: customDocs  // Enviamos los JSON subidos
      };
      const res = await axios.post(
        'http://127.0.0.1:5000/prepare_random_files/',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setResumen(res.data.resumen || []);
      toast.success("Archivos generados. Puedes descargar el ZIP.");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar archivos");
    }
  };

  /* =========================================================================
     7) Descargar ZIP
     =========================================================================*/
  const handleDownloadZip = async () => {
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
     PREVISUALIZACIÓN ESTRUCTURA
     =========================================================================*/
  const buildPreviewStructure = (resumenData: ResumenItem[]): FileItem[] => {
    const structure: FileItem[] = [];

    resumenData.forEach((item) => {
      // 1) Buscamos (o creamos) el nodo
      let nodoEntry = structure.find((f) => f.name === item.nodo);
      if (!nodoEntry) {
        nodoEntry = { name: item.nodo, type: 'folder', children: [] };
        structure.push(nodoEntry);
      }

      // 2) Carpera del tipo
      if (!nodoEntry.children) nodoEntry.children = [];

      let tipoEntry = nodoEntry.children.find((f) => f.name === item.tipo);
      if (!tipoEntry) {
        tipoEntry = { name: item.tipo, type: 'folder', children: [] };
        nodoEntry.children.push(tipoEntry);
      }

      // 3) Archivos
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

  const handleTogglePreview = () => {
    if (!resumen || resumen.length === 0) {
      toast.error("No hay datos de resumen para previsualizar.");
      return;
    }
    if (!isPreviewVisible) {
      const structure = buildPreviewStructure(resumen);
      setPreviewData(structure);
    }
    setIsPreviewVisible(!isPreviewVisible);
  };

  // Explorador de archivos
  const FileExplorer = ({
    estructura,
    onFileSelect
  }: {
    estructura: FileItem[];
    onFileSelect: (file: { name: string; node?: string; tipo?: string }) => void;
  }) => {
    const renderNodes = (nodes: FileItem[]) => {
      return nodes.map((node, idx) => {
        if (node.type === 'folder' && node.children) {
          return (
            <details key={idx}>
              <summary>{node.name}</summary>
              <div style={{ marginLeft: '1rem' }}>{renderNodes(node.children)}</div>
            </details>
          );
        } else {
          // Es un 'file'
          return (
            <p
              key={idx}
              style={{ cursor: 'pointer', marginLeft: '1rem' }}
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

  const handleFileOpen = async (file: { name: string; node?: string; tipo?: string }) => {
    if (!file.node || !file.tipo || !file.name) {
      toast.error("Faltan datos para abrir el archivo (nodo, tipo o nombre).");
      return;
    }

    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/open_file/${encodeURIComponent(file.node)}/${encodeURIComponent(
          file.tipo
        )}/${encodeURIComponent(file.name)}` 
      );
      setOpenedFileContent({
        node: file.node,
        tipo: file.tipo,
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

  // Guardar archivo editado
  const handleSaveFile = async () => {
    if (!openedFileContent) return;
    const { node, tipo, name } = openedFileContent;
    try {
      const parsed = JSON.parse(editedFileContent);
      await axios.post(
        `http://127.0.0.1:5000/save_file/${encodeURIComponent(node)}/${encodeURIComponent(
          tipo
        )}/${encodeURIComponent(name)}`,
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

  const handleCloseModal = () => {
    setIsFileModalOpen(false);
    setOpenedFileContent(null);
    setEditedFileContent("");
  };

  return (
    <div className="gennodes-randomContainer">
      {/* Sección izquierda: inputs y botones */}
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

        {/* INPUT para subir archivos JSON */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="fileUpload" className="gennodes-fileUploadLabel">Subir archivos JSON (TDs personalizados):</label>
          <input type="file" accept=".json" multiple onChange={handleFileUpload} title="Upload JSON files" />
        </div>

        {generatedNodes.length > 0 && (
          <div>
            <h3>Configuraciones por Nodo</h3>
            {/* Aquí recorremos cada nodo */}
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

                {/* Campo de ubicación para este nodo */}
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

                {/* Para cada tipo */}
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
                      options={allTypeOptions} // Combinación de tiposs globales + JSON subidos
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
          </div>
        )}

        {/* Botones finales para generar archivos y descargar ZIP */}
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

      {/* Sección derecha: mostrar Resumen o Previsualización */}
      <div className="gennodes-summaryContainer">
        <h3 className="gennodes-summaryTitle">Resumen de Archivos Generados</h3>

        {!isPreviewVisible ? (
          // =========== VISTA DEL RESUMEN ===========
          resumen && resumen.length > 0 ? (
            resumen.map((info: ResumenItem, index: number) => (
              <div key={index} className="gennodes-summaryBlock">
                <p>
                  Se han generado para el nodo {info.nodo}:{" "}
                  {info.numero_archivos} archivos de tipo {info.tipo}.
                </p>
                {info.atributos_modificados.map((attr, i) => {
                  const elementos = attr.elementos.join(", ");
                  return (
                    <span key={i}>
                      Atributo {attr.atributo} con elementos [{elementos}] y rango [
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

                {info.detalles_archivos && (
                  <div className="gennodes-summarySpacing">
                    <p>Detalles por archivo:</p>
                    {info.detalles_archivos.map((archivo, k) => (
                      <div key={k}>
                        <p>Archivo {archivo.archivo}:</p>
                        {archivo.atributos.map((a, m) => (
                          <p key={m}>
                            Atributo {a.atributo} con propiedades:{" "}
                            {a.propiedades_seleccionadas.join(", ")}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No se ha generado ningún resumen aún.</p>
          )
        ) : (
          // =========== VISTA DE PREVISUALIZACIÓN ===========
          <div>
            <FileExplorer estructura={previewData} onFileSelect={handleFileOpen} />
          </div>
        )}
      </div>

      {/* MODAL PARA EDITAR ARCHIVOS */}
      {isFileModalOpen && openedFileContent && (
        <div className="modal-overlay">
          <div
            className="modal-content bg-[#1E1E1E] text-[#F1F1F1] p-6 rounded shadow-lg"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-[#f1f1f1] text-lg"
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
                className="bg-[#43AE6A] text-[#f1f1f1] px-4 py-2 rounded"
              >
                Guardar Cambios
              </button>
              <button
                onClick={handleCloseModal}
                className="bg-[#D7483E] text-white px-4 py-2 rounded"
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

/* =============================================================================
   COMPONENTE PARA GENERAR NODOS 
   =============================================================================*/
const GenerateNodes = () => {
  const [numNodos, setNumNodos] = useState<number>(1);
  const [response, setResponse] = useState(null);
  const router = useRouter();
  console.log(response);

  const handleGenerateNodes = async () => {
    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/generate_nodes/',
        { num_nodos: numNodos },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setResponse(res.data);
      toast.success('Nodos generados exitosamente');
      router.push('/genfiles');  // Ajusta la ruta si quieres o deja /genfiles
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

/* =============================================================================
   COMPONENTE PRINCIPAL
   =============================================================================*/
export default function Gennodes() {
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
