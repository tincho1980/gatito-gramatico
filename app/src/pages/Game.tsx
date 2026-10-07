import React, { useState, useEffect } from 'react';
import { WordChallenge, WordType, User } from '../types';
import { fetchWords } from '../services/wordService';
import { Button } from '../components/Button';
import { playSound } from '../services/soundService';
import { BlackCat } from '../components/BlackCat';
import {
  getSkillLevel,
  computeNextSkillLevel,
  computeEffectiveEfficiency,
  getLevelChangeMessage,
} from '../services/difficultyService';

interface GameProps {
  user: User;
  onEnd: (score: number, efficiency: number, avgLevel: number, targetLevel: number) => void;
  onBack: () => void;
}

const RECENT_WORDS_KEY = 'gg_recent_words';
const MAX_RECENT_WORDS = 40;

const getRecentWords = (): string[] => {
  try {
    const stored = sessionStorage.getItem(RECENT_WORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentWords = (displayWords: string[]) => {
  const merged = [...displayWords, ...getRecentWords()];
  const unique = [...new Set(merged.map((w) => w.toLowerCase()))].slice(0, MAX_RECENT_WORDS);
  sessionStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(unique));
};

const Game: React.FC<GameProps> = ({ user, onEnd, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<WordChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [roundLevel, setRoundLevel] = useState(3);
  const [levelChangeMessage, setLevelChangeMessage] = useState<string | null>(null);
  const [nextLevelPreview, setNextLevelPreview] = useState<number | null>(null);

  const [selectedType, setSelectedType] = useState<WordType | null>(null);
  const [selectedTilde, setSelectedTilde] = useState<boolean | null>(null);

  const [isFinished, setIsFinished] = useState(false);
  const [catMood, setCatMood] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const initGame = async () => {
      setLoading(true);

      const level = getSkillLevel(user.stats);
      const prevTarget = user.stats.history.at(-1)?.targetLevel;
      setRoundLevel(level);
      setLevelChangeMessage(getLevelChangeMessage(level, prevTarget));

      const data = await fetchWords(level, { excludeWords: getRecentWords() });
      setWords(data);
      setLoading(false);
    };
    initGame();
  }, []);

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!levelChangeMessage) return;
    const timer = setTimeout(() => setLevelChangeMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [levelChangeMessage]);

  const handleSubmitTurn = () => {
    const currentWord = words[currentIndex];
    if (!currentWord || selectedType === null || selectedTilde === null) return;

    setShowResult(true);

    let turnScore = 0;
    if (currentWord.type === selectedType) turnScore += 0.5;
    if (currentWord.hasTilde === selectedTilde) turnScore += 0.5;

    const isFullSuccess = turnScore === 1;

    setScore((s) => s + turnScore);

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
      setCurrentIndex((p) => p + 1);
    }
  };

  const finishGame = () => {
    setIsFinished(true);
    const efficiency = (score / words.length) * 100;
    const avgLevel = words.reduce((acc, w) => acc + w.difficulty, 0) / words.length;
    const effectiveEfficiency = computeEffectiveEfficiency(user.stats.history, efficiency);
    const nextLevel = computeNextSkillLevel(roundLevel, effectiveEfficiency);
    setNextLevelPreview(nextLevel);
    saveRecentWords(words.map((w) => w.displayWord));
    onEnd(score, efficiency, avgLevel, roundLevel);
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
        <div className="py-8 bg-pink-50 rounded-2xl space-y-3">
          <div className="text-6xl font-bold text-gray-800 mb-2">
            {score} <span className="text-2xl text-gray-400">/ {words.length}</span>
          </div>
          <div className="inline-block px-4 py-1 bg-white text-pink-700 rounded-full font-bold shadow-sm border border-pink-100">
            {efficiency}% de Eficiencia
          </div>
          <div className="text-sm text-gray-600">
            Nivel jugado: <span className="font-bold text-purple-600">{roundLevel}</span>
          </div>
          {nextLevelPreview !== null && nextLevelPreview !== roundLevel && (
            <div className="text-sm font-semibold text-purple-700">
              Próxima ronda: nivel {nextLevelPreview}
            </div>
          )}
          {nextLevelPreview !== null && nextLevelPreview === roundLevel && (
            <div className="text-sm text-gray-500">
              Próxima ronda: nivel {nextLevelPreview} (sin cambios)
            </div>
          )}
        </div>
        <Button onClick={onBack} size="lg" className="w-full">
          Volver al Dashboard
        </Button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  if (!currentWord) return null;
  const isCorrectType = currentWord.type === selectedType;
  const isCorrectTilde = currentWord.hasTilde === selectedTilde;

  return (
    <>
      {/* Toast de cambio de nivel — fixed, no afecta el layout */}
      {levelChangeMessage && (
        <div className="fixed top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div
            className={`animate-toast-in px-5 py-2.5 rounded-full shadow-xl font-bold text-sm text-white flex items-center gap-2 whitespace-nowrap ${
              levelChangeMessage.startsWith('Sub') ? 'bg-purple-500' : 'bg-orange-400'
            }`}
          >
            {levelChangeMessage.startsWith('Sub') ? '⬆️' : '⬇️'} {levelChangeMessage}
          </div>
        </div>
      )}

      {/* Contenedor principal: ocupa exactamente el espacio disponible sin scroll */}
      <div className="max-w-2xl mx-auto flex flex-col gap-2 md:gap-6 h-[calc(100dvh-7rem)] md:h-auto">
        {/* Card de la palabra — flex-1: crece para llenar el espacio restante */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl border-4 border-white ring-4 ring-pink-50 overflow-hidden transition-all">
          {/* Header de la card */}
          <div className="flex justify-between items-center px-4 md:px-6 pt-3 md:pt-5 shrink-0">
            <span className="text-xs md:text-sm font-bold text-gray-400 whitespace-nowrap">
              {currentIndex + 1} / {words.length}
            </span>
            <span className="bg-yellow-100 text-yellow-700 px-2 md:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap">
              <span>⚡</span> Nivel {currentWord.difficulty}
            </span>
          </div>

          {/* Contenido centrado verticalmente */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-5 md:px-12 py-2 md:py-6">
            <BlackCat
              mood={catMood}
              size="w-20 h-20 md:w-32 md:h-32"
              className="mb-2 md:mb-4 shrink-0"
            />
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-gray-800 mb-1 md:mb-3 tracking-tight">
              {showResult ? currentWord.correctWord : currentWord.displayWord}
            </h2>
            <p className="text-gray-400 text-xs md:text-sm font-medium uppercase tracking-widest">
              ¿Qué tipo de palabra es?
            </p>
          </div>
        </div>

        {/* Sección interactiva — shrink-0: tamaño fijo */}
        <div className="shrink-0 flex flex-col gap-2 md:gap-4">
          {!showResult ? (
            <>
              <div className="bg-white/50 backdrop-blur-sm p-3 md:p-4 rounded-3xl animate-fade-in-up">
                <h3 className="font-bold text-gray-700 mb-2 ml-2 text-sm md:text-base">
                  1. Clasificación
                </h3>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[WordType.Aguda, WordType.Grave, WordType.Esdrujula].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-2.5 md:p-4 rounded-2xl border-b-4 font-bold text-sm transition-all active:scale-95 ${
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

              <div className="bg-white/50 backdrop-blur-sm p-3 md:p-4 rounded-3xl">
                <h3 className="font-bold text-gray-700 mb-2 ml-2 text-sm md:text-base">
                  2. Acentuación gráfica
                </h3>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedTilde(true)}
                    className={`p-2.5 md:p-4 rounded-2xl border-b-4 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      selectedTilde === true
                        ? 'border-green-600 bg-green-500 text-white shadow-lg translate-y-[-2px]'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-green-200'
                    }`}
                  >
                    <span>✏️</span> Con Tilde
                  </button>
                  <button
                    onClick={() => setSelectedTilde(false)}
                    className={`p-2.5 md:p-4 rounded-2xl border-b-4 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
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
                className="w-full py-2.5 md:py-4 text-base md:text-xl shadow-xl shadow-pink-200/50"
                size="lg"
              >
                ¡Comprobar!
              </Button>
            </>
          ) : (
            <div className="bg-white p-3 md:p-6 rounded-3xl border-4 border-pink-100 animate-fade-in flex flex-col gap-3 md:gap-4 shadow-xl">
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div
                  className={`p-3 md:p-4 rounded-2xl text-center border-2 ${isCorrectType ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                >
                  <div className="font-bold text-xs uppercase opacity-60 mb-1">Tipo</div>
                  <div className="text-lg md:text-xl font-bold mb-1">
                    {isCorrectType ? '✅ ¡Bien!' : '❌ Ops'}
                  </div>
                  <div className="text-xs md:text-sm font-medium">Es {currentWord.type}</div>
                </div>
                <div
                  className={`p-3 md:p-4 rounded-2xl text-center border-2 ${isCorrectTilde ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                >
                  <div className="font-bold text-xs uppercase opacity-60 mb-1">Tilde</div>
                  <div className="text-lg md:text-xl font-bold mb-1">
                    {isCorrectTilde ? '✅ ¡Bien!' : '❌ Ops'}
                  </div>
                  <div className="text-xs md:text-sm font-medium">
                    {currentWord.hasTilde ? 'Lleva tilde' : 'No lleva'}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 md:p-4 rounded-2xl text-blue-900 text-xs md:text-sm flex gap-2 md:gap-3 items-start">
                <span className="text-base md:text-xl shrink-0">💡</span>
                <div>
                  <strong className="block mb-0.5 text-blue-700">Explicación:</strong>
                  <span className="line-clamp-3 md:line-clamp-none">{currentWord.explanation}</span>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full" size="lg">
                Siguiente Palabra ➡
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Game;
