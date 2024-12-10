
import Image from "next/image";
import React from "react";
import "./globals.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo */}
      <div className="flex-1 bg-[#f1f1f1] flex flex-col justify-center items-center p-8 text-[#2b2b2b]">
            {/* Imagen alineada al centro del panel izquierdo*/}
            <Link href="/genfile">
              <Image
                className=""
                src="/myfile.svg"
                alt="File icon"
                width={210}
                height={210}
                
              />
            </Link>
             <p className="font-bold font-sans text-3xl mx-auto my-4">Generar un solo archivo</p>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 bg-[#2B2B2B] flex flex-col justify-center items-center text-white p-8">
            <Link href="/gennodes">
            <Image
              className="text-blue-500"
              aria-hidden
              src="/archive.svg"
              alt="File icon"
              width={300}
              height={300}
              style = {{filter: "invert(1)"}}
            />
            </Link>
          <p className="font-bold font-sans text-3xl text-[#f1f1f1]">
              Generar varios archivos
          </p>
      </div>
    </div>
  );
}
