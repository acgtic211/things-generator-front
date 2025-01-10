import Image from "next/image";
import React, { useEffect, useState } from "react";
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

interface FileItem {
  name: string;
  children?: FileItem[];
  node?: string;
}

interface UserDoc {
  id?: string;
  [key: string]: unknown;
}

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});

interface LocationSet {
  location: string;
  numFiles: number;
}

interface Selection {
  scheme: string | null;
  property: string | null;
  chips: string[];
  range: [number, number];
  node: string | null;
  locationSets: LocationSet[];
}

interface AtributoModificado {
  atributo: string;
  elementos: string[];
  rango: [number, number];
}

interface ResumenItem {
  nodo: string;
  tipo: string;
  numero_archivos: number;
  atributos_modificados: AtributoModificado[];
  detalles_archivos?: {
    archivo: string;
    atributos: {
      atributo: string;
      propiedades_seleccionadas: string[];
    }[];
  }[];
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

export default function Genfiles() {
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]);
  const [globalSchemes, setGlobalSchemes] = useState<string[]>([]);
  const [schemes, setSchemes] = useState<string[]>([]); // Schemes = global + nuevos del user
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [valueRange, setRangeValue] = useState<[number, number]>([0, 0]);
  const [savedSelections, setSavedSelections] = useState<Selection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodesList] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Selection[]>([]);
  const [generatedDictionary, setGeneratedDictionary] = useState<
    Record<
      string,
      Record<
        string,
        {
          atributos: Record<
            string,
            {
              elementosSeleccionados: string[];
              rango: [number, number];
            }
          >;
          ubicaciones: LocationSet[];
        }
      >
    > | null
  >(null);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);
  const [locationSets, setLocationSets] = useState<LocationSet[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [openedFileContent, setOpenedFileContent] = useState<Record<string, unknown> | null>(null);
  const [editedFileContent, setEditedFileContent] = useState<string>("");

  // Función para resaltar sintaxis JSON
  const highlightCode = (code: string) => {
    try {
      return hljs.highlight(code, { language: "json" }).value;
    } catch {
      return code;
    }
  };

  const FileExplorer = ({
    estructura,
    onFileSelect,
  }: {
    estructura: FileItem[];
    onFileSelect: (file: { name: string; node: string; type: string }) => void;
  }) => {
    const renderNodes = (
      nodes: FileItem[],
      parentNodeName: string | null = null,
      type: string | null = null
    ) => {
      return nodes.map((node, index) => (
        <div key={index}>
          <details>
            <summary
              onClick={() => {
                if (!node.children) {
                  onFileSelect({
                    name: node.name,
                    node: parentNodeName || "root",
                    type: type || "unknown",
                  });
                }
              }}
            >
              {node.name}
            </summary>
            {node.children &&
              renderNodes(node.children, parentNodeName || node.name, node.name)}
          </details>
        </div>
      ));
    };

    return <div>{renderNodes(estructura)}</div>;
  };

  console.log("generatedDictionary:", generatedDictionary);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/things_types")
      .then((response) => {
        const types = response.data;
        const typesId = types.map((t: { id: string }) => t.id);
        setGlobalSchemes(typesId);
        setSchemes(typesId);
      })
      .catch((error) => {
        console.error("Error al obtener esquemas", error);
      });

    axios
      .get("http://127.0.0.1:5000/nodes_list")
      .then((response) => {
        setNodesList(response.data);
      })
      .catch((error) => {
        console.log("Error al obtener lista de nodos", error);
      });
  }, []);

  const isGlobalType = React.useCallback(
    (tipo: string) => globalSchemes.includes(tipo),
    [globalSchemes]
  );

  useEffect(() => {
    if (selectedScheme) {
      if (isGlobalType(selectedScheme)) {
        axios
          .get(`http://127.0.0.1:5000/things_types/${selectedScheme}`)
          .then((response) => {
            setProperties(response.data);
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

  useEffect(() => {
    if (selectedScheme && selectedProperty) {
      if (isGlobalType(selectedScheme)) {
        axios
          .get(`http://127.0.0.1:5000/things_types/${selectedScheme}/${selectedProperty}`)
          .then((response) => {
            setChips(response.data);
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

  useEffect(() => {
    setSelectedChips([]);
    setRangeValue([0, 0]);
  }, [selectedProperty]);

  const handleChipClick = (chip: string) => {
    setSelectedChips((prevSelectedChips) => {
      const newSelectedChips = prevSelectedChips.includes(chip)
        ? prevSelectedChips.filter((c) => c !== chip)
        : [...prevSelectedChips, chip];
      setRangeValue([0, newSelectedChips.length]);
      return newSelectedChips;
    });
  };

  const handleCloseModal = () => {
    setIsFileModalOpen(false);
    setOpenedFileContent(null);
  };

  const handleTogglePreview = () => {
    if (!isPreviewVisible) {
      handlePreviewStructure();
    }
    setIsPreviewVisible(!isPreviewVisible);
  };

  const handleSaveFile = async () => {
    if (!openedFileContent) return;
    const { node, type, name } = openedFileContent;
    try {
      await axios.post(
        `http://127.0.0.1:5000/save_file/${encodeURIComponent(node as string)}/${encodeURIComponent(
          type as string
        )}/${encodeURIComponent(name as string)}`,
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

  const handleFileOpen = (file: { name: string; node: string; type: string }) => {
    if (!file.name || !file.node || !file.type) {
      toast.error("No se pudo abrir el archivo. Nodo, tipo o nombre no especificado.");
      return;
    }

    const encodedNode = encodeURIComponent(file.node);
    const encodedType = encodeURIComponent(file.type);
    const encodedName = encodeURIComponent(file.name);

    axios
      .get(`http://127.0.0.1:5000/open_file/${encodedNode}/${encodedType}/${encodedName}`)
      .then((response) => {
        setOpenedFileContent({
          node: file.node,
          type: file.type,
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

  const handleSaveSelection = () => {
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
    if (selectedChips.length === 0) {
      toast.error("Debe seleccionar al menos un chip");
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

    const newSelection: Selection = {
      scheme: selectedScheme,
      property: selectedProperty,
      chips: selectedChips,
      range: valueRange,
      node: selectedNode,
      locationSets: locationSets,
    };

    setSavedSelections((prevSelections) => {
      const existingIndex = prevSelections.findIndex(
        (selection) =>
          selection.scheme === selectedScheme &&
          selection.property === selectedProperty &&
          selection.node === selectedNode
      );

      if (existingIndex !== -1) {
        const updatedSelections = [...prevSelections];
        updatedSelections[existingIndex] = newSelection;
        return updatedSelections;
      } else {
        return [...prevSelections, newSelection];
      }
    });
  };

  const handleEditSelection = (selection: Selection) => {
    setSelectedScheme(selection.scheme);
    setSelectedProperty(selection.property);
    setSelectedChips(selection.chips);
    setRangeValue(selection.range);
    setSelectedNode(selection.node);
    setLocationSets(selection.locationSets);
  };

  const handleDeleteSelection = (selection: Selection) => {
    setSavedSelections((prevSelections) => prevSelections.filter((s) => s !== selection));
  };

  const handleGenerateFiles = async () => {
    const diccionario: {
      [node: string]: {
        [scheme: string]: {
          atributos: {
            [property: string]: {
              elementosSeleccionados: string[];
              rango: [number, number];
            };
          };
          ubicaciones: LocationSet[];
        };
      };
    } = {};

    const rowsToProcess = savedSelections || [];

    rowsToProcess.forEach((row) => {
      const { node, scheme, property, chips, range, locationSets } = row;

      if (!diccionario[node!]) {
        diccionario[node!] = {};
      }

      if (!diccionario[node!][scheme!]) {
        diccionario[node!][scheme!] = {
          atributos: {},
          ubicaciones: locationSets.map((ls) => ({
            location: `${ls.location}`,
            numFiles: ls.numFiles,
          })),
        };
      }

      diccionario[node!][scheme!].atributos[property!] = {
        elementosSeleccionados: chips,
        rango: range,
      };
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
    } catch (error) {
      console.error("Error generating files:", error);
    }

    setGeneratedDictionary(diccionario);
  };

  const identifyTypeFromDoc = (doc: { id?: string }): string | null => {
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

  const handlePreviewStructure = async () => {
    const diccionario: {
      [node: string]: {
        [scheme: string]: {
          atributos: {
            [property: string]: {
              elementosSeleccionados: string[];
              rango: [number, number];
            };
          };
          ubicaciones: LocationSet[];
        };
      };
    } = {};

    savedSelections.forEach((row) => {
      const { node, scheme, property, chips, range, locationSets } = row;

      if (!diccionario[node!]) {
        diccionario[node!] = {};
      }

      if (!diccionario[node!][scheme!]) {
        diccionario[node!][scheme!] = {
          atributos: {},
          ubicaciones: locationSets,
        };
      }

      diccionario[node!][scheme!].atributos[property!] = {
        elementosSeleccionados: chips,
        rango: range,
      };
    });

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/preview_structure/",
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

      setPreviewData(res.data.estructura);
      toast.success("Previsualización generada correctamente.");
    } catch (error) {
      console.error("Error al generar la previsualización:", error);
      toast.error("Hubo un error al generar la previsualización.");
    }
  };

  const handleLoadFile = () => {
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

  const handleDownloadZip = () => {
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

  const actionBodyTemplate = (rowData: Selection) => {
    return (
      <div className="flex gap-2 justify-center">
        <Image
          src="/edit.svg"
          alt="Edit"
          width={20}
          height={20}
          className="cursor-pointer"
          style={{ filter: "invert(1)", marginRight: "0.5rem", marginLeft: "8px", textAlign: "center" }}
          onClick={() => handleEditSelection(rowData)}
        />
        <Image
          src="/trash.svg"
          alt="Delete"
          width={20}
          height={20}
          className="cursor-pointer"
          style={{ filter: "invert(1)" }}
          onClick={() => handleDeleteSelection(rowData)}
        />
      </div>
    );
  };

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
                className="genfiles-dropdownSchemes "
              />

              <p>Elegir las propiedades a modificar</p>
              <Dropdown
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.value)}
                options={properties}
                optionLabel="name"
                className="genfiles-dropdownProps"
              />

              <p>Seleccionar elementos (chips):</p>
              <div className="genfiles-chipsContainer">
                {chips.map((chip, index) => (
                  <Chip
                    key={index}
                    label={chip}
                    className={
                      selectedChips.includes(chip)
                        ? "chip-selected"
                        : "chip-unselected"
                    }
                    onClick={() => handleChipClick(chip)}
                  />
                ))}
              </div>

              <div className="genfiles-sliderWrapper">
                <Slider
                  value={valueRange}
                  onChange={(e: SliderChangeEvent) =>
                    setRangeValue(e.value as [number, number])
                  }
                  className="w-14rem"
                  range
                  min={0}
                  max={selectedChips.length}
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
                        handleLocationNumFilesChange(i, e.value || 1)
                      }
                      min={1}
                      className="w-full md:w-14rem p-1 border border-solid rounded-full custom-input-number"
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
            value={savedSelections}
            selection={selectedRows}
            onSelectionChange={(e) => setSelectedRows(e.value)}
            className="genfiles-datatable"
            rowGroupMode="subheader"
            sortField="node"
            sortOrder={1}
            selectionMode="multiple"
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
              field="property"
              header="Atributos seleccionados"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
            />
            <Column
              field="chips"
              header="Elementos"
              headerClassName="genfiles-columnHeader"
              body={(rowData: Selection) => rowData.chips.join(", ")}
              className="genfiles-column"
            />
            <Column
              field="range"
              header="Rango"
              headerClassName="genfiles-columnHeader"
              body={(rowData: Selection) =>
                `${rowData.range[0]} - ${rowData.range[1]}`
              }
              className="genfiles-columnRange"
            />
            <Column
              header="Ubicaciones"
              headerClassName="genfiles-columnHeader"
              body={(rowData: Selection) =>
                rowData.locationSets
                  .map((ls) => `${ls.location}: ${ls.numFiles}`)
                  .join(" | ")
              }
              className="genfiles-column"
            />
            <Column
              body={actionBodyTemplate}
              header="Acciones"
              headerClassName="genfiles-columnHeader"
              className="genfiles-column"
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
              icon="pi pi-arrow-circle-down"
              className="genfiles-btnDownload"
            />
            <Button
              label={isPreviewVisible ? "Mostrar Resumen" : "Previsualización"}
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
                  estructura={previewData as unknown as FileItem[]}
                  onFileSelect={handleFileOpen}
                />
              ) : (
                resumen?.map((info, index) => (
                  <div key={index}>
                    <p>
                      Se han generado para el nodo &#39;{info.nodo}&#39;:{" "}
                      {info.numero_archivos} archivos de tipo &#39;{info.tipo}&#39;.
                    </p>
                    {info.atributos_modificados.map((attr, i) => (
                      <p key={i}>
                        Atributo &#39;{attr.atributo}&#39; con elementos{" "}
                        {JSON.stringify(attr.elementos)} y rango{" "}
                        {JSON.stringify(attr.rango)}.
                      </p>
                    ))}
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
                          attr.propiedades_seleccionadas.length >= 0 ? (
                            <p key={k}>
                              Atributo &#39;{attr.atributo}&#39; con propiedades:{" "}
                              {attr.propiedades_seleccionadas.join(", ")}
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
                      className="absolute top-2 right-2 text-[#f1f1f1] text-lg"
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
          </div>
        </footer>
      </div>
    </div>
  );
}
