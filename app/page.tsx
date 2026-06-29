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
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Types
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
  name?: {
    common?: string;
    official?: string;
  } | string;
  capital?: string[] | string;
  flags?: {
    svg?: string;
    png?: string;
  };
  population?: number;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  region?: string;
  cca2?: string;
  latlng?: [number, number];
}

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
  mistakes: Question[];
}

const QUESTION_TYPES = [
  { id: 'capital', label: 'Capitals', icon: MapPin },
  { id: 'flag', label: 'Flags', icon: Flag },
  { id: 'currency', label: 'Currencies', icon: DollarSign },
  { id: 'location', label: 'Locations', icon: Globe },
];

const WORLD_REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Antarctic'];

const LEVELS: Array<{ id: Level; label: string; description: string }> = [
  { id: 'easy', label: 'Easy', description: 'Well-known countries like USA, Germany, Netherlands' },
  { id: 'medium', label: 'Medium', description: 'Balanced mix of familiar and less common countries' },
  { id: 'hard', label: 'Hard', description: 'Smaller, remote, or island countries' },
];

const EASY_COUNTRY_NAMES = new Set([
  'united states',
  'united states of america',
  'usa',
  'canada',
  'mexico',
  'brazil',
  'argentina',
  'chile',
  'peru',
  'colombia',
  'germany',
  'netherlands',
  'france',
  'spain',
  'italy',
  'united kingdom',
  'uk',
  'england',
  'japan',
  'china',
  'india',
  'australia',
  'new zealand',
  'south africa',
  'turkey',
  'russia',
]);

const HARD_COUNTRY_NAMES = new Set([
  'aruba',
  'bermuda',
  'maldives',
  'seychelles',
  'fiji',
  'bahamas',
  'barbados',
  'cape verde',
  'grenada',
  'samoa',
  'tonga',
  'palau',
  'kiribati',
  'tuvalu',
  'nauru',
  'micronesia',
  'guam',
  'puerto rico',
  'greenland',
  'hong kong',
  'macau',
  'gibraltar',
  'faroe islands',
  'cayman islands',
  'turks and caicos islands',
  'british virgin islands',
  'u.s. virgin islands',
  'us virgin islands',
  'cook islands',
  'marshall islands',
  'solomon islands',
  'new caledonia',
  'saint helena',
  'falkland islands',
  'vatican city',
  'monaco',
  'san marino',
  'liechtenstein',
  'andorra',
  'luxembourg',
  'brunei',
  'comoros',
  'dominica',
  'sao tome and principe',
]);

function getCountryLevel(country: Country): Level {
  const population = country.population || 0;
  const region = country.region || '';
  const name = country.name.common.toLowerCase();
  const official = country.name.official.toLowerCase();
  const isIslandOrTerritory =
    /island|islands|isle|atoll|archipelago/.test(name) ||
    HARD_COUNTRY_NAMES.has(name) ||
    HARD_COUNTRY_NAMES.has(official);

  if (isIslandOrTerritory || region === 'Oceania' || region === 'Antarctic' || population < 2_000_000) {
    return 'hard';
  }

  if (EASY_COUNTRY_NAMES.has(name) || EASY_COUNTRY_NAMES.has(official)) return 'easy';

  if (population >= 20_000_000) return 'easy';
  if (population >= 2_000_000) return 'medium';
  return 'hard';
}

export default function GeographyQuiz() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [settings, setSettings] = useState<QuizSettings>({
    categories: ['capital'],
    levels: ['easy', 'medium', 'hard'],
    questionCount: 10,
    timePerQuestion: 30,
    questionType: 'multiple',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState<QuizStats>({
    score: 0,
    totalQuestions: 0,
    streak: 0,
    maxStreak: 0,
    timeSpent: 0,
    mistakes: [],
  });
  const [timeLeft, setTimeLeft] = useState(0);
  const [usedLifelines, setUsedLifelines] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [funFactText, setFunFactText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Fetch countries data
  useEffect(() => {
    const normalizeCountry = (item: CountrySourceItem): Country | null => {
      const cca2 = String(item?.cca2 || '').toUpperCase();
      const commonName = typeof item?.name === 'string'
        ? item.name
        : item?.name?.common || item?.name?.official || '';
      if (!cca2 || !commonName) return null;
      const officialName = typeof item?.name === 'string'
        ? item.name
        : item?.name?.official || commonName;
      const currencies = item?.currencies
        ? Object.fromEntries(
            Object.entries(item.currencies).map(([code, currency]) => [
              code,
              {
                name: currency?.name || code,
                symbol: currency?.symbol || '',
              },
            ]),
          )
        : undefined;

      const svgFlag = item?.flags?.svg || (cca2 ? `https://flagcdn.com/${cca2.toLowerCase()}.svg` : '');
      const pngFlag = item?.flags?.png || (cca2 ? `https://flagcdn.com/w320/${cca2.toLowerCase()}.png` : '');

      return {
        name: {
          common: commonName,
          official: officialName,
        },
        capital: Array.isArray(item?.capital)
          ? item.capital
          : item?.capital
            ? [item.capital]
            : [],
        flags: {
          svg: svgFlag,
          png: pngFlag,
        },
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
      } catch {
        return null;
      }
    };

    const writeCachedCountries = (value: Country[]) => {
      try {
        window.localStorage.setItem('geography-quiz-countries', JSON.stringify(value));
      } catch {
        // Ignore storage failures.
      }
    };

    const fetchCountries = async () => {
      const sources = [
        'https://restcountries.com/v3.1/all?fields=name,capital,flags,population,currencies,region,cca2,latlng',
        'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
      ];

      try {
        setIsLoading(true);
        setLoadError(null);

        const cachedCountries = readCachedCountries();
        if (cachedCountries) {
          setCountries(cachedCountries);
          return;
        }

        const results = await Promise.allSettled(
          sources.map(async (source) => {
            const response = await fetch(source);
            if (!response.ok) {
              throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();
            return (Array.isArray(data) ? data : [])
              .map(normalizeCountry)
              .filter((country): country is Country => Boolean(country));
          }),
        );

        const successfulCountries = results
          .find((result): result is PromiseFulfilledResult<Country[]> => result.status === 'fulfilled' && result.value.length > 0)
          ?.value;

        if (successfulCountries && successfulCountries.length > 0) {
          setCountries(successfulCountries);
          writeCachedCountries(successfulCountries);
          return;
        }

        throw new Error('All country data sources failed');
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        setCountries([]);
        setLoadError('Unable to load world country data. Please check your internet connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, [reloadKey]);

  // Generate quiz questions
  const generateQuestions = useCallback(() => {
    const shuffled = [...countries].sort(() => Math.random() - 0.5);
    const allowedLevels = settings.levels.length > 0 ? settings.levels : ['easy', 'medium', 'hard'];
    const filteredCountries = shuffled.filter(country => allowedLevels.includes(getCountryLevel(country)));
    const selectedCountries = (filteredCountries.length > 0 ? filteredCountries : shuffled).slice(0, settings.questionCount);
    const newQuestions: Question[] = [];

    selectedCountries.forEach((country) => {
      const categoryList = settings.categories;
      const category = categoryList[Math.floor(Math.random() * categoryList.length)] as string;

      let question: Question | null = null;

      switch (category) {
        case 'capital':
          question = {
            id: `q-${country.cca2}-capital-${Math.random()}`,
            type: 'capital',
            country,
            question: `What is the capital of ${country.name.common}?`,
            correctAnswer: country.capital?.[0] || 'N/A',
            hint: `Located in ${country.region}`,
          };
          break;
        case 'flag':
          question = {
            id: `q-${country.cca2}-flag-${Math.random()}`,
            type: 'flag',
            country,
            question: `Which country does this flag belong to?`,
            correctAnswer: country.name.common,
            hint: `This country is in ${country.region}`,
          };
          break;
        case 'currency':
          const currencyName = Object.values(country.currencies || {})[0]?.name || 'N/A';
          question = {
            id: `q-${country.cca2}-currency-${Math.random()}`,
            type: 'currency',
            country,
            question: `What is the primary currency of ${country.name.common}?`,
            correctAnswer: currencyName,
            hint: `Used in ${country.region}`,
          };
          break;
        case 'location':
          question = {
            id: `q-${country.cca2}-location-${Math.random()}`,
            type: 'location',
            country,
            question: `${country.name.common} is located in which region?`,
            correctAnswer: country.region || 'N/A',
            hint: `Think about the continent`,
          };
          break;
      }

      if (question) {
        // Generate options for multiple choice
        if (settings.questionType === 'multiple') {
          const correctOption = question.correctAnswer;
          let options = [correctOption];

          if (question.type === 'capital') {
            const capitals = shuffled
              .filter(c => c.name.common !== country.name.common)
              .slice(0, 3)
              .map(c => c.capital?.[0] || 'Unknown');
            options = [...options, ...capitals];
          } else if (question.type === 'flag') {
            const names = shuffled
              .filter(c => c.name.common !== country.name.common)
              .slice(0, 3)
              .map(c => c.name.common);
            options = [...options, ...names];
          } else if (question.type === 'currency') {
            const uniqueCurrencyNames = Array.from(
              new Set(
                countries
                  .flatMap(c => Object.values(c.currencies || {}).map(currency => currency?.name).filter(Boolean))
                  .filter((name): name is string => Boolean(name) && name !== correctOption)
              )
            );

            const wrongCurrencies = uniqueCurrencyNames
              .sort(() => Math.random() - 0.5)
              .slice(0, 3);

            options = [correctOption, ...wrongCurrencies];

            while (options.length < 4) {
              const filler = `Unknown Currency ${options.length}`;
              if (!options.includes(filler)) options.push(filler);
            }
          } else if (question.type === 'location') {
            const correctRegion = question.correctAnswer;
            const regionOptions = WORLD_REGIONS.filter(region => region !== correctRegion);
            const wrongRegions = regionOptions.sort(() => Math.random() - 0.5).slice(0, 3);
            options = [correctRegion, ...wrongRegions];
          }

          question.options = Array.from(new Set(options)).sort(() => Math.random() - 0.5);
        }

        newQuestions.push(question);
      }
    });

    setQuestions(newQuestions);
    setStats({
      score: 0,
      totalQuestions: newQuestions.length,
      streak: 0,
      maxStreak: 0,
      timeSpent: 0,
      mistakes: [],
    });
    setCurrentQuestionIndex(0);
    setTimeLeft(settings.timePerQuestion);
    setUsedLifelines(new Set());
    setShowFeedback(null);
    setSelectedOption(null);
  }, [countries, settings]);

  // Generate fun fact
  function generateFunFact(country: Country, questionType: Question['type']): string {
    const currencyName = Object.values(country.currencies || {})[0]?.name || 'N/A';

    const factsByType: Record<Question['type'], string[]> = {
      capital: [
        `${country.name.common}'s capital is ${country.capital?.[0] || 'N/A'}.`,
        `${country.name.common} is part of ${country.region || 'an unknown'} region.`,
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

  // Handle answer submission
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
      setStats(prev => ({
        ...prev,
        streak: 0,
        mistakes: [...prev.mistakes, updatedQuestion],
      }));
    }
  }, [questions, currentQuestionIndex, showFeedback, stats, settings.timePerQuestion, timeLeft]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(settings.timePerQuestion);
      setShowFeedback(null);
      setSelectedOption(null);
      setFunFactText('');
      setUsedLifelines(new Set());
    } else {
      setGameState('results');
    }
  }, [currentQuestionIndex, questions.length, settings.timePerQuestion]);

  const returnToMainMenu = useCallback(() => {
    setGameState('setup');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setStats({
      score: 0,
      totalQuestions: 0,
      streak: 0,
      maxStreak: 0,
      timeSpent: 0,
      mistakes: [],
    });
    setTimeLeft(0);
    setUsedLifelines(new Set());
    setShowFeedback(null);
    setFunFactText('');
    setSelectedOption(null);
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || !settings.timePerQuestion || showFeedback) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // For TIMEOUT, we mark the answer as incorrect without calling handleAnswer
          setShowFeedback('incorrect');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, settings.timePerQuestion, showFeedback]);

  // Use lifeline (50:50)
  const useLifeline50 = () => {
    if (showFeedback || selectedOption !== null || usedLifelines.has('50:50') || !questions[currentQuestionIndex]?.options) return;

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.correctAnswer;
    const currentOptions = currentQuestion.options ?? [];
    const wrongOptions = currentOptions.filter(opt => opt !== correctAnswer);
    const toRemove = wrongOptions.slice(0, 2);
    const remainingOptions = currentOptions.filter(opt => !toRemove.includes(opt));

    const newQuestions = [...questions];
    newQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      options: remainingOptions,
    };
    setQuestions(newQuestions);
    setUsedLifelines(prev => new Set(prev).add('50:50'));
  };

  // Use hint lifeline
  const useHintLifeline = () => {
    if (showFeedback || selectedOption !== null || usedLifelines.has('hint')) return;
    const currentQuestion = questions[currentQuestionIndex];
    const newQuestions = [...questions];
    newQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      revealed: true,
    };
    setQuestions(newQuestions);
    setUsedLifelines(prev => new Set(prev).add('hint'));
  };

  // Get performance badge
  const getPerformanceBadge = (): { label: string; icon: React.ReactNode; color: string } => {
    const accuracy = (stats.score / (stats.totalQuestions * 100)) * 100;
    if (accuracy >= 90) return { label: 'Global Master', icon: <Globe className="w-8 h-8" />, color: 'text-yellow-400' };
    if (accuracy >= 70) return { label: 'Navigator', icon: <MapPin className="w-8 h-8" />, color: 'text-blue-400' };
    if (accuracy >= 50) return { label: 'Explorer', icon: <Flag className="w-8 h-8" />, color: 'text-green-400' };
    return { label: 'Traveler', icon: <Globe className="w-8 h-8" />, color: 'text-gray-400' };
  };

  // Setup screen
  if (gameState === 'setup') {
    return (
      <motion.div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                <Globe className="w-12 h-12 text-emerald-400 mb-4" />
              </motion.div>
              <h1 className="text-4xl font-bold text-white mb-2">Geography Quiz</h1>
              <p className="text-slate-300">Master the world one question at a time</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                  <Zap className="w-8 h-8 text-emerald-400 mx-auto" />
                </motion.div>
                <p className="text-slate-300 mt-4">Loading {countries.length} countries...</p>
              </div>
            ) : loadError ? (
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
                  Retry loading countries
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Categories */}
                <div>
                  <label className="inline-flex text-white font-semibold mb-4 items-center gap-2">
                    <Settings className="w-5 h-5 text-emerald-400" />
                    Quiz Categories
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {QUESTION_TYPES.map(qtype => {
                      const Icon = qtype.icon;
                      return (
                        <motion.button
                          key={qtype.id}
                          onClick={() => {
                            setSettings(prev => {
                              const newCategories = prev.categories.includes(qtype.id)
                                ? prev.categories.filter(c => c !== qtype.id)
                                : [...prev.categories, qtype.id];
                              return { ...prev, categories: newCategories };
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
                        onClick={() => {
                          setSettings(prev => {
                            const nextLevels = prev.levels.includes(level.id)
                              ? prev.levels.filter(item => item !== level.id)
                              : [...prev.levels, level.id];

                            return {
                              ...prev,
                              levels: nextLevels.length ? nextLevels : prev.levels,
                            };
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
                  <p className="text-xs text-slate-400 mt-3">You can select one, two, or all three levels together.</p>
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

                {/* Start Button */}
                <motion.button
                  onClick={() => {
                    generateQuestions();
                    setGameState('playing');
                  }}
                  className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-5 h-5" />
                  Start Quiz
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Playing screen
  if (gameState === 'playing' && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <motion.div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ scale: stats.streak > 0 ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg"
                >
                    <Flame className={`w-5 h-5 ${stats.streak > 0 ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span className="text-white font-bold">{stats.streak}</span>
                </motion.div>
                <div className="bg-slate-700 px-4 py-2 rounded-lg text-white">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
              </div>

              {settings.timePerQuestion > 0 && (
                <motion.div
                  className={`text-2xl font-bold px-4 py-2 rounded-lg ${
                    timeLeft <= 5 ? 'bg-red-500 text-white' : 'bg-slate-700 text-emerald-400'
                  }`}
                  animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {timeLeft}s
                </motion.div>
              )}

              <button
                onClick={returnToMainMenu}
                className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white transition hover:border-slate-500 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Main Menu
              </button>
            </div>

            {/* Progress Bar */}
            <motion.div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-emerald-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>

          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 mb-8"
          >
            {/* Flag or Image */}
            {(currentQuestion.type === 'flag') && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6 text-center"
              >
                <Image
                  src={currentQuestion.country.flags.svg}
                  alt={currentQuestion.country.name.common}
                  width={320}
                  height={192}
                  unoptimized
                  className="w-full max-w-xs h-48 object-cover rounded-lg shadow-lg mx-auto border-2 border-emerald-400"
                />
              </motion.div>
            )}

            {/* Question */}
            <h2 className="text-2xl font-bold text-white mb-6 text-center">{currentQuestion.question}</h2>

            {/* Country Info for Context */}
            {currentQuestion.type !== 'flag' && (
              <motion.div className="bg-slate-700 rounded-lg p-4 mb-6 text-center">
                <Image
                  src={currentQuestion.country.flags.svg}
                  alt={currentQuestion.country.name.common}
                  width={80}
                  height={48}
                  unoptimized
                  className="w-20 h-12 mx-auto mb-2 rounded shadow-md"
                />
                <p className="text-slate-300 font-semibold">{currentQuestion.country.name.common}</p>
              </motion.div>
            )}

            {/* Hint Display */}
            {currentQuestion.revealed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-900 border border-blue-400 rounded-lg p-4 mb-6 text-blue-100 flex items-start gap-3"
              >
                <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{currentQuestion.hint}</p>
              </motion.div>
            )}

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options && settings.questionType === 'multiple' ? (
                currentQuestion.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => !showFeedback && handleAnswer(option)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    disabled={showFeedback !== null}
                    className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all ${
                      showFeedback && option === currentQuestion.userAnswer
                        ? currentQuestion.isCorrect
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-rose-500 border-rose-400 text-white'
                        : showFeedback && option === currentQuestion.correctAnswer
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : selectedOption === option
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showFeedback && option === currentQuestion.userAnswer ? (
                        currentQuestion.isCorrect ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )
                      ) : showFeedback && option === currentQuestion.correctAnswer ? (
                        <Check className="w-5 h-5" />
                      ) : null}
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={selectedOption || ''}
                    onChange={e => setSelectedOption(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && !showFeedback && handleAnswer(selectedOption || '')}
                    placeholder="Type your answer..."
                    className="w-full p-4 rounded-lg border-2 border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    disabled={showFeedback !== null}
                  />
                  {!showFeedback && (
                    <motion.button
                      onClick={() => handleAnswer(selectedOption || '')}
                      className="w-full p-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Submit Answer
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Lifelines and Feedback */}
          <div className="flex items-center gap-4 mb-8 flex-wrap">
            {/* Lifelines */}
            <motion.button
              onClick={useLifeline50}
              disabled={usedLifelines.has('50:50') || showFeedback !== null || selectedOption !== null}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                usedLifelines.has('50:50') || showFeedback !== null || selectedOption !== null
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              whileHover={!usedLifelines.has('50:50') && showFeedback === null && selectedOption === null ? { scale: 1.05 } : {}}
              whileTap={!usedLifelines.has('50:50') && showFeedback === null && selectedOption === null ? { scale: 0.95 } : {}}
            >
              <Zap className="w-4 h-4" />
              50:50
            </motion.button>

            <motion.button
              onClick={useHintLifeline}
              disabled={usedLifelines.has('hint') || !currentQuestion.hint || showFeedback !== null || selectedOption !== null}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                usedLifelines.has('hint') || showFeedback !== null || selectedOption !== null
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              whileHover={!usedLifelines.has('hint') && showFeedback === null && selectedOption === null ? { scale: 1.05 } : {}}
              whileTap={!usedLifelines.has('hint') && showFeedback === null && selectedOption === null ? { scale: 0.95 } : {}}
            >
              <Lightbulb className="w-4 h-4" />
              Hint
            </motion.button>
          </div>

          {/* Feedback and Next */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-4"
              >
                {funFactText && (
                  <motion.div
                    className="bg-blue-900 border border-blue-400 rounded-lg p-4 text-blue-100"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                  >
                    <p className="text-sm">{funFactText}</p>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleNextQuestion}
                  className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Results screen
  if (gameState === 'results') {
    const badge = getPerformanceBadge();
    const accuracy = Math.round((stats.score / (stats.totalQuestions * 100)) * 100) || 0;

    return (
      <motion.div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
            {/* Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="text-center mb-8"
            >
              <div className={`${badge.color} mx-auto mb-4`}>{badge.icon}</div>
              <h2 className={`text-3xl font-bold ${badge.color} mb-2`}>{badge.label}</h2>
              <p className="text-slate-300">Congratulations on completing the quiz!</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Score', value: Math.round(stats.score), icon: <Award className="w-5 h-5" /> },
                { label: 'Correct', value: questions.filter(q => q.isCorrect).length, icon: <Check className="w-5 h-5" /> },
                { label: 'Accuracy', value: `${accuracy}%`, icon: null },
                  { label: 'Max Streak', value: stats.maxStreak, icon: <Flame className="w-5 h-5" /> },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-700 rounded-lg p-4 text-center border border-slate-600"
                >
                  {stat.icon && <div className="text-emerald-400 mx-auto mb-2">{stat.icon}</div>}
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mistakes Review */}
            {stats.mistakes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <X className="w-5 h-5 text-rose-400" />
                  Review Mistakes ({stats.mistakes.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {stats.mistakes.map((mistake, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-700 rounded-lg p-4 border border-rose-500/30"
                    >
                      <p className="text-white font-semibold">{mistake.question}</p>
                      <p className="text-slate-300 text-sm mt-2">
                        Your answer: <span className="text-rose-400 font-medium">{mistake.userAnswer}</span>
                      </p>
                      <p className="text-slate-300 text-sm">
                        Correct answer: <span className="text-emerald-400 font-medium">{mistake.correctAnswer}</span>
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => {
                  generateQuestions();
                  setGameState('playing');
                }}
                className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </motion.button>
                <motion.button
                  onClick={returnToMainMenu}
                className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
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
