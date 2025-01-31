import Image from "next/image";
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./globals.css"; // Importamos los estilos globales con nuestras clases
import { Dropdown } from 'primereact/dropdown';
import { Slider, SliderChangeEvent } from 'primereact/slider';
import { Chip } from 'primereact/chip';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from 'primereact/button';
import { Montserrat } from 'next/font/google';
import Editor from 'react-simple-code-editor';
import hljs from 'highlight.js';
// Puedes cambiar o combinar estilos de highlight.js
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/atom-one-dark.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
});

interface FileContent {
  [key: string]: {
    elementosSeleccionados: string[];
    rango: [number, number];
  };
}

// Ejemplo de inferir un tipo "nuevo" si identify_type da error
interface Document {
  id: string;
}

function inferLocalTypeFromDocId(doc: Document): string {
  // Supongamos que el doc tiene "id": "myDevice123"
  // y decides quedarte con "myDevice" como nuevo tipo
  if (!doc?.id) return 'unknown';

  // Corta en ":" si existe
  const splitted = doc.id.split(':');
  const lastSegment = splitted[splitted.length - 1];

  // Remueve dígitos, e.g. "myDevice123" => "myDevice"
  const inferred = lastSegment.replace(/\d+$/, '');
  return inferred || 'unknown';
}

export default function Genfile() {
  const [schemes, setSchemes] = useState<string[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [valueRange, setRangeValue] = useState<[number, number]>([0, 0]);

  const [displayedFileContent, setDisplayedFileContent] = useState<FileContent | null>(null);
  const [editableText, setEditableText] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function highlightCode(code: string) {
    try {
      return hljs.highlight(code, { language: 'json' }).value;
    } catch {
      return code;
    }
  }

  /* ------------------- useEffects ------------------- */
  useEffect(() => {
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
    setSelectedChips([]);
    setRangeValue([0, 0]);
  }, [selectedProperty]);

  /* ------------------- Handlers ------------------- */

  /**
   * Maneja la selección de un chip determinado.
   * - Agrega o quita el chip de la lista de chips seleccionados.
   * - Actualiza el rango con base en la cantidad de chips seleccionados.
   */
  const handleChipClick = (chip: string) => {
    setSelectedChips((prevSelectedChips) => {
      const newSelectedChips = prevSelectedChips.includes(chip)
        ? prevSelectedChips.filter((c) => c !== chip)
        : [...prevSelectedChips, chip];
      setRangeValue([0, newSelectedChips.length]);
      return newSelectedChips;
    });
  };
  
  /**
   * Envía una solicitud al backend para generar un nuevo archivo JSON de ejemplo
   * basado en el esquema seleccionado. El archivo resultante se muestra en el editor.
   */
  const handleGenerateFile = async () => {
    if (!selectedScheme) {
      toast.error('Debe seleccionar un tipo de esquema');
      return;
    }
    try {
      const res = await axios.post(
        `http://127.0.0.1:5000/generate_file/${selectedScheme}`,
        {},
        { headers: { 'Content-Type': 'application/json' } }
      );
      setDisplayedFileContent(res.data);
      setEditableText(JSON.stringify(res.data, null, 2));
    } catch (error) {
      console.error('Error generating file:', error);
    }
  };

  /**
   * Lógica para cargar un archivo JSON desde el disco local.
   * - Lee el contenido y lo convierte a JSON.
   * - Intenta identificar el tipo en el backend (identify_type).
   *   - Si el backend reconoce el tipo, se setea dicho tipo en el estado.
   *   - Si no lo reconoce, se intenta inferir un tipo local usando 'inferLocalTypeFromDocId'.
   */
  const handleLoadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        setDisplayedFileContent(content);
        setEditableText(JSON.stringify(content, null, 2));

        // 1) Preguntar al backend si reconoce el tipo
        try {
          const response = await axios.post(
            'http://127.0.0.1:5000/identify_type',
            { schema: content },
            { headers: { 'Content-Type': 'application/json' } }
          );
          if (response.status === 200 && response.data.type) {
            // El backend reconoció un tipo existente
            setSelectedScheme(response.data.type);
            // Verificamos si ya está en 'schemes', si no, lo añadimos:
            setSchemes((prev) => {
              if (!prev.includes(response.data.type)) {
                return [...prev, response.data.type];
              }
              return prev;
            });
            toast.success(`Tipo identificado: ${response.data.type}`);
          } else {
            // Respuesta 200 sin type -> teóricamente improbable, pero lo manejamos
            toast.warning('Tipo no reconocido en el backend. Se intentará inferir localmente.');
            registerLocalType(content);
          }
        } catch {
          // Si el backend devolvió 404 o un error => no se encontró tipo
          console.log('El backend no reconoce el tipo. Crearemos uno local.');
          registerLocalType(content);
        }
      } catch {
        toast.error('Error al leer el archivo. Asegúrese de que es un JSON válido.');
      }
    };

    reader.readAsText(file);
  };

  // 2) Si no lo reconoce, creamos un "tipo local" y lo añadimos a schemes
  const registerLocalType = (doc: Document) => {
    const newType = inferLocalTypeFromDocId(doc);
    setSelectedScheme(newType);
    setSchemes((prev) => {
      if (!prev.includes(newType)) {
        return [...prev, newType];
      }
      return prev;
    });
    toast.info(`Tipo inferido localmente: ${newType}`);
  };

  /**
   * Envía la solicitud al backend para modificar el archivo JSON según:
   * - La propiedad seleccionada
   * - Los chips seleccionados
   * - El rango seleccionado
   * El backend devolverá el archivo modificado, que se mostrará en el editor.
   */
  const handleModify = async () => {
    if (!displayedFileContent) {
      toast.error('No hay contenido para modificar');
      return;
    }
    const modifications: {
      [key: string]: {
        elementosSeleccionados: string[];
        rango: [number, number];
      };
    } = {};

    if (selectedProperty) {
      modifications[selectedProperty] = {
        elementosSeleccionados: selectedChips,
        rango: valueRange,
      };
    }

    try {
      const response = await axios.post(
        'http://127.0.0.1:5000/modify_file',
        {
          schema: displayedFileContent,
          modifications: modifications,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.status === 200) {
        setDisplayedFileContent(response.data);
        setEditableText(JSON.stringify(response.data, null, 2));
        toast.success('Archivo modificado con éxito');
      } else {
        toast.error(`Error al modificar el archivo: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error al modificar el archivo:', error);
    }
  };

  const handleSaveFile = () => {
    if (!displayedFileContent) {
      toast.error('No hay contenido para guardar');
      return;
    }
    const fileData = JSON.stringify(displayedFileContent, null, 2);
    const blob = new Blob([fileData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'archivo_modificado.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  

  /* ------------------- Render ------------------- */
  return (
    <div className={`genfile-container ${montserrat.className}`}>
      {/* Panel / Columna Izquierda */}
      <div className="genfile-leftPanel">
        <main className="genfile-main">
          <div className="genfile-titleRow">
            <h1 className="genfile-title">Generar un solo archivo</h1>
            <Image
              className="genfile-imageFlex1"
              aria-hidden
              src="/myfile.svg"
              alt="File icon"
              width={30}
              height={30}
            />
          </div>

          <div className="position-relative flex flex-col gap-4">
            <ToastContainer />

            <p className="genfile-mx2">Elegir el tipo de esquema a generar</p>
            <div className="position-relative flex flex-col gap-2 ">
              <Dropdown
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.value)}
                options={schemes}
                optionLabel="name"
                optionValue="id"
                placeholder=""
                className="genfile-dropdown"
              />
              <div className="genfile-flexRow">
                <Button
                  label="Generar archivo"
                  icon="pi pi-check"
                  onClick={handleGenerateFile}
                  /* Se combinan clases definidas en global */
                  className="genfile-btnBlue genfile-btn40 genfile-btnMr4"
                />
                
              </div>
              <label htmlFor="fileInput" className="sr-only">
                Cargar archivo
              </label>
              <input
                type="file"
                id="fileInput"
                ref={fileInputRef}
                className="genfile-custom-input"
                accept=".json"
                onChange={handleLoadFile}
              />
            </div>

            <p className="genfile-mx2">Elegir las propiedades a modificar</p>
            <Dropdown
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.value)}
              options={properties}
              optionLabel="name"
              placeholder=""
              className="genfile-dropdown"
            />

            <div className="genfile-flexRow">
              {chips.map((chip, index) => {
                const isSelected = selectedChips.includes(chip);
                return (
                  <Chip
                    key={index}
                    label={chip}
                    onClick={() => handleChipClick(chip)}
                    className={
                      isSelected
                        ? `genfile-chip genfile-chipSelected`
                        : `genfile-chip`
                    }
                  />
                );
              })}
            </div>

            <div className="genfile-cardRow">
              <Slider
                value={valueRange}
                onChange={(e: SliderChangeEvent) =>
                  setRangeValue(e.value as [number, number])
                }
                className="genfile-sliderWidth"
                range
                min={0}
                max={selectedChips.length}
              />
            </div>
            <div>
              <p className="genfile-mx10">
                Rango seleccionado: {valueRange[0]} - {valueRange[1]}
              </p>
            </div>
          </div>

          <div className="genfile-btnRow">
            <Button
              label="Modificar"
              icon="pi pi-pencil"
              onClick={handleModify}
              className="genfile-btnBlue"
            />
            <Button
              label="Guardar"
              icon="pi pi-save"
              onClick={handleSaveFile}
              className="genfile-btnGreen"
            />
            <Link href="/" target="" rel="noopener noreferrer">
              <Button
                label="Página principal"
                icon="pi pi-home"
                className="genfile-btnRed"
              />
            </Link>
          </div>
        </main>
      </div>

      {/* Panel / Columna Derecha */}
      <div className="genfile-rightPanel">
        <div className="genfile-codeContainer">
          {displayedFileContent ? (
            <Editor
              value={editableText}
              onValueChange={(newValue) => {
                setEditableText(newValue);
                try {
                  const parsed = JSON.parse(newValue);
                  setDisplayedFileContent(parsed);
                } catch {
                  // Si el JSON no es válido, no actualizamos el contenido real
                }
              }}
              highlight={highlightCode}
              padding={10}
              /* Usamos nuestra clase de globals.css para estilo */
              className="genfile-editor"
            />
          ) : (
            <p>No hay contenido para mostrar</p>
          )}
        </div>
      </div>
    </div>
  );
}
