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

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});

interface AtributoModificado {
  atributo: string;
  elementos: string[];
  rango: [number, number];
}

interface ArchivoDetalle {
  archivo: number;
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

const GenerateRandomFiles = () => {
  const [numNodes, setNumNodes] = useState<number>(1);
  const [resumen, setResumen] = useState<ResumenItem[] | null>(null);

  // Múltiples ubicaciones
  const [locationSets, setLocationSets] = useState<LocationSet[]>([]);

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

  const handlePrepareRandomFiles = async () => {
    // Validar que haya al menos una ubicación
    if (locationSets.length === 0) {
      toast.error("Debe agregar al menos una ubicación.");
      return;
    }
    // Validar que todas las ubicaciones tengan nombre y numFiles > 0
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
    } catch (error) {
      console.error('Error preparing random files:', error);
      toast.error('Error al preparar archivos aleatorios');
    }
  };

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

  // Sumar total de archivos a partir de las ubicaciones
  const totalFiles = locationSets.reduce((sum, ls) => sum + ls.numFiles, 0);

  return (
    <div className="flex flex-row gap-6">
      {/* Sección izquierda: inputs y botones */}
      <div className="flex flex-col gap-4 mr-auto">
        <p className="text-[#f1f1f1]">Número de nodos</p>
        <InputNumber value={numNodes} onValueChange={(e) => setNumNodes(e.value || 1)} min={1} className="w-full md:w-14rem p-1 border border-solid rounded-full custom-input-number" />

        <p className="text-[#f1f1f1] mt-4">Ubicaciones:</p>
        <div className="flex flex-col gap-2">
          {locationSets.map((ls, i) => (
            <div key={i} className="flex items-center gap-2">
              <InputText
                value={ls.location}
                onChange={(e) => handleLocationChange(i, e.target.value)}
                placeholder="Nombre de la ubicación"
                className="w-full md:w-14rem p-1 border border-solid rounded-full bg-transparent text-[#f1f1f1]"
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
          <Button label="Agregar ubicación" icon="pi pi-plus" onClick={handleAddLocationSet} className="p-button-success bg-[#43AE6A]" />
        </div>

        <p className="text-[#f1f1f1] mt-4">Total de archivos: {totalFiles}</p>

        <div className="flex-col mt-4">
          <Button label="Generar Archivos Aleatorios" onClick={handlePrepareRandomFiles} className="p-button-success bg-[#3B82F6] mr-4 mb-2" />
          <Button label="Descargar ZIP" onClick={handleDownloadZip} className="p-button-success bg-[#4CAF50] mr-4 mb-2" />
          <Link href="/" passHref>
            <Button 
              label="Página principal" 
              icon="pi pi-home" 
              className='bg-[#D7483E] p-3 text-sm sm:text-base px-4 sm:px-5 sm:min-w-44 mb-2' 
            />
          </Link>
        </div>
      </div>

      {/* Sección derecha: mostrar el resumen */}
      <div className="bg-[#333333] p-4 rounded w-1/2 text-[#f1f1f1] max-h-80 overflow-y-auto">
        <h3 className="font-bold mb-4">Resumen de Archivos Generados</h3>
        {resumen ? (
          resumen.map((info, index) => (
            <div key={index} className="mb-4">
              <p>Se han generado para el nodo &apos;{info.nodo}&apos;: {info.numero_archivos} archivos de tipo &apos;{info.tipo}&apos;.</p>
              {info.atributos_modificados.map((attr, i) => {
                const elementos = attr.elementos.join(", ");
                return (
                  <span key={i}>
                    Atributo &apos;{attr.atributo}&apos; con elementos [{elementos}] y rango [{attr.rango[0]}, {attr.rango[1]}]<br/>
                  </span>
                );
              })}

              {info.combinaciones_atributos && Object.keys(info.combinaciones_atributos).map((atributo, i) => (
                <div key={i} className="mt-2">
                  <p>Combinaciones para el atributo &apos;{atributo}&apos;:</p>
                  {info.combinaciones_atributos && Object.entries(info.combinaciones_atributos[atributo]).map(([comboStr, count], j) => (
                    <p key={j}>{count} archivos con {comboStr || "sin propiedades"}</p>
                  ))}
                </div>
              ))}

              {info.detalles_archivos && (
                <div className="mt-2">
                  <p>Detalles por archivo:</p>
                  {info.detalles_archivos.map((archivo, k) => (
                    <div key={k}>
                      <p>Archivo {archivo.archivo}:</p>
                      {archivo.atributos.map((a, m) => (
                        <p key={m}>
                          Atributo &apos;{a.atributo}&apos; con propiedades: {a.propiedades_seleccionadas.join(", ")}
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
        )}
      </div>
    </div>
  );
};

const GenerateNodes = () => {
  const [numNodos, setNumNodos] = useState<number>(1);
  const [response, setResponse] = useState(null);
  const router = useRouter();
  console.log(response)
  const handleGenerateNodes = async () => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/generate_nodes/', {
        num_nodos: numNodos
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setResponse(res.data);
      toast.success('Nodos generados exitosamente');
      router.push('/genfiles');
    } catch (error) {
      console.error('Error generating nodes:', error);
      toast.error('Error al generar nodos');
    }
  };

  return (
    <div className="flex flex-col justify-center gap-4 mr-auto">
      <p className="text-white">Elegir número de nodos a generar</p>
      <InputNumber value={numNodos} onValueChange={(e) => setNumNodos(e.value || 1)} min={1} className="w-4 md:w-14rem p-1 border border-solid rounded-full custom-input-number" />
      <div className="flex-col">
        <Button label="Generar Nodos" onClick={handleGenerateNodes} className="p-button-success bg-[#3B82F6] mr-4" />
        <Link href="/" passHref>
          <Button 
            label="Página principal" 
            icon="pi pi-home" 
            className='bg-[#D7483E] p-3 text-sm sm:text-base px-4 sm:px-5 sm:min-w-44' 
          />
        </Link>
      </div>
    </div>
  );
};

export default function Gennodes() {
  const [selectedOption, setSelectedOption] = useState('');

  return (
    <div className={`flex min-h-screen flex-col bg-[#2b2b2b] p-9 gap-6 ${montserrat.className}`}>
      <div className="gap-4 space-x-2"> 
        <span className='text-4xl flex gap-6 font-bold text-[#f1f1f1]'>Generar Archivos
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

      {/* Selector de opciones */}
      <div className="flex gap-4 my-4">
        <div className="flex items-center">
          <RadioButton inputId="option1" name="option" value="generateNodes" onChange={(e) => setSelectedOption(e.value)} checked={selectedOption === 'generateNodes'} />
          <label htmlFor="option1" className="ml-2 text-white">Generar Nodos Personalizados</label>
        </div>
        <div className="flex items-center">
          <RadioButton inputId="option2" name="option" value="generateRandomFiles" onChange={(e) => setSelectedOption(e.value)} checked={selectedOption === 'generateRandomFiles'} />
          <label htmlFor="option2" className="ml-2 text-white">Generar Archivos Aleatorios</label>
        </div>
      </div>

      {selectedOption === 'generateNodes' && <GenerateNodes />}
      {selectedOption === 'generateRandomFiles' && <GenerateRandomFiles />}

      {selectedOption === '' && (
        <p className="text-white">Por favor, selecciona una opción para continuar.</p>
      )}
    </div>
  );
}
