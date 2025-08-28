'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  TrophyIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { competitionApi, roundApi, fixtureApi } from '@/lib/api';

interface Competition {
  id: number;
  name: string;
  status: string;
}

interface Round {
  id: number;
  round_number: number;
  lock_time?: string;
}

interface Fixture {
  id: number;
  home_team: string;
  away_team: string;
  home_team_short: string;
  away_team_short: string;
  kickoff_time: string;
  result?: string;
}

export default function CompetitionResultsPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingResults, setSavingResults] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [competitionId, router]);

  const loadData = async () => {
    try {
      // Load competition details
      const competitions = await competitionApi.getMyCompetitions();
      if (competitions.data.return_code === 'SUCCESS') {
        const comp = competitions.data.competitions.find(c => c.id.toString() === competitionId);
        if (comp && comp.is_organiser) {
          setCompetition(comp);
        } else {
          router.push('/dashboard');
          return;
        }
      }

      // Load current round (latest round)
      const roundsResponse = await roundApi.getRounds(parseInt(competitionId));
      if (roundsResponse.data.return_code === 'SUCCESS') {
        const sortedRounds = roundsResponse.data.rounds.sort((a, b) => b.round_number - a.round_number);
        
        if (sortedRounds.length > 0) {
          const currentRound = sortedRounds[0];
          setCurrentRound(currentRound);
          loadFixtures(currentRound.id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFixtures = async (roundId: number) => {
    try {
      const response = await fixtureApi.get(roundId.toString());
      if (response.data.return_code === 'SUCCESS') {
        setFixtures(response.data.fixtures || []);
      }
    } catch (error) {
      console.error('Failed to load fixtures:', error);
      setFixtures([]);
    }
  };


  const setFixtureResult = async (fixture: Fixture, result: 'home_win' | 'away_win' | 'draw') => {
    setSavingResults(prev => new Set([...prev, fixture.id]));
    
    try {
      const response = await fixtureApi.setResult(fixture.id, result);
      if (response.data.return_code === 'SUCCESS') {
        // Update local state
        setFixtures(prev => prev.map(f => 
          f.id === fixture.id 
            ? { ...f, result: result === 'home_win' ? fixture.home_team_short : result === 'away_win' ? fixture.away_team_short : 'DRAW' }
            : f
        ));
      } else {
        alert('Failed to save result: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save result:', error);
      alert('Failed to save result');
    } finally {
      setSavingResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(fixture.id);
        return newSet;
      });
    }
  };

  const getResultButtonClass = (fixture: Fixture, resultType: 'home_win' | 'away_win' | 'draw') => {
    // Only show as selected if there's actually a result set
    if (!fixture.result || fixture.result === null || fixture.result === undefined) {
      return "px-3 py-2 rounded-md font-medium text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
    
    const isSelected = 
      (resultType === 'home_win' && fixture.result === fixture.home_team_short) ||
      (resultType === 'away_win' && fixture.result === fixture.away_team_short) ||
      (resultType === 'draw' && fixture.result === 'DRAW');
    
    const baseClass = "px-3 py-2 rounded-md font-medium text-sm transition-colors ";
    
    if (isSelected) {
      return baseClass + "bg-green-600 text-white";
    }
    
    return baseClass + "bg-gray-100 text-gray-700 hover:bg-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header - Show immediately */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link 
                  href="/dashboard" 
                  className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Dashboard
                </Link>
                <TrophyIcon className="h-8 w-8 text-green-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Results Entry</span>
              </div>
            </div>
          </div>
        </header>

        {/* Loading content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Competition Not Found</h1>
          <Link href="/dashboard" className="text-green-600 hover:text-green-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link 
                href="/dashboard" 
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Dashboard
              </Link>
              <TrophyIcon className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Results Entry</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Competition and Round Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{competition.name} - Results</h1>
          {currentRound && (
            <div className="text-lg text-gray-600">
              <span className="font-medium">Round {currentRound.round_number}</span>
              {currentRound.lock_time && (
                <span className="ml-2">
                  - {new Date(currentRound.lock_time).toLocaleString(undefined, { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fixtures and Results */}
        {currentRound && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            
            {fixtures.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No fixtures found for this round.</p>
            ) : (
              <div className="space-y-4">
                {fixtures.map((fixture) => (
                  <div key={fixture.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Fixture Info with Checkmark */}
                      <div className="flex-1 flex items-center gap-3">
                        <div className="text-lg font-medium text-gray-900">
                          {fixture.home_team} vs {fixture.away_team}
                        </div>
                        {fixture.result && fixture.result !== null && fixture.result !== undefined && !savingResults.has(fixture.id) && (
                          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        {savingResults.has(fixture.id) && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 flex-shrink-0"></div>
                        )}
                      </div>
                      
                      {/* Result Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFixtureResult(fixture, 'home_win')}
                          disabled={savingResults.has(fixture.id)}
                          className={getResultButtonClass(fixture, 'home_win')}
                        >
                          {fixture.home_team_short} Win
                        </button>
                        <button
                          onClick={() => setFixtureResult(fixture, 'draw')}
                          disabled={savingResults.has(fixture.id)}
                          className={getResultButtonClass(fixture, 'draw')}
                        >
                          Draw
                        </button>
                        <button
                          onClick={() => setFixtureResult(fixture, 'away_win')}
                          disabled={savingResults.has(fixture.id)}
                          className={getResultButtonClass(fixture, 'away_win')}
                        >
                          {fixture.away_team_short} Win
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}