'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon,
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  CalendarIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { competitionApi, roundApi, fixtureApi } from '@/lib/api';

interface Competition {
  id: number;
  name: string;
  status: 'LOCKED' | 'UNLOCKED' | 'SETUP';
  player_count?: number;
  description?: string;
  invite_code?: string;
  slug?: string;
}

interface Round {
  id: number;
  round_number: number;
  start_date?: string;
  lock_time?: string;
  status?: string;
  fixture_count?: number;
}

interface Fixture {
  id: number;
  home_team: string;
  away_team: string;
  kick_off_time: string;
  home_score?: number;
  away_score?: number;
  result_set: boolean;
}

export default function ManageCompetitionPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateRound, setShowCreateRound] = useState(false);

  const getNextFriday6PM = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) : (7 - dayOfWeek + 5);
    
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + daysUntilFriday);
    nextFriday.setHours(18, 0, 0, 0); // 6:00 PM
    
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    return nextFriday.toISOString().slice(0, 16);
  };

  const [newRound, setNewRound] = useState({
    round_number: 1,
    start_date: getNextFriday6PM()
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadCompetitionData();
  }, [competitionId, router]);

  const loadCompetitionData = async () => {
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

      // Load rounds
      const roundsResponse = await roundApi.getRounds(parseInt(competitionId));
      if (roundsResponse.data.return_code === 'SUCCESS') {
        const sortedRounds = roundsResponse.data.rounds.sort((a, b) => a.round_number - b.round_number);
        setRounds(sortedRounds);
        
        // Auto-select latest round or first round
        if (sortedRounds.length > 0) {
          const latestRound = sortedRounds[sortedRounds.length - 1];
          setSelectedRound(latestRound);
          loadFixtures(latestRound.id);
        }
        
        // Set next round number for new round creation
        setNewRound(prev => ({
          ...prev,
          round_number: sortedRounds.length + 1
        }));
      }

    } catch (error) {
      console.error('Failed to load competition data:', error);
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
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRound.start_date) {
      alert('Please select a start date');
      return;
    }

    try {
      const response = await roundApi.create(
        competitionId,
        newRound.start_date
      );

      if (response.data.return_code === 'SUCCESS') {
        setShowCreateRound(false);
        setNewRound({
          round_number: newRound.round_number + 1,
          start_date: getNextFriday6PM()
        });
        // Reload rounds
        loadCompetitionData();
      } else {
        alert('Failed to create round');
      }
    } catch (error) {
      console.error('Create round error:', error);
      alert('Failed to create round');
    }
  };

  const handleRoundSelect = (round: Round) => {
    setSelectedRound(round);
    loadFixtures(round.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNLOCKED': return 'text-green-600 bg-green-50';
      case 'LOCKED': return 'text-orange-600 bg-orange-50';
      case 'SETUP': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UNLOCKED': return <PlayIcon className="h-4 w-4" />;
      case 'LOCKED': return <PauseIcon className="h-4 w-4" />;
      case 'SETUP': return <ExclamationTriangleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Dashboard
              </Link>
              <TrophyIcon className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Manage Competition</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(competition.status)}`}>
                {getStatusIcon(competition.status)}
                <span className="ml-1 capitalize">{competition.status.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Competition Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{competition.name}</h1>
              {competition.description && (
                <p className="text-gray-600 mb-4">{competition.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  <span>{competition.player_count || 0} players</span>
                </div>
                {competition.invite_code && (
                  <div className="flex items-center">
                    <span className="font-medium">Access Code:</span>
                    <span className="ml-1 font-mono bg-gray-100 px-2 py-1 rounded">{competition.invite_code}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Edit Competition
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rounds Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Rounds</h2>
                <button
                  onClick={() => setShowCreateRound(true)}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New Round
                </button>
              </div>

              {/* Create Round Form */}
              {showCreateRound && (
                <form onSubmit={handleCreateRound} className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">Create Round {newRound.round_number}</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="datetime-local"
                        value={newRound.start_date}
                        onChange={(e) => setNewRound(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                    >
                      Create Round
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateRound(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Rounds List */}
              <div className="space-y-2">
                {rounds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No rounds created yet</p>
                    <p className="text-xs">Create your first round to get started</p>
                  </div>
                ) : (
                  rounds.map((round) => (
                    <button
                      key={round.id}
                      onClick={() => handleRoundSelect(round)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedRound?.id === round.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Round {round.round_number}</span>
                        <span className="text-xs text-gray-500">{round.fixture_count || 0} fixtures</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {round.start_date ? new Date(round.start_date).toLocaleDateString() : 'No date set'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Fixtures Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedRound ? `Round ${selectedRound.round_number} Fixtures` : 'Select a Round'}
                </h2>
                {selectedRound && (
                  <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Fixtures
                  </button>
                )}
              </div>

              {!selectedRound ? (
                <div className="text-center py-12 text-gray-500">
                  <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a round to view fixtures</p>
                </div>
              ) : fixtures.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-2">No fixtures added yet</p>
                  <p className="text-sm">Add fixtures to get this round started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixtures.map((fixture) => (
                    <div key={fixture.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium">{fixture.home_team}</span>
                            <span className="text-gray-500">vs</span>
                            <span className="font-medium">{fixture.away_team}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(fixture.kick_off_time).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {fixture.result_set ? (
                            <div className="text-center">
                              <div className="text-lg font-bold text-gray-900">
                                {fixture.home_score} - {fixture.away_score}
                              </div>
                              <div className="text-xs text-green-600 flex items-center">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Result set
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-lg text-gray-400">- - -</div>
                              <div className="text-xs text-gray-500">No result</div>
                            </div>
                          )}
                          
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}