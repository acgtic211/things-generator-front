import Image from "next/image";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./globals.css";
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

import { Montserrat } from 'next/font/google'

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
  const [fileToUpload, setFileToUpload] = useState<File | null>(null); 
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
  const [generatedDictionary, setGeneratedDictionary] = useState<Record<string, Record<string, { atributos: Record<string, { elementosSeleccionados: string[]; rango: [number, number] }>, ubicaciones: LocationSet[] }>> | null>(null);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);
  const [locationSets, setLocationSets] = useState<LocationSet[]>([]);

  console.log('generatedDictionary:', generatedDictionary);

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/things_types')
      .then((response) => {
        const types = response.data;
        const typesId = types.map((t: { id: string }) => t.id);
        setGlobalSchemes(typesId);
        setSchemes(typesId); // Inicialmente schemes = globalSchemes
      })
      .catch((error) => {
        console.error('Error al obtener esquemas', error);
      });

    axios
      .get("http://127.0.0.1:5000/nodes_list")
      .then((response) => {
        setNodesList(response.data);
      })
      .catch((error) => {
        console.log('Error al obtener lista de nodos', error);
      });
  }, []);

  // Chequea si el tipo es global
  const isGlobalType = React.useCallback((tipo: string) => globalSchemes.includes(tipo), [globalSchemes]);

  useEffect(() => {
    if (selectedScheme) {
      if (isGlobalType(selectedScheme)) {
        axios.get(`http://127.0.0.1:5000/things_types/${selectedScheme}`)
          .then((response) => {
            setProperties(response.data);
          })
          .catch((error) => {
            console.error('Error al obtener propiedades', error);
          });
      } else {
        // Tipo de usuario: extraer las propiedades del doc correspondiente
        const doc = userDocs.find(d => d.id && d.id.includes(selectedScheme));
        if (doc) {
          // Podemos considerar propiedades las keys que sean objetos: properties, actions, events, etc.
          const propKeys = Object.keys(doc).filter(k => typeof doc[k] === 'object');
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
        axios.get(`http://127.0.0.1:5000/things_types/${selectedScheme}/${selectedProperty}`)
          .then((response) => {
            setChips(response.data);
          })
          .catch((error) => {
            console.error('Error al obtener esquemas', error);
          });
      } else {
        // Tipo no global: extraer chips del doc
        const doc = userDocs.find(d => d.id && d.id.includes(selectedScheme));
        if (doc && doc[selectedProperty] && typeof doc[selectedProperty] === 'object') {
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

  const handleAddLocationSet = () => {
    setLocationSets((prev) => [...prev, {location: "", numFiles: 1}]);
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
      toast.error('Debe seleccionar al menos un chip');
      return;
    }
    if (locationSets.length === 0) {
      toast.error('Debe definir al menos una ubicación');
      return;
    }
    for (const ls of locationSets) {
      if (!ls.location.trim()) {
        toast.error('Todas las ubicaciones deben tener un nombre.');
        return;
      }
      if (ls.numFiles <= 0) {
        toast.error('El número de archivos por ubicación debe ser mayor que 0.');
        return;
      }
    }

    const newSelection: Selection = {
      scheme: selectedScheme,
      property: selectedProperty,
      chips: selectedChips,
      range: valueRange,
      node: selectedNode,
      locationSets: locationSets
    };

    setSavedSelections((prevSelections) => {
      const existingIndex = prevSelections.findIndex(
        (selection) => selection.scheme === selectedScheme && selection.property === selectedProperty && selection.node === selectedNode
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
          ubicaciones: locationSets
        };
      }

      diccionario[node!][scheme!].atributos[property!] = {
        elementosSeleccionados: chips,
        rango: range,
      };
    });

    try {
      const res = await axios.post('http://127.0.0.1:5000/prepare_files/', {
        diccionario,
        user_docs: userDocs 
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setResumen(res.data.resumen);
    } catch (error) {
      console.error('Error generating files:', error);
    }

    setGeneratedDictionary(diccionario);
  };

  const identifyTypeFromDoc = (doc: { id?: string }): string | null => {
    if (!doc || !doc.id) {
      return null;
    }
    const doc_id: string = doc.id;
    for (const scheme of schemes) {
      if (doc_id.includes(scheme)) {
        return scheme;
      }
    }
    const parts = doc_id.split(":");
    const potential_type = parts[parts.length - 1];
    return potential_type;
  };

  const handleLoadFile = () => {
    if (!fileToUpload) {
      toast.error('Debe seleccionar un archivo para cargar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        setUserDocs(prev => [...prev, jsonContent]);
        toast.success("Archivo cargado exitosamente!");

        const docType = identifyTypeFromDoc(jsonContent);
        if (docType) {
          if (!schemes.includes(docType)) {
            setSchemes((prev) => [...prev, docType]);
          }
          setSelectedScheme(docType);
          toast.info(`Se ha identificado el tipo: ${docType} y añadido a la lista de esquemas.`);
        } else {
          toast.info("No se pudo identificar el tipo del archivo.");
        }

      } catch {
        toast.error("El archivo no es un JSON válido");
      }
    };
    reader.readAsText(fileToUpload);
  };

  const handleDownloadZip = () => {
    axios.get('http://127.0.0.1:5000/download_files', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'archivos_generados.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => {
        console.error('Error downloading zip:', error);
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
          style={{ filter: "invert(1)" }}
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
    <div className={`flex min-h-screen ${montserrat.className}`}>
      <div className="flex-1 bg-[#2b2b2b] p-9">
        <div className="gap-4 space-x-2"> 
          <span className='text-4xl flex gap-6 font-bold text-[#f1f1f1]'>Generar varios archivos
            <Image 
              className="w-10 h-10" 
              src="/archive.svg" 
              alt="File icon"  
              style={{ filter: "invert(1)" }} 
              width={300}
              height={300}
            />
          </span>
        </div>
        <main className="flex-col flex gap-6 sm:items-start">
          <div className='flex flex-col gap-4 position-relative'>
            <div className="flex flex-col gap-4">
              {/* Eliminamos user_id y upload_schema, ahora solo cargar archivo localmente */}
              <label htmlFor="fileUpload" className="mt-4">Cargar archivo:</label>
              <input id="fileUpload" type="file" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} />
              <Button label="Cargar archivo en frontend" icon="pi pi-upload" onClick={handleLoadFile} className="p-button-help bg-[#6C757D]" />

              <p>Seleccionar nodo destino</p>
              <Dropdown value={selectedNode} onChange={(e) => setSelectedNode(e.value)} options={nodes} optionLabel="name" placeholder=""
              className="w-full md:w-14rem p-1 border border-solid rounded-full position-relative"/>

              <p>Elegir el tipo de esquema a generar</p>
              <Dropdown value={selectedScheme} onChange={(e) => setSelectedScheme(e.value)} 
              options={schemes} className="w-full md:w-14rem p-1 border border-solid rounded-full" />

              <p>Elegir las propiedades a modificar</p>
              <Dropdown value={selectedProperty} onChange={(e) => setSelectedProperty(e.value)} options={properties} optionLabel="name" className="w-full md:w-14rem p-1 border border-solid rounded-full" />

              <p>Seleccionar elementos (chips):</p>
              <div className='flex-row flex-wrap'>
                {chips.map((chip, index) => (
                  <Chip 
                    key={index} 
                    label={chip} 
                    className={`bg-[#DCE3F3] text-[#2b2b2b] font-bold rounded-full mx-1 p-1 text-xs ${selectedChips.includes(chip) ? 'bg-[#A9B8D1]' : ''}`} 
                    onClick={() => handleChipClick(chip)} 
                  />
                ))}
              </div>  

              <div className='card flex-row justify-content-center'>
                <Slider value={valueRange} onChange={(e: SliderChangeEvent) => setRangeValue(e.value as [number, number])} className="w-14rem" range min={0} max={selectedChips.length} />
                <p className="py-3 mx-10">Rango seleccionado: {valueRange[0]}-{valueRange[1]}</p>
              </div>

              <p>Ubicaciones:</p>
              <div className="flex flex-col gap-2">
                {locationSets.map((ls, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <InputText
                      value={ls.location}
                      onChange={(e) => handleLocationChange(i, e.target.value)}
                      placeholder="Nombre de la ubicación"
                      className="w-full md:w-14rem p-1 border border-solid rounded-full text-[#2d2d2d] bg-[#f1f1f1"
                    />
                    <InputNumber
                      value={ls.numFiles}
                      onValueChange={(e) => handleLocationNumFilesChange(i, e.value || 1)}
                      min={1}
                      className="w-full md:w-14rem p-1 border border-solid rounded-full custom-input-number"
                    />
                    <Button icon="pi pi-trash" className="p-button-danger" onClick={() => handleRemoveLocationSet(i)} />
                  </div>
                ))}
                <Button label="Agregar ubicación" icon="pi pi-plus" onClick={handleAddLocationSet} className="p-button-success bg-[#43AE6A] mt-2" />
              </div>

              <Button label="Guardar Selección" icon="pi pi-save" onClick={handleSaveSelection} className="p-button-success bg-[#3B82F6]" />
              <ToastContainer />
            </div>
          </div> 
        </main>
      </div>
      <div className="flex-1 bg-[#2B2B2B] flex flex-col items-center text-[#F1F1F1] p-8">
        <footer className="flex-col py-20 flex-wrap items-center justify-center mx-10">
          <DataTable value={savedSelections} selection={selectedRows} onSelectionChange={(e) => setSelectedRows(e.value)} className="mt-4 min-w-full border-collapse text-sm" rowGroupMode="subheader" sortField="node" sortOrder={1} selectionMode="multiple">
            <Column field="node" header="Nodo" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="scheme" header="Tipo" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="property" header="Atributos seleccionados" headerClassName="bg-[#4C4C4C] p-4 text-left font-medium" className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="chips" header="Elementos" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" body={(rowData: Selection) => rowData.chips.join(', ')} className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="range" header="Rango" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" body={(rowData: Selection) => `${rowData.range[0]} - ${rowData.range[1]}`} className="px-4 py-2 border-b border-gray-200 bg-transparent text-center font-medium text-center" />
            <Column header="Ubicaciones" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" body={(rowData: Selection) => rowData.locationSets.map(ls => `${ls.location}: ${ls.numFiles}`).join(' | ')} className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column body={actionBodyTemplate} header="Acciones" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" className="px-4 py-2 border-b border-gray-200 bg-transparent justify-center items-center text-center font-medium" />
          </DataTable>

          <div className="display-flex-row gap-4 items-center flex-col sm:flex-row my-10">
            <Button 
              onClick={handleGenerateFiles} 
              label="Generar Archivos" 
              className='bg-[#3B82F6] p-3 transition-colors text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 mb-8 mr-4' 
            />
            <Button 
              onClick={handleDownloadZip} 
              label="Descargar ZIP" 
              icon="pi pi-arrow-circle-down" 
              className='bg-[#43AE6A] p-3 transition-colors text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 mb-8 mr-4' 
            />
            <Link
              className=" border-black/[.08] dark:border-white/[.145] items-center justify-center "
              href="/"
              target=""
              rel="noopener noreferrer"
            >
              <Button 
                label="Página principal" 
                className='bg-[#D7483E] p-3 transition-colors text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 mb-8 mr-4' 
              />
            </Link>
            <div className="bg-[#4C4C4C] text-[#f1f1f1] flex-row p-2 my-2 max-h-64 overflow-y-auto">
              {resumen?.map((info, index) => (
                <div key={index}>
                  <p>
                    Se han generado para el nodo &#39;{info.nodo}&#39;: {info.numero_archivos} archivos de tipo &#39;{info.tipo}&#39;.
                  </p>
                  {info.atributos_modificados.map((attr, i) => (
                    <p key={i}>
                      Atributo &#39;{attr.atributo}&#39; con elementos {JSON.stringify(attr.elementos)} y rango {JSON.stringify(attr.rango)}.
                    </p>
                  ))}

                  {info.combinaciones_atributos && Object.entries(info.combinaciones_atributos).map(([atributo, combos]) => (
                    <div key={atributo} className="m-4">
                      <p>Combinaciones de propiedades para el atributo &#39;{atributo}&#39;:</p>
                      {Object.entries(combos).map(([comboStr, count], j) => (
                        <p key={j}>{count} archivos con {comboStr || "cero propiedades"}</p>
                      ))}
                    </div>
                  ))}

                  <p>Detalles por archivo:</p>
                  {info.detalles_archivos?.map((archivo, j) => (
                    <div key={j} className="m-4">
                      <p>Archivo {archivo.archivo}:</p>
                      {archivo.atributos.map((attr, k) => (
                        attr.propiedades_seleccionadas.length > 0
                          ? <p key={k}>Atributo &#39;{attr.atributo}&#39; con propiedades: {attr.propiedades_seleccionadas.join(', ')}</p>
                          : <p key={k}>Atributo &#39;{attr.atributo}&#39; con propiedades:</p>
                      ))}
                    </div>
                  ))}
                  <br/>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}