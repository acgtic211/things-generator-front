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
        
import { Button } from 'primereact/button';
        
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});


const ListThingProperties = () => {
  const [schemes, setSchemes] = useState<string[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [valueRange, setRangeValue] = useState<[number, number]>([0, 0]);
  const [savedSelections, setSavedSelections] = useState<Selection[]>([]);
  const [numFiles, setNumFiles] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodesList] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Selection[]>([]);
  const [generatedDictionary, setGeneratedDictionary] = useState<Record<string, Record<string, { numeroArchivos: number; atributos: Record<string, { elementosSeleccionados: string[]; rango: [number, number] }> }>> | null>(null);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);

  console.log(generatedDictionary);


  interface Selection {
    scheme: string | null;
    property: string | null;
    chips: string[];
    range: [number, number];
    numFiles: number;
    node: string | null;
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
  }

  useEffect(() => {
    // Obtener la lista de esquemas
    axios.get('http://127.0.0.1:5000/things_types')
      .then((response) => {
        setSchemes(response.data);
      })
      .catch((error) => {
        console.error('Error al obtener esquemas', error);
      });
  }, []);

  useEffect(() => {
    if (selectedScheme) {
      // Obtener la lista de propiedades basadas en el esquema seleccionado
      axios.get(`http://127.0.0.1:5000/things_types/${selectedScheme}`)
        .then((response) => {
          setProperties(response.data);
        })
        .catch((error) => {
          console.error('Error al obtener propiedades', error);
        });

        setRangeValue([0, 0]);
        setSelectedProperty(null);
        setSelectedChips([]);
    }
  }, [selectedScheme]);

  useEffect(() => {
    if (selectedScheme && selectedProperty) {
      // Obtener la lista de chips basadas en el esquema y propiedad seleccionados
      axios.get(`http://127.0.0.1:5000/things_types/${selectedScheme}/${selectedProperty}`)
        .then((response) => {
          setChips(response.data);
          
        })
        .catch((error) => {
          console.error('Error al obtener esquemas', error);
        });

        setRangeValue([0, 0]);
    }
  }, [selectedScheme, selectedProperty]);

  useEffect(() => {
    // Reiniciar los chips seleccionados y el rango del slider cuando se selecciona una nueva propiedad
    setSelectedChips([]);
    setRangeValue([0, 0]);
  }, [selectedProperty]);

  useEffect(() => {
    axios
      .get("http:///127.0.0.1:5000/nodes_list")
      .then((response) => {
        setNodesList(response.data);
      })
      .catch((error) => {
        console.log('Error al obtener lista de nodos', error);
      });
  } , []);

  const handleChipClick = (chip: string) => {
    setSelectedChips((prevSelectedChips) => {
      const newSelectedChips = prevSelectedChips.includes(chip)
        ? prevSelectedChips.filter((c) => c !== chip)
        : [...prevSelectedChips, chip];

      // Actualizar el rango del slider en función del número de chips seleccionados
      setRangeValue([0, newSelectedChips.length]);
      return newSelectedChips;
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
    
    const newSelection = {
      scheme: selectedScheme,
      property: selectedProperty,
      chips: selectedChips,
      range: valueRange,
      numFiles: numFiles,
      node: selectedNode
    };

    setSavedSelections((prevSelections) => {
      const existingIndex = prevSelections.findIndex(
        (selection) => selection.scheme === selectedScheme && selection.property === selectedProperty && selection.node === selectedNode
      );

      if (existingIndex !== -1) {
        // Actualizar la selección existente
        const updatedSelections = [...prevSelections];
        updatedSelections[existingIndex] = newSelection;
        return updatedSelections;
      } else {
        // Añadir una nueva selección
        return [...prevSelections, newSelection];
      }
    });
  };

  const handleEditSelection = (selection: Selection) => {
    setSelectedScheme(selection.scheme);
    setSelectedProperty(selection.property);
    setSelectedChips(selection.chips);
    setRangeValue(selection.range);
    setNumFiles(selection.numFiles);
    setSelectedNode(selection.node);
  };

  const handleDeleteSelection = (selection: Selection) => {
    setSavedSelections((prevSelections) => prevSelections.filter((s) => s !== selection));
  };
  
  const handleGenerateFiles = async () =>{
    const diccionario: {
      [node: string]: {
        [scheme: string]: {
          numeroArchivos: number;
          atributos: {
            [property: string]: {
              elementosSeleccionados: string[];
              rango: [number, number];
            };
          };
        };
      };
    } = {};
  
      // Asegúrate de que las filas seleccionadas existen antes de generar el diccionario
    const rowsToProcess = savedSelections || [];

    // Procesar cada fila seleccionada
    rowsToProcess.forEach((row) => {
      const { node, scheme, numFiles, property, chips, range } = row;

      if (!diccionario[node!]) {
        diccionario[node!] = {};
      }

      if (!diccionario[node!][scheme!]) {
        diccionario[node!][scheme!] = {
          numeroArchivos: numFiles,
          atributos: {},
        };
      }

      diccionario[node!][scheme!].atributos[property!] = {
        elementosSeleccionados: chips,
        rango: range,
      };
    });
    // Enviar el diccionario a la API usando POST
    try {
      const res = await axios.post('http://127.0.0.1:5000/prepare_files/', {
        diccionario // El diccionario con la configuración
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setResumen(res.data.resumen); // Guardar el resumen en el estado
    } catch (error) {
      console.error('Error generating files:', error);
    }

    // Actualizar el estado con el diccionario generado
    setGeneratedDictionary(diccionario);
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
        <main className="flex-col flex  gap-6 sm:items-start">
          <div className='flex flex-col gap-4 position-relative'>        
            <div className="flex flex-col gap-4">
              <p>Seleccionar nodo destino</p>
              <Dropdown value={selectedNode} onChange={(e) => setSelectedNode(e.value)} options={nodes} optionLabel="name" placeholder=""
              className="w-full md:w-14rem p-1 border border-solid rounded-full position-relative"/>      <p>Número de archivos</p>
              <InputNumber value={numFiles} onValueChange={(e) => setNumFiles(e.value || 1)} min={1} className="w-full md:w-14rem p-1 border border-solid rounded-full custom-input-number" />
            
              <p>Elegir el tipo de esquema a generar</p>
              <Dropdown value={selectedScheme} onChange={(e) => setSelectedScheme(e.value)} options={schemes} optionLabel="name" optionValue="id" className="w-full md:w-14rem p-1 border border-solid rounded-full" />
              <p>Elegir las propiedades a modificar</p>
              <Dropdown value={selectedProperty} onChange={(e) => setSelectedProperty(e.value)} options={properties} optionLabel="name" className="w-full md:w-14rem p-1 border border-solid rounded-full" />      
              <div className='flex-row'>
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
              <Button label="Guardar Selección" onClick={handleSaveSelection} className="p-button-success bg-[#3B82F6]" />
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
            <Column field="numFiles" header="Número de archivos" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" className="px-4 py-2 border-b border-gray-200 bg-transparent text-center font-medium" />
            <Column field="property" header="Atributos seleccionados" headerClassName="bg-[#4C4C4C] p-4 text-left font-medium" className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="chips" header="Elementos" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" body={(rowData) => rowData.chips.join(', ')} className="px-4 py-2 border-b border-gray-200 bg-transparent text-left font-medium" />
            <Column field="range" header="Rango" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" body={(rowData) => `${rowData.range[0]} - ${rowData.range[1]}`} className="px-4 py-2 border-b border-gray-200 bg-transparent text-center font-medium text-center" />
            <Column body={actionBodyTemplate} header="Acciones" headerClassName="bg-[#4C4C4C] text-left font-medium p-4" className="px-4 py-2 border-b border-gray-200 bg-transparent justify-center items-center text-center font-medium" />
          </DataTable>

          <div className="display-flex-row gap-4 items-center flex-col sm:flex-row my-10">
          <Button 
            onClick={handleGenerateFiles} 
            label="Generar Archivos" 
            icon="pi pi-check" 
            className='bg-[#3B82F6] p-3 transition-colors text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 mb-8 mr-4' 
          />
          <Button 
            onClick={handleDownloadZip} 
            label="Descargar ZIP" 
            icon="pi pi-check" 
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
              icon="pi pi-check" 
              className='bg-[#D7483E] p-3 transition-colors text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 mb-8 mr-4' 
            />

          </Link>
          <div className="bg-[#4C4C4C] text-[#f1f1f1] flex-row p-2 my-2">
            {resumen?.map((info, index) => (
              <div key={index}>
                <p>
                  Se han generado para el nodo &apos;{info.nodo}&apos;: {info.numero_archivos} archivos de tipo &apos;{info.tipo}&apos;.
                </p>
                {info.atributos_modificados.map((attr, i) => (
                  <p key={i}>
                    Atributo &apos;{attr.atributo}&apos; con elementos {JSON.stringify(attr.elementos)} y rango {JSON.stringify(attr.rango)}.
                  </p>
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
};

export default function Genfiles() {
  
  return (
    <div>
      <ListThingProperties/>
    </div>
  );
};
