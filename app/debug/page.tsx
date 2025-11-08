import React from "react";
import Navbar from "@/components/navbar";

const DebugPage = () => {
  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          Debug-Seite für Navbar-Problem
        </h1>
        <p className="mb-4">
          Öffne die Browser-Konsole und klicke auf den Avatar in der Navbar, um
          die Debug-Informationen zu sehen.
        </p>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">Hinweis:</p>
          <p>1. Öffne die Entwicklerkonsole (F12)</p>
          <p>2. Klicke auf den Avatar in der Navbar</p>
          <p>3. Beobachte die Konsolenausgaben</p>
          <p>4. Schau, ob sich die Navbar nach unten verschiebt</p>
        </div>
      </div>
    </>
  );
};

export default DebugPage;
