import React from 'react';

const Practice = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <h1 className="text-3xl font-heading font-bold text-pink-600 text-center">Guía de Acentuación 📚</h1>
      
      <RuleCard 
        title="Palabras Agudas" 
        color="pink"
        definition="Son aquellas cuya sílaba tónica (la que suena más fuerte) es la última."
        rule="Llevan tilde cuando terminan en N, S o VOCAL."
        examples={['Café (vocal)', 'Sofá (vocal)', 'Camión (n)', 'Compás (s)', 'Amor (r - no lleva)', 'Reloj (j - no lleva)']}
      />

      <RuleCard 
        title="Palabras Graves (Llanas)" 
        color="purple"
        definition="Son aquellas cuya sílaba tónica es la penúltima."
        rule="Llevan tilde cuando NO terminan en N, S o VOCAL."
        examples={['Árbol (l)', 'Césped (d)', 'Azúcar (r)', 'Mesa (vocal - no lleva)', 'Libro (vocal - no lleva)', 'Lunes (s - no lleva)']}
      />

      <RuleCard 
        title="Palabras Esdrújulas" 
        color="blue"
        definition="Son aquellas cuya sílaba tónica es la antepenúltima."
        rule="¡Siempre llevan tilde! Sin excepciones."
        examples={['Música', 'Pájaro', 'América', 'Miércoles', 'Teléfono']}
      />
    </div>
  );
};

const RuleCard = ({ title, color, definition, rule, examples }: any) => {
  const colors: any = {
    pink: "border-pink-200 bg-pink-50",
    purple: "border-purple-200 bg-purple-50",
    blue: "border-blue-200 bg-blue-50"
  };

  return (
    <div className={`p-6 rounded-3xl border-2 ${colors[color]} shadow-sm`}>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="space-y-4">
        <div>
          <span className="font-bold uppercase text-xs opacity-50">Definición</span>
          <p className="text-lg">{definition}</p>
        </div>
        <div className="bg-white/60 p-4 rounded-xl">
          <span className="font-bold uppercase text-xs opacity-50">Regla de Oro</span>
          <p className="font-bold text-lg">{rule}</p>
        </div>
        <div>
          <span className="font-bold uppercase text-xs opacity-50">Ejemplos</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {examples.map((ex: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm font-medium shadow-sm">
                {ex}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;