import React, { useState, useEffect } from 'react';
import { WordChallenge, WordType, User } from '../types';
import { fetchWords } from '../services/geminiService';
import { Button } from '../components/Button';
import { playSound } from '../services/soundService';
import { BlackCat } from '../components/BlackCat';

interface GameProps {
  user: User;
  onEnd: (score: number, efficiency: number, avgLevel: number) => void;
  onBack: () => void;
}

const Game: React.FC<GameProps> = ({ user, onEnd, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<WordChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  
  // Current Turn selections
  const [selectedType, setSelectedType] = useState<WordType | null>(null);
  const [selectedTilde, setSelectedTilde] = useState<boolean | null>(null);

  // Round Results Summary
  const [isFinished, setIsFinished] = useState(false);
  
  // Cat Mood State
  const [catMood, setCatMood] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      
      // LOGIC: Calculate target difficulty based on the LAST game
      let targetLevel = 3; // Default for new users
      
      if (user.stats.history.length > 0) {
        // Get the very last game played
        const lastGame = user.stats.history[user.stats.history.length - 1];
        const prevLevel = lastGame.averageLevel;
        const prevEff = lastGame.efficiency; // 0-100

        // Adaptive Algorithm:
        // If efficiency >= 80% -> Increase difficulty
        // If efficiency < 50% -> Decrease difficulty
        // Otherwise -> Maintain difficulty
        
        if (prevEff >= 80) {
          targetLevel = Math.min(10, Math.floor(prevLevel + 1));
        } else if (prevEff < 50) {
          targetLevel = Math.max(1, Math.floor(prevLevel - 1));
        } else {
          targetLevel = Math.floor(prevLevel);
        }
        
        console.log(`Adapting difficulty. Prev Eff: ${prevEff}%, Prev Lvl: ${prevLevel} -> Target: ${targetLevel}`);
      }

      const data = await fetchWords(targetLevel);
      setWords(data);
      setLoading(false);
    };
    initGame();
  }, [user.stats.history]); // Depend on history to recalc if it changes (though usually component remounts)

  const handleSubmitTurn = () => {
    if (selectedType === null || selectedTilde === null) return;
    
    setShowResult(true);
    const currentWord = words[currentIndex];
    
    let turnScore = 0;
    if (currentWord.type === selectedType) turnScore += 0.5;
    if (currentWord.hasTilde === selectedTilde) turnScore += 0.5;

    const isFullSuccess = turnScore === 1;

    setScore(s => s + turnScore);

    if (isFullSuccess) {
      playSound('success');
      setCatMood('success');
    } else {
      playSound('error');
      setCatMood('error');
    }
  };

  const handleNext = () => {
    setShowResult(false);
    setSelectedType(null);
    setSelectedTilde(null);
    setCatMood('idle');
    playSound('click');

    if (currentIndex + 1 >= words.length) {
      finishGame();
    } else {
      setCurrentIndex(p => p + 1);
    }
  };

  const finishGame = () => {
    setIsFinished(true);
    const efficiency = (score / words.length) * 100;
    const avgLevel = words.reduce((acc, w) => acc + w.difficulty, 0) / words.length;
    onEnd(score, efficiency, avgLevel);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <BlackCat mood="idle" className="animate-pulse" />
        <p className="text-xl font-bold text-gray-600">La gatita está buscando palabras...</p>
        <p className="text-sm text-pink-500">Ajustando dificultad para ti...</p>
      </div>
    );
  }

  if (isFinished) {
    const efficiency = Math.round((score / words.length) * 100);
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-lg text-center space-y-6 animate-fade-in-up">
        <BlackCat mood="success" className="mx-auto" />
        <h2 className="text-3xl font-heading font-bold text-pink-600">¡Ronda Terminada!</h2>
        <div className="py-8 bg-pink-50 rounded-2xl">
          <div className="text-6xl font-bold text-gray-800 mb-2">{score} <span className="text-2xl text-gray-400">/ 20</span></div>
          <div className="inline-block px-4 py-1 bg-white text-pink-700 rounded-full font-bold shadow-sm border border-pink-100">
            {efficiency}% de Eficiencia
          </div>
        </div>
        <Button onClick={onBack} size="lg" className="w-full">Volver al Dashboard</Button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const isCorrectType = currentWord.type === selectedType;
  const isCorrectTilde = currentWord.hasTilde === selectedTilde;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-0 relative pt-10">
      
      {/* Mascot Positioned on top of card */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <BlackCat mood={catMood} />
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-white ring-4 ring-pink-50 pt-32 pb-12 px-8 md:px-12 text-center relative overflow-visible mt-20 transition-all">
        {/* Header Info inside card */}
        <div className="absolute top-6 left-6 text-sm font-bold text-gray-400">
           {currentIndex + 1} / {words.length}
        </div>
        <div className="absolute top-6 right-6 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <span>⚡</span> Nivel {currentWord.difficulty}
        </div>

        <h2 className="text-4xl md:text-6xl font-heading font-bold text-gray-800 mb-4 tracking-tight">
          {showResult ? currentWord.correctWord : currentWord.displayWord}
        </h2>
        <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">¿Qué tipo de palabra es?</p>
      </div>

      {/* Controls */}
      {!showResult ? (
        <div className="space-y-6 animate-fade-in-up">
          {/* Section 1: Type */}
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl">
            <h3 className="font-bold text-gray-700 mb-3 ml-2">1. Clasificación</h3>
            <div className="grid grid-cols-3 gap-3">
              {[WordType.Aguda, WordType.Grave, WordType.Esdrujula].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-4 rounded-2xl border-b-4 font-bold transition-all active:scale-95 ${
                    selectedType === type 
                      ? 'border-pink-600 bg-pink-500 text-white shadow-lg translate-y-[-2px]' 
                      : 'border-gray-200 bg-white text-gray-500 hover:border-pink-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Tilde */}
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl">
            <h3 className="font-bold text-gray-700 mb-3 ml-2">2. Acentuación gráfica</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                 onClick={() => setSelectedTilde(true)}
                 className={`p-4 rounded-2xl border-b-4 font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                   selectedTilde === true
                     ? 'border-green-600 bg-green-500 text-white shadow-lg translate-y-[-2px]' 
                     : 'border-gray-200 bg-white text-gray-500 hover:border-green-200'
                 }`}
              >
                <span>✏️</span> Con Tilde
              </button>
              <button
                 onClick={() => setSelectedTilde(false)}
                 className={`p-4 rounded-2xl border-b-4 font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                   selectedTilde === false
                     ? 'border-red-600 bg-red-500 text-white shadow-lg translate-y-[-2px]' 
                     : 'border-gray-200 bg-white text-gray-500 hover:border-red-200'
                 }`}
              >
                <span>🚫</span> Sin Tilde
              </button>
            </div>
          </div>

          <Button 
            onClick={handleSubmitTurn} 
            disabled={selectedType === null || selectedTilde === null}
            className="w-full py-4 text-xl shadow-xl shadow-pink-200/50"
            size="lg"
          >
            ¡Comprobar!
          </Button>
        </div>
      ) : (
        /* Result View */
        <div className="bg-white p-6 rounded-3xl border-4 border-pink-100 animate-fade-in space-y-4 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
             <div className={`p-4 rounded-2xl text-center border-2 ${isCorrectType ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="font-bold text-xs uppercase opacity-60 mb-1">Tipo</div>
                <div className="text-xl font-bold mb-1">{isCorrectType ? '✅ ¡Bien!' : '❌ Ops'}</div>
                <div className="text-sm font-medium">Es {currentWord.type}</div>
             </div>
             <div className={`p-4 rounded-2xl text-center border-2 ${isCorrectTilde ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="font-bold text-xs uppercase opacity-60 mb-1">Tilde</div>
                <div className="text-xl font-bold mb-1">{isCorrectTilde ? '✅ ¡Bien!' : '❌ Ops'}</div>
                <div className="text-sm font-medium">{currentWord.hasTilde ? 'Lleva tilde' : 'No lleva'}</div>
             </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-900 text-sm flex gap-3 items-start">
            <span className="text-xl">💡</span>
            <div>
              <strong className="block mb-1 text-blue-700">Explicación:</strong>
              {currentWord.explanation}
            </div>
          </div>

          <Button onClick={handleNext} className="w-full" size="lg">
            Siguiente Palabra ➡
          </Button>
        </div>
      )}
    </div>
  );
};

export default Game;
