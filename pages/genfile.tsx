import Image from "next/image";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./globals.css";
import { Dropdown } from 'primereact/dropdown';
import { Slider, SliderChangeEvent } from 'primereact/slider';
import { Chip } from 'primereact/chip';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Button } from 'primereact/button';

import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function Genfile() {

  const [schemes, setSchemes] = useState<string[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [valueRange, setRangeValue] = useState<[number, number]>([0, 0]);
  interface FileContent {
    [key: string]: {
      elementosSeleccionados: string[];
      rango: [number, number];
    };
  }

  const [displayedFileContent, setDisplayedFileContent] = useState<FileContent | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleGenerateFile = async () => {
    if (!selectedScheme) {
      toast.error('Debe seleccionar un tipo de esquema');
      return;
    }

    try {
      const res = await axios.post(`http://127.0.0.1:5000/generate_file/${selectedScheme}`, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setDisplayedFileContent(res.data);
    } catch (error) {
      console.error('Error generating file:', error);
    }
  };

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          setDisplayedFileContent(content);
        } catch {
          toast.error('Error al leer el archivo. Asegúrese de que es un archivo JSON válido.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleModify = async () => {
    if (!displayedFileContent) {
      toast.error('No hay contenido para modificar');
      return;
    }
  
    // Construir objeto de modificaciones:
    // Asumimos que solo hay una propiedad seleccionada en este momento.
    const modifications: { [key: string]: { elementosSeleccionados: string[], rango: [number, number] } } = {};
  
    if (selectedProperty) {
      modifications[selectedProperty] = {
        elementosSeleccionados: selectedChips,
        rango: valueRange,
      };
    }
  
    try {
      const response = await axios.post('http://127.0.0.1:5000/modify_file', {
        schema: displayedFileContent,
        modifications: modifications,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (response.status === 200) {
        setDisplayedFileContent(response.data);
        toast.success('Archivo modificado con éxito');
      } else {
        toast.error(`Error al modificar el archivo: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error al modificar el archivo:', error);
      toast.error('Error al modificar el archivo');
    }
  };
  const handleSaveFile = () => {
    if (!displayedFileContent) {
      toast.error('No hay contenido para guardar');
      return;
    }
  
    // Convertir el contenido a cadena JSON con indentación
    const fileData = JSON.stringify(displayedFileContent, null, 2);
  
    // Crear un Blob a partir de la cadena JSON
    const blob = new Blob([fileData], { type: 'application/json' });
  
    // Crear una URL temporal para el Blob
    const url = window.URL.createObjectURL(blob);
  
    // Crear un enlace temporal para descargar el archivo
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'archivo_modificado.json'); // Nombre del archivo
    document.body.appendChild(link);
  
    // Simular click en el enlace para iniciar la descarga
    link.click();
  
    // Limpiar el enlace
    link.remove();
  };

  return (
    <div className={`flex min-h-screen bg-[#f1f1f1] text-[#2d2d2d] ${montserrat.className}`}>
      <div className="flex-1 flex flex-col p-9">
        <main className="flex flex-col gap-6 sm:items-start">
          <div className="flex-direction-row flex items-center gap-4">
            <h1 className='text-4xl font-bold'>Generar un solo archivo</h1>
            <Image
              className="flex-1"
              aria-hidden
              src="/myfile.svg"
              alt="File icon"
              width={30}
              height={30}
            />
          </div>
          <div className='flex flex-col gap-4 position-relative'>
            <ToastContainer />

            <p className='mx-2'>Elegir el tipo de esquema a generar</p>
            <div className='flex flex-col gap-2 position-relative'>
              <Dropdown value={selectedScheme} onChange={(e) => setSelectedScheme(e.value)} options={schemes} optionLabel="name" optionValue="id"
                placeholder="" className="w-full md:w-14rem p-1 border border-solid rounded-full position-relative" />
              <div className="flex-row">
                <Button label="Generar archivo" icon="pi pi-check" onClick={handleGenerateFile} className='bg-[#3B82F6] p-3 text-[#f1f1f1] w-40 mr-4' />
                <Button label="Cargar archivo" icon="pi pi-upload" onClick={() => fileInputRef.current?.click()} className='bg-[#3B82F6] p-3 text-[#f1f1f1] w-40' />
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleLoadFile} />
            </div>

            <p className='mx-2'>Elegir las propiedades a modificar</p>
            <Dropdown value={selectedProperty} onChange={(e) => setSelectedProperty(e.value)} options={properties} optionLabel="name"
              placeholder="" className="w-full md:w-14rem p-1 border border-solid rounded-full" />
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
            </div>
            <div>
              <p className=" mx-10">Rango seleccionado: {valueRange[0]}-{valueRange[1]}</p>
            </div>
          </div>
          <div className='flex flex-col gap-2 items-center justify-center sm:flex-row'>
            <Button label="Modificar" icon="pi pi-pencil" onClick={handleModify} className='bg-[#3B82F6] p-3 text-[#f1f1f1]' />
            <Button label="Guardar" icon="pi pi-save" onClick={handleSaveFile} className='bg-[#43AE6A] p-3 text-[#f1f1f1]' />
            <Link
              title="Volver a la página principal"
              href="/"
              target=""
              rel="noopener noreferrer">
              <Button label="Página principal" icon="pi pi-home" className='bg-[#D7483E] p-3 text-[#f1f1f1]' />
            </Link>
          </div>
        </main>
      </div>
      <div className="flex-1 flex flex-col justify-center items-center text-[#F1F1F1] p-8">
        <div className="flex flex-col gap-4 bg-[#2d2d2d] p-4 rounded">
          {displayedFileContent ? (
            <pre>{JSON.stringify(displayedFileContent, null, 2)}</pre>
          ) : (
            <p>No hay contenido para mostrar</p>
          )}
        </div>
      </div>
    </div>
  );
}
