'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { userApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

interface Competition {
  id: number;
  name: string;
  current_round: number;
  is_locked: boolean;
  access_code?: string;
}

interface RoundHistory {
  round_id: number;
  round_number: number;
  lock_time: string;
  pick_team: string | null;
  pick_team_full_name: string | null;
  visible_pick_team: string | null;
  visible_pick_team_full_name: string | null;
  home_team: string | null;
  away_team: string | null;
  result: string | null;
  pick_result: 'no_pick' | 'pending' | 'win' | 'draw' | 'loss';
}

interface CurrentPick {
  team: string | null;
  team_full_name?: string | null;
  outcome: string | null;
  fixture: string | null;
}

interface Player {
  id: number;
  display_name: string;
  lives_remaining: number;
  status: string;
  current_pick: CurrentPick | null;
  history: RoundHistory[];
}

export default function CompetitionStandingsPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;
  
  // Check if coming from admin dashboard
  const [fromAdmin, setFromAdmin] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setFromAdmin(urlParams.get('from') === 'admin');
  }, []);
  
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadStandings = useCallback(async () => {
    if (abortControllerRef.current?.signal.aborted) return;
    
    try {
      const response = await userApi.getCompetitionStandings(parseInt(competitionId));
      if (abortControllerRef.current?.signal.aborted) return;
      
      if (response.data.return_code === 'SUCCESS') {
        setCompetition(response.data.competition as Competition);
        setPlayers(response.data.players as Player[]);
      } else {
        console.error('Failed to load standings:', response.data.message);
        router.push(fromAdmin ? `/competition/${competitionId}/dashboard` : '/play');
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return;
      console.error('Failed to load standings:', error);
      router.push(fromAdmin ? `/competition/${competitionId}/dashboard` : '/play');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [competitionId, router, fromAdmin]);

  useEffect(() => {
    // Create abort controller for this effect
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const initializeData = async () => {
      // Check authentication
      const token = localStorage.getItem('jwt_token');
      
      if (!token) {
        if (!controller.signal.aborted) router.push('/login');
        return;
      }

      try {
        if (!controller.signal.aborted) {
          await loadStandings();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        if (!controller.signal.aborted) router.push('/login');
        return;
      }
    };

    // Handle auth expiration
    const handleAuthExpired = () => {
      if (!controller.signal.aborted) {
        router.push('/login');
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    initializeData();

    return () => {
      controller.abort();
      window.removeEventListener('auth-expired', handleAuthExpired);
      abortControllerRef.current = null;
    };
  }, [competitionId, router, loadStandings]);

  const togglePlayerExpansion = (playerId: number) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Determine if a player's current pick should be visible
  const isPickVisible = (playerId: number) => {
    const currentUser = getCurrentUser();
    const isAdmin = fromAdmin;
    const isOwnPlayer = currentUser && currentUser.id === playerId;
    const isRoundLocked = competition?.is_locked || false;
    
    // Show pick if: Admin (always) OR own player (always) OR deadline passed (everyone sees all)
    return isAdmin || isOwnPlayer || isRoundLocked;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-400 border-t-transparent"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Standings</h3>
          <p className="text-slate-500">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Competition Not Found</h3>
          <Link href="/play" className="text-slate-600 hover:text-slate-900 underline">
            Back to Competitions
          </Link>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter(p => p.status !== 'OUT');
  const eliminatedPlayers = players.filter(p => p.status === 'OUT');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href={fromAdmin ? `/competition/${competitionId}/dashboard` : `/play/${competitionId}`} 
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center space-x-3">
                <TrophyIcon className="h-6 w-6 text-slate-800" />
                <h1 className="text-lg font-semibold text-slate-900">Standings</h1>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        
        {/* Header with Competition Info & Quick Stats */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{competition.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span>Round {competition.current_round || 1}</span>
                <span>•</span>
                <span>{activePlayers.length} active</span>
                {eliminatedPlayers.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{eliminatedPlayers.length} out</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Players List - Simplified */}
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {/* Active Players */}
          {activePlayers.map((player) => (
            <div key={player.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => togglePlayerExpansion(player.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-slate-900 truncate">
                          {player.display_name}
                          {activePlayers.length === 1 && !competition.access_code && (
                            <span className="ml-2 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">WINNER</span>
                          )}
                        </p>
                      </div>
                      {isPickVisible(player.id) && player.current_pick && (
                        <p className="text-sm text-slate-600 truncate">
                          {player.current_pick.outcome === 'NO_PICK' ? (
                            <span className="text-slate-500">No Pick</span>
                          ) : (
                            <span>Pick: {player.current_pick.team_full_name || player.current_pick.team}</span>
                          )}
                        </p>
                      )}
                      {isPickVisible(player.id) && !player.current_pick && (
                        <p className="text-sm text-slate-500">No Pick</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900">
                      {activePlayers.length === 1 && !competition.access_code
                        ? 'Winner' 
                        : `${player.lives_remaining} lives`
                      }
                    </p>
                  </div>
                  
                  {expandedPlayers.has(player.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
                  )}
                </div>
              </div>
              
              {/* Expanded History */}
              {expandedPlayers.has(player.id) && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 mt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Round History</h4>
                  
                  {/* Desktop History Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-700">Round</th>
                          <th className="text-left py-2 font-medium text-slate-700">Pick</th>
                          <th className="text-left py-2 font-medium text-slate-700">Fixture</th>
                          <th className="text-left py-2 font-medium text-slate-700">Result</th>
                          <th className="text-left py-2 font-medium text-slate-700">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {player.history.length > 0 ? (
                          player.history.map((round) => (
                            <tr key={round.round_id} className="border-b border-slate-100">
                              <td className="py-2">
                                <span className="font-medium">Round {round.round_number}</span>
                              </td>
                              <td className="py-2">
                                {round.visible_pick_team_full_name ? (
                                  <span className="text-slate-900 font-medium">{round.visible_pick_team_full_name}</span>
                                ) : (
                                  <span className="text-slate-500 font-medium">No Pick</span>
                                )}
                              </td>
                              <td className="py-2">
                                {round.home_team && round.away_team ? (
                                  <span className="text-slate-700">{round.home_team} vs {round.away_team}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2">
                                {round.result ? (
                                  <span className="text-slate-700">
                                    {round.result === 'HOME_WIN' ? `${round.home_team} Win` :
                                     round.result === 'AWAY_WIN' ? `${round.away_team} Win` :
                                     round.result === 'DRAW' ? 'Draw' : round.result}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Pending</span>
                                )}
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-1 text-xs rounded font-medium ${
                                  round.pick_result === 'win' ? 'bg-slate-100 text-slate-800' :
                                  round.pick_result === 'loss' ? 'bg-slate-100 text-slate-800' :
                                  round.pick_result === 'no_pick' ? 'bg-slate-100 text-slate-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {round.pick_result === 'win' ? 'WIN' :
                                   round.pick_result === 'loss' ? 'LOSE' :
                                   round.pick_result === 'no_pick' ? 'NO PICK' :
                                   'PENDING'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">
                              No previous rounds completed
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile History Cards */}
                  <div className="md:hidden space-y-3">
                    {player.history.length > 0 ? (
                      player.history.map((round) => (
                        <div key={round.round_id} className="border border-slate-200 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">Round {round.round_number}</span>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              round.pick_result === 'win' ? 'bg-slate-100 text-slate-800' :
                              round.pick_result === 'loss' ? 'bg-slate-100 text-slate-800' :
                              round.pick_result === 'no_pick' ? 'bg-slate-100 text-slate-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {round.pick_result === 'win' ? 'WIN' :
                               round.pick_result === 'loss' ? 'LOSE' :
                               round.pick_result === 'no_pick' ? 'NO PICK' :
                               'PENDING'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Pick:</span>
                              {round.visible_pick_team_full_name ? (
                                <span className="text-slate-900 font-medium">{round.visible_pick_team_full_name}</span>
                              ) : (
                                <span className="text-slate-500 font-medium">No Pick</span>
                              )}
                            </div>
                            
                            {round.home_team && round.away_team && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Fixture:</span>
                                <span className="text-slate-700 text-right">{round.home_team} vs {round.away_team}</span>
                              </div>
                            )}

                            {round.result && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Result:</span>
                                <span className="text-slate-700 text-right">
                                  {round.result === 'HOME_WIN' ? `${round.home_team} Win` :
                                   round.result === 'AWAY_WIN' ? `${round.away_team} Win` :
                                   round.result === 'DRAW' ? 'Draw' : round.result}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        No previous rounds completed
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Eliminated Players */}
          {eliminatedPlayers.map((player) => (
            <div key={player.id} className="p-4 hover:bg-slate-50 transition-colors opacity-75">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => togglePlayerExpansion(player.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-slate-600 truncate">{player.display_name}</p>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">OUT</span>
                      </div>
                      {isPickVisible(player.id) && player.current_pick && (
                        <p className="text-sm text-slate-500 truncate">
                          {player.current_pick.outcome === 'NO_PICK' ? (
                            <span>No Pick</span>
                          ) : (
                            <span>Pick: {player.current_pick.team_full_name || player.current_pick.team}</span>
                          )}
                        </p>
                      )}
                      {isPickVisible(player.id) && !player.current_pick && (
                        <p className="text-sm text-slate-500">No Pick</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">0 lives</p>
                  </div>
                  
                  {expandedPlayers.has(player.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
                  )}
                </div>
              </div>
              
              {/* Expanded History */}
              {expandedPlayers.has(player.id) && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 mt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Round History</h4>
                  
                  {/* Desktop History Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-700">Round</th>
                          <th className="text-left py-2 font-medium text-slate-700">Pick</th>
                          <th className="text-left py-2 font-medium text-slate-700">Fixture</th>
                          <th className="text-left py-2 font-medium text-slate-700">Result</th>
                          <th className="text-left py-2 font-medium text-slate-700">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {player.history.length > 0 ? (
                          player.history.map((round) => (
                            <tr key={round.round_id} className="border-b border-slate-100">
                              <td className="py-2">
                                <span className="font-medium">Round {round.round_number}</span>
                              </td>
                              <td className="py-2">
                                {round.visible_pick_team_full_name ? (
                                  <span className="text-slate-700 font-medium">{round.visible_pick_team_full_name}</span>
                                ) : (
                                  <span className="text-slate-500 font-medium">No Pick</span>
                                )}
                              </td>
                              <td className="py-2">
                                {round.home_team && round.away_team ? (
                                  <span className="text-slate-600">{round.home_team} vs {round.away_team}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2">
                                {round.result ? (
                                  <span className="text-slate-600">
                                    {round.result === 'HOME_WIN' ? `${round.home_team} Win` :
                                     round.result === 'AWAY_WIN' ? `${round.away_team} Win` :
                                     round.result === 'DRAW' ? 'Draw' : round.result}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Pending</span>
                                )}
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-1 text-xs rounded font-medium ${
                                  round.pick_result === 'win' ? 'bg-slate-100 text-slate-700' :
                                  round.pick_result === 'loss' ? 'bg-slate-100 text-slate-700' :
                                  round.pick_result === 'no_pick' ? 'bg-slate-100 text-slate-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {round.pick_result === 'win' ? 'WIN' :
                                   round.pick_result === 'loss' ? 'LOSE' :
                                   round.pick_result === 'no_pick' ? 'NO PICK' :
                                   'PENDING'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">
                              No previous rounds completed
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile History Cards */}
                  <div className="md:hidden space-y-3">
                    {player.history.length > 0 ? (
                      player.history.map((round) => (
                        <div key={round.round_id} className="border border-slate-200 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">Round {round.round_number}</span>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              round.pick_result === 'win' ? 'bg-slate-100 text-slate-700' :
                              round.pick_result === 'loss' ? 'bg-slate-100 text-slate-700' :
                              round.pick_result === 'no_pick' ? 'bg-slate-100 text-slate-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {round.pick_result === 'win' ? 'WIN' :
                               round.pick_result === 'loss' ? 'LOSE' :
                               round.pick_result === 'no_pick' ? 'NO PICK' :
                               'PENDING'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Pick:</span>
                              {round.visible_pick_team_full_name ? (
                                <span className="text-slate-700 font-medium">{round.visible_pick_team_full_name}</span>
                              ) : (
                                <span className="text-slate-500 font-medium">No Pick</span>
                              )}
                            </div>
                            
                            {round.home_team && round.away_team && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Fixture:</span>
                                <span className="text-slate-600 text-right">{round.home_team} vs {round.away_team}</span>
                              </div>
                            )}

                            {round.result && (
                              <div className="flex justify-between">
                                <span className="text-slate-600">Result:</span>
                                <span className="text-slate-600 text-right">
                                  {round.result === 'HOME_WIN' ? `${round.home_team} Win` :
                                   round.result === 'AWAY_WIN' ? `${round.away_team} Win` :
                                   round.result === 'DRAW' ? 'Draw' : round.result}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        No previous rounds completed
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}