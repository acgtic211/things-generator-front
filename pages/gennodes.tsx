import "./globals.css";
import { InputNumber } from 'primereact/inputnumber';
import { useState } from 'react';
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

interface LocationSet {
  location: string;
  numFiles: number;
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
  const [numNodes, setNumNodes] = useState<number>(1);
  const [locationSets, setLocationSets] = useState<LocationSet[]>([]);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);

  // ---------- ESTADOS NUEVOS PARA PREVISUALIZACIÓN Y EDICIÓN ----------
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

  // --------- Funciones para manejar ubicaciones (lo tenías igual) ---------
  const handleAddLocationSet = () => {
    setLocationSets((prev) => [...prev, { location: "", numFiles: 1 }]);
  };

  const handleRemoveLocationSet = (index: number) => {
    setLocationSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, value: string) => {
    setLocationSets((prev) => {
      const newSets = [...prev];
      newSets[index].location = value;
      return newSets;
    });
  };

  const handleLocationNumFilesChange = (index: number, value: number) => {
    setLocationSets((prev) => {
      const newSets = [...prev];
      newSets[index].numFiles = value;
      return newSets;
    });
  };

  // ============== Generar archivos aleatorios (igual a tu código actual) ==============
  const handlePrepareRandomFiles = async () => {
    if (locationSets.length === 0) {
      toast.error("Debe agregar al menos una ubicación.");
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

    try {
      const payload = {
        num_nodos: numNodes,
        ubicaciones: locationSets
      };

      const res = await axios.post('http://127.0.0.1:5000/prepare_random_files/', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setResumen(res.data.resumen);
      toast.success('Archivos preparados exitosamente. Ahora puedes descargar el ZIP.');
      // En caso de haber estado en "previsualización", lo ocultamos
      setIsPreviewVisible(false);
      setPreviewData([]);
    } catch (error) {
      console.error('Error preparing random files:', error);
      toast.error('Error al preparar archivos aleatorios');
    }
  };

  // ============== Descargar ZIP ==============
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

  // ---------- Construcción de estructura de previsualización ----------
  /**
   * Convertimos el `resumen` en una jerarquía de nodos/tipos/archivos
   * que podamos mostrar con un componente tipo "FileExplorer".
   */
  const buildPreviewStructure = (resumenData: ResumenItem[]): FileItem[] => {
    /*
      Estructura deseada:
      [
        {
          name: nodo_0,
          type: 'folder',
          children: [
            {
              name: tipoX,
              type: 'folder',
              children: [
                { name: 'ubicacion_0.json', type: 'file', node: 'nodo_0', tipo: 'tipoX' },
                ...
              ]
            }
          ]
        }
      ]
    */
    const structure: FileItem[] = [];

    resumenData.forEach((item) => {
      // 1) Buscamos (o creamos) el nodo en la estructura
      let nodoEntry = structure.find((f) => f.name === item.nodo);
      if (!nodoEntry) {
        nodoEntry = { name: item.nodo, type: 'folder', children: [] };
        structure.push(nodoEntry);
      }

      // 2) En esa carpeta de nodo, buscamos (o creamos) la carpeta del tipo
      if (!nodoEntry.children) nodoEntry.children = [];

      let tipoEntry = nodoEntry.children.find((f) => f.name === item.tipo);
      if (!tipoEntry) {
        tipoEntry = { name: item.tipo, type: 'folder', children: [] };
        nodoEntry.children.push(tipoEntry);
      }

      // 3) Agregar los archivos que se generaron
      if (item.detalles_archivos && tipoEntry.children) {
        item.detalles_archivos.forEach((archivoDet) => {
          // Ejemplo: archivoDet.archivo = "ubicacion_0"
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

  // ============== Previsualización (similar a genfiles) ==============
  const handleTogglePreview = () => {
    // Si no existe el resumen, no podemos construir nada
    if (!resumen || resumen.length === 0) {
      toast.error("No hay datos de resumen para previsualizar.");
      return;
    }

    // Si vamos a mostrar la previsualización, construimos la estructura
    if (!isPreviewVisible) {
      const structure = buildPreviewStructure(resumen);
      setPreviewData(structure);
    }
    setIsPreviewVisible(!isPreviewVisible);
  };

  // ============== Explorador de archivos (igual que en Genfiles) ==============
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

  // ============== Abrir archivo ==============
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
      // Limpia la edición previa
      setEditedFileContent(JSON.stringify(res.data, null, 2));
    } catch (error) {
      console.error("Error al abrir el archivo:", error);
      toast.error(`No se pudo abrir el archivo: ${file.name}`);
    }
  };

  // ============== Guardar archivo editado ==============
  const handleSaveFile = async () => {
    if (!openedFileContent) return;
    const { node, tipo, name } = openedFileContent;
    try {
      // Validar que editedFileContent sea JSON válido
      const parsed = JSON.parse(editedFileContent);

      await axios.post(
        `http://127.0.0.1:5000/save_file/${encodeURIComponent(node)}/${encodeURIComponent(
          tipo
        )}/${encodeURIComponent(name)}`,
        { content: parsed },
        {
          headers: { "Content-Type": "application/json" },
        }
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

  // ============== Render ==============
  const totalFiles = locationSets.reduce((sum, ls) => sum + ls.numFiles, 0);

  return (
    <div className="gennodes-randomContainer">
      {/* Sección izquierda: inputs y botones */}
      <div className="gennodes-randomLeftPanel">
        <p className="text-[#f1f1f1]">Número de nodos</p>
        <InputNumber
          value={numNodes}
          onValueChange={(e) => setNumNodes(e.value || 1)}
          min={1}
          className="custom-input-number"
        />

        <p className="gennodes-textMarginTop">Ubicaciones:</p>
        <div className="gennodes-locationsList">
          {locationSets.map((ls, i) => (
            <div key={i} className="flex items-center gap-2">
              <InputText
                value={ls.location}
                onChange={(e) => handleLocationChange(i, e.target.value)}
                placeholder="Nombre de la ubicación"
                className="custom-input-text"
              />
              <InputNumber
                value={ls.numFiles}
                onValueChange={(e) => handleLocationNumFilesChange(i, e.value || 1)}
                min={1}
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
            className="gennodes-btnAddLocation"
          />
        </div>

        <p className="gennodes-textMarginTop">
          Total de archivos: {totalFiles}
        </p>

        <div className="flex-col mt-4">
          <Button
            label="Generar Archivos"
            onClick={handlePrepareRandomFiles}
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
            className="gennodes-btnDownloadZip"
          />
          <Link href="/" passHref>
            <Button
              label="Página principal"
              icon="pi pi-home"
              className="gennodes-btnHomeRandom"
            />
          </Link>
        </div>
      </div>

      {/* Sección derecha: mostrar Resumen o Previsualización */}
      <div className="gennodes-summaryContainer">
        <h3 className="gennodes-summaryTitle">Resumen de Archivos Generados</h3>

        {!isPreviewVisible ? (
          // =========== VISTA DEL RESUMEN ===========
          resumen ? (
            resumen.map((info, index) => (
              <div key={index} className="gennodes-summaryBlock">
                <p>
                  Se han generado para el nodo &apos;{info.nodo}&apos;:{" "}
                  {info.numero_archivos} archivos de tipo &apos;{info.tipo}&apos;.
                </p>
                {info.atributos_modificados.map((attr, i) => {
                  const elementos = attr.elementos.join(", ");
                  return (
                    <span key={i}>
                      Atributo &apos;{attr.atributo}&apos; con elementos [{elementos}] y rango [{attr.rango[0]}, {attr.rango[1]}]
                      <br />
                    </span>
                  );
                })}

                {info.combinaciones_atributos &&
                  Object.keys(info.combinaciones_atributos).map((atributo, i) => (
                    <div key={i} className="gennodes-summarySpacing">
                      <p>Combinaciones para el atributo &apos;{atributo}&apos;:</p>
                      {info.combinaciones_atributos && Object.entries(info.combinaciones_atributos[atributo]).map(([comboStr, count], j) => (
                        <p key={j}>
                          {count} archivos con {comboStr || "sin propiedades"}
                        </p>
                      ))}
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
                            Atributo &apos;{a.atributo}&apos; con propiedades:{" "}
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
   COMPONENTE PARA GENERAR NODOS (igual al tuyo, se deja intacto)
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
