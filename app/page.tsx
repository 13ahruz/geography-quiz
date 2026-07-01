'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Flag,
  DollarSign,
  MapPin,
  Settings,
  Play,
  RotateCcw,
  Zap,
  Flame,
  ChevronRight,
  Check,
  X,
  Clock,
  Award,
  Lightbulb,
  Palette,
  User,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Geography Types ──────────────────────────────────────────────────────────
interface Country {
  name: {
    common: string;
    official: string;
  };
  capital?: string[];
  flags: {
    svg: string;
    png: string;
  };
  population?: number;
  currencies?: Record<string, { name: string; symbol: string }>;
  region?: string;
  cca2?: string;
  latlng?: [number, number];
}

interface CountrySourceItem {
  name?: { common?: string; official?: string } | string;
  capital?: string[] | string;
  flags?: { svg?: string; png?: string };
  population?: number;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  region?: string;
  cca2?: string;
  latlng?: [number, number];
}

// ─── Painting Types ───────────────────────────────────────────────────────────
interface Painting {
  id: string;
  title: string;
  creator: string;
  url: string;
  year: number;
  movement: string;
}

type PaintingQuestionSubType = 'image-to-painter' | 'image-to-title' | 'painter-to-title' | 'title-to-image';

interface PaintingQuestion {
  id: string;
  subType: PaintingQuestionSubType;
  painting: Painting;
  question: string;
  correctAnswer: string;
  options: string[];           // text options (for non-image types)
  imageOptions?: Painting[];   // image options for title-to-image
  userAnswer?: string;
  isCorrect?: boolean;
  revealed?: boolean;
  hint?: string;
}

// ─── Shared Quiz Types ────────────────────────────────────────────────────────
interface QuizSettings {
  categories: string[];
  levels: Level[];
  questionCount: number;
  timePerQuestion: number;
  questionType: 'multiple' | 'openended' | 'map';
}

type Level = 'easy' | 'medium' | 'hard';

interface Question {
  id: string;
  type: 'capital' | 'flag' | 'currency' | 'location';
  country: Country;
  question: string;
  correctAnswer: string;
  options?: string[];
  userAnswer?: string;
  isCorrect?: boolean;
  revealed?: boolean;
  hint?: string;
}

interface QuizStats {
  score: number;
  totalQuestions: number;
  streak: number;
  maxStreak: number;
  timeSpent: number;
  mistakes: (Question | PaintingQuestion)[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUESTION_TYPES = [
  { id: 'capital', label: 'Capitals', icon: MapPin },
  { id: 'flag', label: 'Flags', icon: Flag },
  { id: 'currency', label: 'Currencies', icon: DollarSign },
  { id: 'location', label: 'Locations', icon: Globe },
];

const PAINTING_QUESTION_TYPES: Array<{ id: PaintingQuestionSubType; label: string; description: string; icon: React.ElementType }> = [
  { id: 'image-to-painter', label: 'Guess the Painter', description: 'See a painting, name the artist', icon: User },
  { id: 'image-to-title', label: 'Guess the Title', description: 'See a painting, name the artwork', icon: BookOpen },
  { id: 'title-to-image', label: 'Identify the Painting', description: 'Read the title, find the image', icon: ImageIcon },
  { id: 'painter-to-title', label: "Painter's Works", description: 'Read the artist, name their painting', icon: Palette },
];

const WORLD_REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Antarctic'];

const LEVELS: Array<{ id: Level; label: string; description: string }> = [
  { id: 'easy', label: 'Easy', description: 'Well-known countries like USA, Germany, Netherlands' },
  { id: 'medium', label: 'Medium', description: 'Balanced mix of familiar and less common countries' },
  { id: 'hard', label: 'Hard', description: 'Smaller, remote, or island countries' },
];

const EASY_COUNTRY_NAMES = new Set([
  'united states', 'united states of america', 'usa', 'canada', 'mexico',
  'brazil', 'argentina', 'chile', 'peru', 'colombia', 'germany', 'netherlands',
  'france', 'spain', 'italy', 'united kingdom', 'uk', 'england', 'japan',
  'china', 'india', 'australia', 'new zealand', 'south africa', 'turkey', 'russia',
]);

const HARD_COUNTRY_NAMES = new Set([
  'aruba', 'french southern and antarctic lands', 'french southern territories',
  'bermuda', 'maldives', 'seychelles', 'fiji', 'bahamas', 'barbados', 'cape verde',
  'grenada', 'samoa', 'tonga', 'palau', 'kiribati', 'tuvalu', 'nauru', 'micronesia',
  'guam', 'puerto rico', 'greenland', 'hong kong', 'macau', 'gibraltar', 'faroe islands',
  'cayman islands', 'turks and caicos islands', 'british virgin islands', 'u.s. virgin islands',
  'us virgin islands', 'cook islands', 'marshall islands', 'solomon islands', 'new caledonia',
  'saint helena', 'falkland islands', 'vatican city', 'monaco', 'san marino', 'liechtenstein',
  'andorra', 'luxembourg', 'brunei', 'comoros', 'dominica', 'sao tome and principe',
]);

function getCountryLevel(country: Country): Level {
  const population = country.population || 0;
  const region = country.region || '';
  const name = country.name.common.toLowerCase();
  const official = country.name.official.toLowerCase();
  const isIslandOrTerritory =
    /island|islands|isle|atoll|archipelago|territor(y|ies)|lands|southern|antarctic|overseas/.test(name) ||
    /island|islands|isle|atoll|archipelago|territor(y|ies)|lands|southern|antarctic|overseas/.test(official) ||
    HARD_COUNTRY_NAMES.has(name) || HARD_COUNTRY_NAMES.has(official);

  if (isIslandOrTerritory || region === 'Oceania' || region === 'Antarctic' || population < 2_000_000) return 'hard';
  if (EASY_COUNTRY_NAMES.has(name) || EASY_COUNTRY_NAMES.has(official)) return 'easy';
  if (population >= 20_000_000) return 'easy';
  if (population >= 2_000_000) return 'medium';
  return 'hard';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeographyQuiz() {
  // Mode: geography or paintings
  const [quizMode, setQuizMode] = useState<'geography' | 'paintings'>('geography');

  // Shared state
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [usedLifelines, setUsedLifelines] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [funFactText, setFunFactText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stats, setStats] = useState<QuizStats>({
    score: 0, totalQuestions: 0, streak: 0, maxStreak: 0, timeSpent: 0, mistakes: [],
  });

  // Geography state
  const [countries, setCountries] = useState<Country[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({
    categories: ['capital'],
    levels: ['easy', 'medium', 'hard'],
    questionCount: 10,
    timePerQuestion: 30,
    questionType: 'multiple',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Paintings state
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [paintingSettings, setPaintingSettings] = useState({
    subtypes: ['image-to-painter', 'image-to-title', 'title-to-image', 'painter-to-title'] as PaintingQuestionSubType[],
    questionCount: 10,
    timePerQuestion: 30,
  });
  const [paintingQuestions, setPaintingQuestions] = useState<PaintingQuestion[]>([]);
  const [currentPaintingIndex, setCurrentPaintingIndex] = useState(0);

  // ─── Fetch Countries ────────────────────────────────────────────────────────
  useEffect(() => {
    const normalizeCountry = (item: CountrySourceItem): Country | null => {
      const cca2 = String(item?.cca2 || '').toUpperCase();
      const commonName = typeof item?.name === 'string'
        ? item.name : item?.name?.common || item?.name?.official || '';
      if (!cca2 || !commonName) return null;
      const officialName = typeof item?.name === 'string'
        ? item.name : item?.name?.official || commonName;
      const currencies = item?.currencies
        ? Object.fromEntries(Object.entries(item.currencies).map(([code, currency]) =>
            [code, { name: currency?.name || code, symbol: currency?.symbol || '' }]))
        : undefined;
      const svgFlag = item?.flags?.svg || (cca2 ? `https://flagcdn.com/${cca2.toLowerCase()}.svg` : '');
      const pngFlag = item?.flags?.png || (cca2 ? `https://flagcdn.com/w320/${cca2.toLowerCase()}.png` : '');
      return {
        name: { common: commonName, official: officialName },
        capital: Array.isArray(item?.capital) ? item.capital : item?.capital ? [item.capital] : [],
        flags: { svg: svgFlag, png: pngFlag },
        population: item?.population,
        currencies,
        region: item?.region,
        cca2,
        latlng: item?.latlng,
      };
    };

    const readCachedCountries = (): Country[] | null => {
      try {
        const cached = window.localStorage.getItem('geography-quiz-countries');
        if (!cached) return null;
        const parsed = JSON.parse(cached) as Country[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch { return null; }
    };

    const writeCachedCountries = (value: Country[]) => {
      try { window.localStorage.setItem('geography-quiz-countries', JSON.stringify(value)); } catch { /* ignore */ }
    };

    const fetchAll = async () => {
      setIsLoading(true);
      setLoadError(null);

      // Fetch countries
      const sources = [
        'https://restcountries.com/v3.1/all?fields=name,capital,flags,population,currencies,region,cca2,latlng',
        'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
      ];
      try {
        const cachedCountries = readCachedCountries();
        if (cachedCountries) {
          setCountries(cachedCountries);
        } else {
          const results = await Promise.allSettled(
            sources.map(async (source) => {
              const response = await fetch(source);
              if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
              const data = await response.json();
              return (Array.isArray(data) ? data : [])
                .map(normalizeCountry)
                .filter((c): c is Country => Boolean(c));
            })
          );
          const successfulCountries = results
            .find((r): r is PromiseFulfilledResult<Country[]> => r.status === 'fulfilled' && r.value.length > 0)
            ?.value;
          if (successfulCountries && successfulCountries.length > 0) {
            setCountries(successfulCountries);
            writeCachedCountries(successfulCountries);
          } else {
            throw new Error('All country data sources failed');
          }
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        setLoadError('Unable to load world country data. Please check your internet connection and try again.');
      }

      // Fetch paintings
      try {
        const res = await fetch('/api/paintings');
        const data = await res.json() as { results: Painting[] };
        if (data.results && data.results.length > 0) {
          setPaintings(data.results);
        }
      } catch (error) {
        console.error('Failed to fetch paintings:', error);
      }

      setIsLoading(false);
    };

    fetchAll();
  }, [reloadKey]);

  // ─── Generate Geography Questions ───────────────────────────────────────────
  const generateQuestions = useCallback(() => {
    const shuffled = [...countries].sort(() => Math.random() - 0.5);
    const allowedLevels = settings.levels.length > 0 ? settings.levels : ['easy', 'medium', 'hard'];
    const filteredCountries = shuffled.filter(c => allowedLevels.includes(getCountryLevel(c)));
    const selectedCountries = (filteredCountries.length > 0 ? filteredCountries : shuffled).slice(0, settings.questionCount);
    const newQuestions: Question[] = [];

    selectedCountries.forEach((country) => {
      const category = settings.categories[Math.floor(Math.random() * settings.categories.length)] as string;
      let question: Question | null = null;

      switch (category) {
        case 'capital':
          question = {
            id: `q-${country.cca2}-capital-${Math.random()}`,
            type: 'capital', country,
            question: `What is the capital of ${country.name.common}?`,
            correctAnswer: country.capital?.[0] || 'N/A',
            hint: `Located in ${country.region}`,
          };
          break;
        case 'flag':
          question = {
            id: `q-${country.cca2}-flag-${Math.random()}`,
            type: 'flag', country,
            question: `Which country does this flag belong to?`,
            correctAnswer: country.name.common,
            hint: `This country is in ${country.region}`,
          };
          break;
        case 'currency':
          const currencyName = Object.values(country.currencies || {})[0]?.name || 'N/A';
          question = {
            id: `q-${country.cca2}-currency-${Math.random()}`,
            type: 'currency', country,
            question: `What is the primary currency of ${country.name.common}?`,
            correctAnswer: currencyName,
            hint: `Used in ${country.region}`,
          };
          break;
        case 'location':
          question = {
            id: `q-${country.cca2}-location-${Math.random()}`,
            type: 'location', country,
            question: `${country.name.common} is located in which region?`,
            correctAnswer: country.region || 'N/A',
            hint: `Think about the continent`,
          };
          break;
      }

      if (question) {
        if (settings.questionType === 'multiple') {
          const correctOption = question.correctAnswer;
          let options = [correctOption];
          if (question.type === 'capital') {
            options = [...options, ...shuffled.filter(c => c.name.common !== country.name.common).slice(0, 3).map(c => c.capital?.[0] || 'Unknown')];
          } else if (question.type === 'flag') {
            options = [...options, ...shuffled.filter(c => c.name.common !== country.name.common).slice(0, 3).map(c => c.name.common)];
          } else if (question.type === 'currency') {
            const uniqueCurrencyNames = Array.from(new Set(
              countries.flatMap(c => Object.values(c.currencies || {}).map(cur => cur?.name).filter(Boolean))
                .filter((n): n is string => Boolean(n) && n !== correctOption)
            )).sort(() => Math.random() - 0.5).slice(0, 3);
            options = [correctOption, ...uniqueCurrencyNames];
            while (options.length < 4) options.push(`Unknown Currency ${options.length}`);
          } else if (question.type === 'location') {
            const wrongRegions = WORLD_REGIONS.filter(r => r !== correctOption).sort(() => Math.random() - 0.5).slice(0, 3);
            options = [correctOption, ...wrongRegions];
          }
          question.options = Array.from(new Set(options)).sort(() => Math.random() - 0.5);
        }
        newQuestions.push(question);
      }
    });

    setQuestions(newQuestions);
    resetStats(newQuestions.length);
  }, [countries, settings]);

  // ─── Generate Painting Questions ────────────────────────────────────────────
  const generatePaintingQuestions = useCallback(() => {
    if (paintings.length < 4) return;
    const shuffled = [...paintings].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, paintingSettings.questionCount);
    const newQuestions: PaintingQuestion[] = [];

    selected.forEach((painting) => {
      const subTypes = paintingSettings.subtypes.length > 0 ? paintingSettings.subtypes : ['image-to-painter'] as PaintingQuestionSubType[];
      const subType = subTypes[Math.floor(Math.random() * subTypes.length)];

      // Get 3 decoys (different paintings)
      const decoys = shuffled.filter(p => p.id !== painting.id).slice(0, 10).sort(() => Math.random() - 0.5);

      let q: PaintingQuestion;

      if (subType === 'image-to-painter') {
        const wrongPainters = Array.from(new Set(decoys.map(p => p.creator).filter(c => c !== painting.creator))).slice(0, 3);
        const options = [painting.creator, ...wrongPainters].sort(() => Math.random() - 0.5);
        q = {
          id: `pq-${painting.id}-${Math.random()}`,
          subType, painting,
          question: `Who painted this masterpiece?`,
          correctAnswer: painting.creator,
          options,
          hint: `This artwork is from the ${painting.movement} movement (${painting.year})`,
        };
      } else if (subType === 'image-to-title') {
        const wrongTitles = decoys.map(p => p.title).filter(t => t !== painting.title).slice(0, 3);
        const options = [painting.title, ...wrongTitles].sort(() => Math.random() - 0.5);
        q = {
          id: `pq-${painting.id}-${Math.random()}`,
          subType, painting,
          question: `What is the title of this painting?`,
          correctAnswer: painting.title,
          options,
          hint: `Painted by ${painting.creator} in ${painting.year}`,
        };
      } else if (subType === 'painter-to-title') {
        const wrongTitles = decoys.map(p => p.title).filter(t => t !== painting.title).slice(0, 3);
        const options = [painting.title, ...wrongTitles].sort(() => Math.random() - 0.5);
        q = {
          id: `pq-${painting.id}-${Math.random()}`,
          subType, painting,
          question: `Which of these paintings was created by ${painting.creator}?`,
          correctAnswer: painting.title,
          options,
          hint: `This work is from the ${painting.movement} movement`,
        };
      } else {
        // title-to-image: pick 3 image decoys
        const imageDecoys = decoys.slice(0, 3);
        const allImageOptions = [painting, ...imageDecoys].sort(() => Math.random() - 0.5);
        q = {
          id: `pq-${painting.id}-${Math.random()}`,
          subType, painting,
          question: `Which image shows "${painting.title}"?`,
          correctAnswer: painting.id,
          options: allImageOptions.map(p => p.id),
          imageOptions: allImageOptions,
          hint: `Painted by ${painting.creator} in ${painting.year}`,
        };
      }

      newQuestions.push(q);
    });

    setPaintingQuestions(newQuestions);
    resetStats(newQuestions.length);
  }, [paintings, paintingSettings]);

  const resetStats = (total: number) => {
    setStats({ score: 0, totalQuestions: total, streak: 0, maxStreak: 0, timeSpent: 0, mistakes: [] });
    setCurrentQuestionIndex(0);
    setCurrentPaintingIndex(0);
    setTimeLeft(quizMode === 'geography' ? settings.timePerQuestion : paintingSettings.timePerQuestion);
    setUsedLifelines(new Set());
    setShowFeedback(null);
    setSelectedOption(null);
    setFunFactText('');
  };

  // ─── Geography Fun Fact ──────────────────────────────────────────────────────
  function generateFunFact(country: Country, questionType: Question['type']): string {
    const currencyName = Object.values(country.currencies || {})[0]?.name || 'N/A';
    const factsByType: Record<Question['type'], string[]> = {
      capital: [
        `${country.name.common}'s capital is ${country.capital?.[0] || 'N/A'}.`,
        `${country.name.common} is part of the ${country.region || 'unknown'} region.`,
        `${country.name.common} uses the ${currencyName} as currency.`,
      ],
      flag: [
        `${country.name.common} is located in ${country.region || 'an unknown'} region.`,
        `${country.name.common} has the capital ${country.capital?.[0] || 'N/A'}.`,
        `${country.name.common} uses the ${currencyName} as currency.`,
      ],
      currency: [
        `${country.name.common} is home to ${country.capital?.[0] || 'its capital city'}.`,
        `${country.name.common} is located in ${country.region || 'an unknown'} region.`,
        `${country.name.common} has a population of ${country.population?.toLocaleString() || 'N/A'} people.`,
      ],
      location: [
        `${country.name.common} has the capital ${country.capital?.[0] || 'N/A'}.`,
        `${country.name.common} uses the ${currencyName} as currency.`,
        `${country.name.common} has a population of ${country.population?.toLocaleString() || 'N/A'} people.`,
      ],
    };
    const facts = factsByType[questionType];
    return facts[Math.floor(Math.random() * facts.length)];
  }

  // ─── Painting Fun Fact ───────────────────────────────────────────────────────
  function generatePaintingFunFact(painting: Painting): string {
    const facts = [
      `"${painting.title}" was painted by ${painting.creator} in ${painting.year}.`,
      `${painting.creator} was a master of the ${painting.movement} movement.`,
      `This work, "${painting.title}", was created in ${painting.year} during the ${painting.movement} era.`,
    ];
    return facts[Math.floor(Math.random() * facts.length)];
  }

  // ─── Handle Geography Answer ─────────────────────────────────────────────────
  const handleAnswer = useCallback((answer: string) => {
    if (showFeedback) return;
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
    setSelectedOption(answer);
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    const updatedQuestion = { ...currentQuestion, userAnswer: answer, isCorrect };
    const newQuestions = [...questions];
    newQuestions[currentQuestionIndex] = updatedQuestion;
    setQuestions(newQuestions);
    if (isCorrect) {
      const newStreak = stats.streak + 1;
      setStats(prev => ({
        ...prev,
        score: prev.score + (10 - Math.abs(Math.floor(timeLeft - settings.timePerQuestion / 2) / 10)),
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      }));
      setFunFactText(generateFunFact(currentQuestion.country, currentQuestion.type));
    } else {
      setStats(prev => ({ ...prev, streak: 0, mistakes: [...prev.mistakes, updatedQuestion] }));
    }
  }, [questions, currentQuestionIndex, showFeedback, stats, settings.timePerQuestion, timeLeft]);

  // ─── Handle Painting Answer ──────────────────────────────────────────────────
  const handlePaintingAnswer = useCallback((answer: string) => {
    if (showFeedback) return;
    const currentQ = paintingQuestions[currentPaintingIndex];
    const isCorrect = answer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    setSelectedOption(answer);
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    const updatedQ = { ...currentQ, userAnswer: answer, isCorrect };
    const newQuestions = [...paintingQuestions];
    newQuestions[currentPaintingIndex] = updatedQ;
    setPaintingQuestions(newQuestions);
    if (isCorrect) {
      const newStreak = stats.streak + 1;
      setStats(prev => ({
        ...prev,
        score: prev.score + (10 - Math.abs(Math.floor(timeLeft - paintingSettings.timePerQuestion / 2) / 10)),
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak, newStreak),
      }));
      setFunFactText(generatePaintingFunFact(currentQ.painting));
    } else {
      setStats(prev => ({ ...prev, streak: 0, mistakes: [...prev.mistakes, updatedQ] }));
    }
  }, [paintingQuestions, currentPaintingIndex, showFeedback, stats, paintingSettings.timePerQuestion, timeLeft]);

  // ─── Handle Next Question ────────────────────────────────────────────────────
  const handleNextQuestion = useCallback(() => {
    const isGeography = quizMode === 'geography';
    const total = isGeography ? questions.length : paintingQuestions.length;
    const current = isGeography ? currentQuestionIndex : currentPaintingIndex;
    const timePerQ = isGeography ? settings.timePerQuestion : paintingSettings.timePerQuestion;

    if (current < total - 1) {
      if (isGeography) setCurrentQuestionIndex(prev => prev + 1);
      else setCurrentPaintingIndex(prev => prev + 1);
      setTimeLeft(timePerQ);
      setShowFeedback(null);
      setSelectedOption(null);
      setFunFactText('');
      setUsedLifelines(new Set());
    } else {
      setGameState('results');
    }
  }, [quizMode, questions.length, paintingQuestions.length, currentQuestionIndex, currentPaintingIndex, settings.timePerQuestion, paintingSettings.timePerQuestion]);

  const returnToMainMenu = useCallback(() => {
    setGameState('setup');
    setQuestions([]);
    setPaintingQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentPaintingIndex(0);
    setStats({ score: 0, totalQuestions: 0, streak: 0, maxStreak: 0, timeSpent: 0, mistakes: [] });
    setTimeLeft(0);
    setUsedLifelines(new Set());
    setShowFeedback(null);
    setFunFactText('');
    setSelectedOption(null);
  }, []);

  // ─── Timer ───────────────────────────────────────────────────────────────────
  const timePerQ = quizMode === 'geography' ? settings.timePerQuestion : paintingSettings.timePerQuestion;
  useEffect(() => {
    if (gameState !== 'playing' || !timePerQ || showFeedback) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setShowFeedback('incorrect'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, timePerQ, showFeedback]);

  // ─── Lifelines ───────────────────────────────────────────────────────────────
  const useLifeline50 = () => {
    if (showFeedback || selectedOption !== null || usedLifelines.has('50:50')) return;
    if (quizMode === 'geography') {
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion?.options) return;
      const correctAnswer = currentQuestion.correctAnswer;
      const wrongOptions = currentQuestion.options.filter(opt => opt !== correctAnswer);
      const toRemove = wrongOptions.slice(0, 2);
      const remainingOptions = currentQuestion.options.filter(opt => !toRemove.includes(opt));
      const newQuestions = [...questions];
      newQuestions[currentQuestionIndex] = { ...currentQuestion, options: remainingOptions };
      setQuestions(newQuestions);
    } else {
      const currentQ = paintingQuestions[currentPaintingIndex];
      if (!currentQ?.options) return;
      if (currentQ.subType === 'title-to-image') {
        const wrong = currentQ.options.filter(o => o !== currentQ.correctAnswer);
        const toRemove = wrong.slice(0, 2);
        const remaining = currentQ.options.filter(o => !toRemove.includes(o));
        const newQs = [...paintingQuestions];
        newQs[currentPaintingIndex] = {
          ...currentQ,
          options: remaining,
          imageOptions: currentQ.imageOptions?.filter(p => !toRemove.includes(p.id)),
        };
        setPaintingQuestions(newQs);
      } else {
        const wrong = currentQ.options.filter(o => o !== currentQ.correctAnswer);
        const toRemove = wrong.slice(0, 2);
        const remaining = currentQ.options.filter(o => !toRemove.includes(o));
        const newQs = [...paintingQuestions];
        newQs[currentPaintingIndex] = { ...currentQ, options: remaining };
        setPaintingQuestions(newQs);
      }
    }
    setUsedLifelines(prev => new Set(prev).add('50:50'));
  };

  const useHintLifeline = () => {
    if (showFeedback || selectedOption !== null || usedLifelines.has('hint')) return;
    if (quizMode === 'geography') {
      const currentQuestion = questions[currentQuestionIndex];
      const newQuestions = [...questions];
      newQuestions[currentQuestionIndex] = { ...currentQuestion, revealed: true };
      setQuestions(newQuestions);
    } else {
      const currentQ = paintingQuestions[currentPaintingIndex];
      const newQs = [...paintingQuestions];
      newQs[currentPaintingIndex] = { ...currentQ, revealed: true };
      setPaintingQuestions(newQs);
    }
    setUsedLifelines(prev => new Set(prev).add('hint'));
  };

  // ─── Performance Badge ───────────────────────────────────────────────────────
  const getPerformanceBadge = (): { label: string; icon: React.ReactNode; color: string } => {
    const accuracy = (stats.score / (stats.totalQuestions * 100)) * 100;
    if (quizMode === 'paintings') {
      if (accuracy >= 90) return { label: 'Art Connoisseur', icon: <Palette className="w-8 h-8" />, color: 'text-yellow-400' };
      if (accuracy >= 70) return { label: 'Gallery Expert', icon: <ImageIcon className="w-8 h-8" />, color: 'text-purple-400' };
      if (accuracy >= 50) return { label: 'Museum Visitor', icon: <BookOpen className="w-8 h-8" />, color: 'text-blue-400' };
      return { label: 'Art Student', icon: <Palette className="w-8 h-8" />, color: 'text-slate-400' };
    }
    if (accuracy >= 90) return { label: 'Global Master', icon: <Globe className="w-8 h-8" />, color: 'text-yellow-400' };
    if (accuracy >= 70) return { label: 'Navigator', icon: <MapPin className="w-8 h-8" />, color: 'text-blue-400' };
    if (accuracy >= 50) return { label: 'Explorer', icon: <Flag className="w-8 h-8" />, color: 'text-green-400' };
    return { label: 'Traveler', icon: <Globe className="w-8 h-8" />, color: 'text-gray-400' };
  };

  // ─── SETUP SCREEN ────────────────────────────────────────────────────────────
  if (gameState === 'setup') {
    return (
      <motion.div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center gap-3 mb-4"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                  <Globe className="w-10 h-10 text-emerald-400" />
                </motion.div>
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Palette className="w-10 h-10 text-purple-400" />
                </motion.div>
              </motion.div>
              <h1 className="text-4xl font-bold text-white mb-2">Knowledge Quiz</h1>
              <p className="text-slate-400">Master geography & art — one question at a time</p>
            </div>

            {/* Mode Selector */}
            <div className="mb-8">
              <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                Choose Your Quiz Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  id="mode-geography"
                  onClick={() => setQuizMode('geography')}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden ${
                    quizMode === 'geography'
                      ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {quizMode === 'geography' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                  <Globe className="w-7 h-7 mb-2" />
                  <div className="font-bold text-base">🌍 Geography Quiz</div>
                  <div className="text-xs opacity-80 mt-1">Capitals, Flags, Currencies & Regions</div>
                </motion.button>

                <motion.button
                  id="mode-paintings"
                  onClick={() => setQuizMode('paintings')}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left overflow-hidden ${
                    quizMode === 'paintings'
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {quizMode === 'paintings' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                  <Palette className="w-7 h-7 mb-2" />
                  <div className="font-bold text-base">🎨 Art & Paintings</div>
                  <div className="text-xs opacity-80 mt-1">Famous masterpieces & their creators</div>
                </motion.button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                  <Zap className={`w-8 h-8 mx-auto ${quizMode === 'paintings' ? 'text-purple-400' : 'text-emerald-400'}`} />
                </motion.div>
                <p className="text-slate-300 mt-4">Loading quiz data...</p>
              </div>
            ) : loadError && quizMode === 'geography' ? (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
                  <X className="w-8 h-8 text-rose-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Country data unavailable</p>
                  <p className="mx-auto mt-2 max-w-md text-slate-300">{loadError}</p>
                </div>
                <button
                  onClick={() => setReloadKey(prev => prev + 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {quizMode === 'geography' ? (
                  <motion.div
                    key="geo-settings"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Categories */}
                    <div>
                      <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                        <Settings className="w-5 h-5 text-emerald-400" />
                        Quiz Categories
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {QUESTION_TYPES.map(qtype => {
                          const Icon = qtype.icon;
                          return (
                            <motion.button
                              key={qtype.id}
                              id={`cat-${qtype.id}`}
                              onClick={() => {
                                setSettings(prev => {
                                  const newCategories = prev.categories.includes(qtype.id)
                                    ? prev.categories.filter(c => c !== qtype.id)
                                    : [...prev.categories, qtype.id];
                                  return { ...prev, categories: newCategories.length ? newCategories : prev.categories };
                                });
                              }}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                settings.categories.includes(qtype.id)
                                  ? 'bg-emerald-500 border-emerald-400 text-white'
                                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Icon className="w-5 h-5 mx-auto mb-1" />
                              <div className="text-xs font-medium">{qtype.label}</div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Level Filter */}
                    <div>
                      <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                        <Flame className="w-5 h-5 text-emerald-400" />
                        Difficulty Levels
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {LEVELS.map(level => (
                          <motion.button
                            key={level.id}
                            id={`level-${level.id}`}
                            onClick={() => {
                              setSettings(prev => {
                                const nextLevels = prev.levels.includes(level.id)
                                  ? prev.levels.filter(item => item !== level.id)
                                  : [...prev.levels, level.id];
                                return { ...prev, levels: nextLevels.length ? nextLevels : prev.levels };
                              });
                            }}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              settings.levels.includes(level.id)
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="font-semibold">{level.label}</div>
                            <div className="text-xs opacity-80 mt-1">{level.description}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Question Count */}
                    <div>
                      <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                        <Globe className="w-5 h-5 text-emerald-400" />
                        Number of Questions
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {[10, 20, 50, 100].map(count => (
                          <motion.button
                            key={count}
                            id={`count-${count}`}
                            onClick={() => setSettings(prev => ({ ...prev, questionCount: count }))}
                            className={`p-3 rounded-lg border-2 font-medium transition-all ${
                              settings.questionCount === count
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {count}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Time Per Question */}
                    <div>
                      <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        Time Per Question
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {[15, 30, 60, 0].map(time => (
                          <motion.button
                            key={time}
                            id={`time-${time}`}
                            onClick={() => setSettings(prev => ({ ...prev, timePerQuestion: time }))}
                            className={`p-3 rounded-lg border-2 font-medium transition-all ${
                              settings.timePerQuestion === time
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {time === 0 ? 'No Timer' : `${time}s`}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-400" />
                        Question Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'multiple', label: 'Multiple Choice (4 Options)' },
                          { value: 'openended', label: 'Open-Ended (Text Input)' },
                        ].map(type => (
                          <motion.button
                            key={type.value}
                            id={`qtype-${type.value}`}
                            onClick={() => setSettings(prev => ({ ...prev, questionType: type.value as 'multiple' | 'openended' }))}
                            className={`p-3 rounded-lg border-2 font-medium transition-all text-sm ${
                              settings.questionType === type.value
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {type.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      id="start-geo-quiz"
                      onClick={() => { generateQuestions(); setGameState('playing'); }}
                      disabled={countries.length === 0}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={countries.length > 0 ? { scale: 1.02 } : {}}
                      whileTap={countries.length > 0 ? { scale: 0.98 } : {}}
                    >
                      <Play className="w-5 h-5" />
                      Start Geography Quiz
                    </motion.button>
                  </motion.div>
                ) : (
                  // ─── Paintings Settings ───────────────────────────────────────
                  <motion.div
                    key="art-settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {paintings.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Loading painting data...</p>
                      </div>
                    ) : (
                      <>
                        {/* Paintings loaded indicator */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                          <p className="text-purple-300 text-sm">
                            🎨 <span className="font-semibold">{paintings.length} masterpieces</span> from renowned artists loaded
                          </p>
                        </div>

                        {/* Question Sub-Types */}
                        <div>
                          <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" />
                            Question Types
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PAINTING_QUESTION_TYPES.map(qtype => {
                              const Icon = qtype.icon;
                              return (
                                <motion.button
                                  key={qtype.id}
                                  id={`art-qtype-${qtype.id}`}
                                  onClick={() => {
                                    setPaintingSettings(prev => {
                                      const newTypes = prev.subtypes.includes(qtype.id)
                                        ? prev.subtypes.filter(t => t !== qtype.id)
                                        : [...prev.subtypes, qtype.id];
                                      return { ...prev, subtypes: newTypes.length ? newTypes : prev.subtypes };
                                    });
                                  }}
                                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    paintingSettings.subtypes.includes(qtype.id)
                                      ? 'bg-purple-600 border-purple-400 text-white'
                                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                                  }`}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="font-semibold text-sm">{qtype.label}</span>
                                  </div>
                                  <div className="text-xs opacity-75">{qtype.description}</div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Question Count */}
                        <div>
                          <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-purple-400" />
                            Number of Questions
                          </label>
                          <div className="grid grid-cols-4 gap-3">
                            {[5, 10, 20, 30].map(count => (
                              <motion.button
                                key={count}
                                id={`art-count-${count}`}
                                onClick={() => setPaintingSettings(prev => ({ ...prev, questionCount: Math.min(count, paintings.length) }))}
                                className={`p-3 rounded-lg border-2 font-medium transition-all ${
                                  paintingSettings.questionCount === count || (count > paintings.length && paintingSettings.questionCount === paintings.length)
                                    ? 'bg-purple-600 border-purple-400 text-white'
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {count}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Time Per Question */}
                        <div>
                          <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            Time Per Question
                          </label>
                          <div className="grid grid-cols-4 gap-3">
                            {[20, 40, 60, 0].map(time => (
                              <motion.button
                                key={time}
                                id={`art-time-${time}`}
                                onClick={() => setPaintingSettings(prev => ({ ...prev, timePerQuestion: time }))}
                                className={`p-3 rounded-lg border-2 font-medium transition-all ${
                                  paintingSettings.timePerQuestion === time
                                    ? 'bg-purple-600 border-purple-400 text-white'
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {time === 0 ? 'No Timer' : `${time}s`}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        <motion.button
                          id="start-art-quiz"
                          onClick={() => { generatePaintingQuestions(); setGameState('playing'); }}
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Play className="w-5 h-5" />
                          Start Art Quiz
                        </motion.button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ─── PLAYING SCREEN ───────────────────────────────────────────────────────────
  const isGeoMode = quizMode === 'geography';
  const currentGeoQ = questions[currentQuestionIndex];
  const currentArtQ = paintingQuestions[currentPaintingIndex];
  const currentIdx = isGeoMode ? currentQuestionIndex : currentPaintingIndex;
  const totalQs = isGeoMode ? questions.length : paintingQuestions.length;
  const progressPercent = ((currentIdx + 1) / totalQs) * 100;
  const accentColor = isGeoMode ? 'emerald' : 'purple';

  if (gameState === 'playing' && (isGeoMode ? questions.length > 0 : paintingQuestions.length > 0)) {
    return (
      <motion.div className={`min-h-screen bg-gradient-to-br ${isGeoMode ? 'from-slate-950 via-slate-900 to-slate-950' : 'from-slate-950 via-purple-950/20 to-slate-950'} p-4`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: stats.streak > 0 ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700"
                >
                  <Flame className={`w-5 h-5 ${stats.streak > 0 ? 'text-orange-400' : 'text-slate-500'}`} />
                  <span className="text-white font-bold">{stats.streak}</span>
                </motion.div>
                <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700 text-white text-sm">
                  {currentIdx + 1} / {totalQs}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${
                  isGeoMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                }`}>
                  {isGeoMode ? <Globe className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
                  {isGeoMode ? 'Geography' : 'Art & Paintings'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(isGeoMode ? settings.timePerQuestion : paintingSettings.timePerQuestion) > 0 && (
                  <motion.div
                    className={`text-2xl font-bold px-4 py-2 rounded-lg border ${
                      timeLeft <= 5
                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                        : `bg-slate-800/80 border-slate-700 text-${accentColor}-400`
                    }`}
                    animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {timeLeft}s
                  </motion.div>
                )}
                <button
                  onClick={returnToMainMenu}
                  className="rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-white text-sm transition hover:border-slate-500 hover:bg-slate-700 focus:outline-none"
                >
                  ← Menu
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${isGeoMode ? 'bg-gradient-to-r from-emerald-400 to-blue-500' : 'bg-gradient-to-r from-purple-400 to-pink-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`q-${currentIdx}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700 mb-6 overflow-hidden"
            >
              {/* ── Geography Question ── */}
              {isGeoMode && currentGeoQ && (
                <div className="p-8">
                  {currentGeoQ.type === 'flag' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 text-center">
                      <div className="inline-block rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-400/30">
                        <Image
                          src={currentGeoQ.country.flags.svg}
                          alt={currentGeoQ.country.name.common}
                          width={320} height={192} unoptimized
                          className="w-full max-w-xs h-48 object-cover"
                        />
                      </div>
                    </motion.div>
                  )}

                  {currentGeoQ.type !== 'flag' && (
                    <div className="mb-5 flex items-center justify-center gap-3 bg-slate-700/50 rounded-xl p-4">
                      <Image
                        src={currentGeoQ.country.flags.svg}
                        alt={currentGeoQ.country.name.common}
                        width={80} height={48} unoptimized
                        className="w-16 h-10 rounded shadow-md object-cover"
                      />
                      <p className="text-white font-semibold">{currentGeoQ.country.name.common}</p>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-white mb-6 text-center">{currentGeoQ.question}</h2>

                  {currentGeoQ.revealed && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="bg-blue-900/50 border border-blue-400/50 rounded-lg p-4 mb-5 text-blue-200 flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                      <p className="text-sm">{currentGeoQ.hint}</p>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    {currentGeoQ.options && settings.questionType === 'multiple' ? (
                      currentGeoQ.options.map((option, index) => (
                        <motion.button
                          key={index}
                          onClick={() => !showFeedback && handleAnswer(option)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 }}
                          disabled={showFeedback !== null}
                          className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                            showFeedback && option === currentGeoQ.userAnswer
                              ? currentGeoQ.isCorrect
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                : 'bg-rose-500/20 border-rose-400 text-rose-200'
                              : showFeedback && option === currentGeoQ.correctAnswer
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                : selectedOption === option
                                  ? 'bg-blue-600/30 border-blue-400 text-white'
                                  : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {showFeedback && option === currentGeoQ.userAnswer
                              ? currentGeoQ.isCorrect ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-rose-400" />
                              : showFeedback && option === currentGeoQ.correctAnswer
                                ? <Check className="w-5 h-5 text-emerald-400" />
                                : null}
                          </div>
                        </motion.button>
                      ))
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={selectedOption || ''}
                          onChange={e => setSelectedOption(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !showFeedback && handleAnswer(selectedOption || '')}
                          placeholder="Type your answer..."
                          className="w-full p-4 rounded-xl border-2 border-slate-600 bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                          disabled={showFeedback !== null}
                        />
                        {!showFeedback && (
                          <motion.button
                            onClick={() => handleAnswer(selectedOption || '')}
                            className="w-full p-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          >
                            Submit Answer
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Art Question ── */}
              {!isGeoMode && currentArtQ && (
                <div>
                  {/* Image display for image-based questions */}
                  {(currentArtQ.subType === 'image-to-painter' || currentArtQ.subType === 'image-to-title') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full bg-slate-900">
                      <div className="relative h-72 md:h-96 w-full flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentArtQ.painting.url}
                          alt="Famous painting"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-800/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </motion.div>
                  )}

                  <div className="p-6 md:p-8">
                    {/* Painter name display for painter-to-title */}
                    {currentArtQ.subType === 'painter-to-title' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="mb-6 flex items-center justify-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <User className="w-6 h-6 text-purple-400 shrink-0" />
                        <span className="text-xl font-bold text-white">{currentArtQ.painting.creator}</span>
                      </motion.div>
                    )}

                    {/* Title display for title-to-image */}
                    {currentArtQ.subType === 'title-to-image' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="mb-6 text-center bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                        <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        <p className="text-slate-400 text-xs mb-1 uppercase tracking-widest">Find this painting</p>
                        <p className="text-xl font-bold text-white">"{currentArtQ.painting.title}"</p>
                      </motion.div>
                    )}

                    <h2 className="text-xl font-bold text-white mb-5 text-center">{currentArtQ.question}</h2>

                    {currentArtQ.revealed && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-blue-900/50 border border-blue-400/50 rounded-lg p-4 mb-5 text-blue-200 flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                        <p className="text-sm">{currentArtQ.hint}</p>
                      </motion.div>
                    )}

                    {/* Image Grid for title-to-image */}
                    {currentArtQ.subType === 'title-to-image' && currentArtQ.imageOptions ? (
                      <div className="grid grid-cols-2 gap-3">
                        {currentArtQ.imageOptions.map((painting, index) => {
                          const isSelected = selectedOption === painting.id;
                          const isCorrect = painting.id === currentArtQ.correctAnswer;
                          const isWrongSelected = showFeedback && isSelected && !isCorrect;
                          const isCorrectHighlight = showFeedback && isCorrect;
                          return (
                            <motion.button
                              key={painting.id}
                              onClick={() => !showFeedback && handlePaintingAnswer(painting.id)}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              disabled={showFeedback !== null}
                              className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/3] ${
                                isWrongSelected
                                  ? 'border-rose-400 ring-2 ring-rose-400/50'
                                  : isCorrectHighlight
                                    ? 'border-emerald-400 ring-2 ring-emerald-400/50'
                                    : isSelected
                                      ? 'border-purple-400 ring-2 ring-purple-400/50'
                                      : 'border-slate-600 hover:border-purple-400/60'
                              }`}
                              whileHover={!showFeedback ? { scale: 1.02 } : {}}
                              whileTap={!showFeedback ? { scale: 0.98 } : {}}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={painting.url}
                                alt={`Option ${index + 1}`}
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-contain bg-slate-950/80"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                              {showFeedback && isCorrectHighlight && (
                                <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {showFeedback && isWrongSelected && (
                                <div className="absolute top-2 right-2 bg-rose-500 rounded-full p-1">
                                  <X className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-slate-300/80 truncate text-center">
                                {showFeedback && isCorrectHighlight ? (
                                  <span className="text-emerald-300 font-medium">{painting.title}</span>
                                ) : null}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Text options for other subtypes */
                      <div className="space-y-3">
                        {currentArtQ.options.map((option, index) => (
                          <motion.button
                            key={index}
                            onClick={() => !showFeedback && handlePaintingAnswer(option)}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            disabled={showFeedback !== null}
                            className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                              showFeedback && option === currentArtQ.userAnswer
                                ? currentArtQ.isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : 'bg-rose-500/20 border-rose-400 text-rose-200'
                                : showFeedback && option === currentArtQ.correctAnswer
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : selectedOption === option
                                    ? 'bg-purple-600/30 border-purple-400 text-white'
                                    : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option}</span>
                              {showFeedback && option === currentArtQ.userAnswer
                                ? currentArtQ.isCorrect ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-rose-400" />
                                : showFeedback && option === currentArtQ.correctAnswer
                                  ? <Check className="w-5 h-5 text-emerald-400" />
                                  : null}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Lifelines */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <motion.button
              onClick={useLifeline50}
              disabled={usedLifelines.has('50:50') || showFeedback !== null || selectedOption !== null}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border ${
                usedLifelines.has('50:50') || showFeedback !== null || selectedOption !== null
                  ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                  : `bg-slate-800/80 text-white border-slate-600 hover:border-${accentColor}-400 hover:text-${accentColor}-400`
              }`}
              whileHover={!usedLifelines.has('50:50') && showFeedback === null && selectedOption === null ? { scale: 1.05 } : {}}
              whileTap={!usedLifelines.has('50:50') && showFeedback === null && selectedOption === null ? { scale: 0.95 } : {}}
            >
              <Zap className="w-4 h-4" />
              50:50
            </motion.button>

            <motion.button
              onClick={useHintLifeline}
              disabled={usedLifelines.has('hint') || showFeedback !== null || selectedOption !== null}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 border ${
                usedLifelines.has('hint') || showFeedback !== null || selectedOption !== null
                  ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                  : `bg-slate-800/80 text-white border-slate-600 hover:border-yellow-400 hover:text-yellow-400`
              }`}
              whileHover={!usedLifelines.has('hint') && showFeedback === null && selectedOption === null ? { scale: 1.05 } : {}}
              whileTap={!usedLifelines.has('hint') && showFeedback === null && selectedOption === null ? { scale: 0.95 } : {}}
            >
              <Lightbulb className="w-4 h-4" />
              Hint
            </motion.button>

            {showFeedback && (
              <div className={`ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                showFeedback === 'correct'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {showFeedback === 'correct' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {showFeedback === 'correct' ? 'Correct!' : 'Incorrect!'}
              </div>
            )}
          </div>

          {/* Fun Fact + Next */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-3"
              >
                {funFactText && (
                  <motion.div
                    className={`rounded-xl p-4 border text-sm ${
                      isGeoMode
                        ? 'bg-blue-900/40 border-blue-500/30 text-blue-200'
                        : 'bg-purple-900/40 border-purple-500/30 text-purple-200'
                    }`}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="opacity-70 mr-2">{isGeoMode ? '🌍' : '🎨'}</span>
                    {funFactText}
                  </motion.div>
                )}

                <motion.button
                  onClick={handleNextQuestion}
                  className={`w-full font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 ${
                    isGeoMode
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20'
                  } text-white`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {currentIdx < totalQs - 1 ? 'Next Question' : 'See Results'}
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
  if (gameState === 'results') {
    const badge = getPerformanceBadge();
    const accuracy = Math.round((stats.score / (stats.totalQuestions * 100)) * 100) || 0;
    const correctCount = isGeoMode
      ? questions.filter(q => q.isCorrect).length
      : paintingQuestions.filter(q => q.isCorrect).length;
    const allQuestions = isGeoMode ? questions : paintingQuestions;

    return (
      <motion.div className={`min-h-screen bg-gradient-to-br ${isGeoMode ? 'from-slate-950 via-slate-900 to-slate-950' : 'from-slate-950 via-purple-950/20 to-slate-950'} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700">
            {/* Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="text-center mb-8"
            >
              <div className={`${badge.color} mx-auto mb-3 flex items-center justify-center`}>{badge.icon}</div>
              <h2 className={`text-3xl font-bold ${badge.color} mb-2`}>{badge.label}</h2>
              <p className="text-slate-400">Quiz complete! {isGeoMode ? '🌍' : '🎨'}</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Score', value: Math.round(stats.score), icon: <Award className="w-5 h-5" /> },
                { label: 'Correct', value: correctCount, icon: <Check className="w-5 h-5" /> },
                { label: 'Accuracy', value: `${accuracy}%`, icon: null },
                { label: 'Max Streak', value: stats.maxStreak, icon: <Flame className="w-5 h-5" /> },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`rounded-xl p-4 text-center border ${
                    isGeoMode ? 'bg-slate-700/50 border-slate-600' : 'bg-purple-900/20 border-purple-700/30'
                  }`}
                >
                  {stat.icon && <div className={`${isGeoMode ? 'text-emerald-400' : 'text-purple-400'} mx-auto mb-2`}>{stat.icon}</div>}
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mistakes Review */}
            {stats.mistakes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <X className="w-5 h-5 text-rose-400" />
                  Review Mistakes ({stats.mistakes.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {stats.mistakes.map((mistake, idx) => {
                    const isArtMistake = !('country' in mistake);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-slate-700/50 rounded-xl p-4 border border-rose-500/20"
                      >
                        {isArtMistake ? (
                          <div className="flex gap-3">
                            <div className="relative w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-950/80">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={(mistake as PaintingQuestion).painting.url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{(mistake as PaintingQuestion).question}</p>
                              <p className="text-slate-400 text-xs mt-1">
                                Your answer: <span className="text-rose-400">{mistake.userAnswer || 'No answer'}</span>
                              </p>
                              <p className="text-slate-400 text-xs">
                                Correct: <span className="text-emerald-400">{mistake.correctAnswer}</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-white font-semibold text-sm">{mistake.question}</p>
                            <p className="text-slate-400 text-xs mt-1">
                              Your answer: <span className="text-rose-400">{mistake.userAnswer || 'No answer'}</span>
                            </p>
                            <p className="text-slate-400 text-xs">
                              Correct: <span className="text-emerald-400">{mistake.correctAnswer}</span>
                            </p>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Painting gallery preview in results */}
            {!isGeoMode && allQuestions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Artworks You Encountered</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(allQuestions as PaintingQuestion[]).slice(0, 8).map((q, i) => (
                    <div key={i} className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 bg-slate-950/80 ${q.isCorrect ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={q.painting.url} alt={q.painting.title} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      <div className={`absolute inset-0 flex items-center justify-center bg-slate-900/50`}>
                        {q.isCorrect
                          ? <Check className="w-4 h-4 text-emerald-400" />
                          : <X className="w-4 h-4 text-rose-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => {
                  if (isGeoMode) { generateQuestions(); } else { generatePaintingQuestions(); }
                  setGameState('playing');
                }}
                className={`font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 text-white ${
                  isGeoMode
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </motion.button>
              <motion.button
                onClick={returnToMainMenu}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings className="w-4 h-4" />
                Main Menu
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}
