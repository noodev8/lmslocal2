'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { fixtureApi, userApi, roundApi, playerActionApi } from '@/lib/api';
import { logout } from '@/lib/auth';

interface User {
  id: number;
  display_name: string;
  email: string;
}

interface Competition {
  id: number;
  name: string;
  current_round?: number;
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

export default function CompetitionPickPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(null);
  const [roundLockTime, setRoundLockTime] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{teamShort: string, fixtureId: number, position: 'home' | 'away'} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/join');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadCompetitionData();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/join');
      return;
    }
  }, [router, competitionId]);

  const loadCompetitionData = async () => {
    try {
      // Get competition data from player dashboard
      const response = await userApi.getPlayerDashboard();
      if (response.data.return_code === 'SUCCESS') {
        const comp = response.data.competitions.find(c => c.id.toString() === competitionId);
        if (comp) {
          setCompetition(comp);
          if (comp.current_round) {
            // First get the actual round ID from round number
            getRoundId(comp.id, comp.current_round);
          }
        } else {
          router.push('/play');
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load competition data:', error);
      router.push('/play');
    } finally {
      setLoading(false);
    }
  };

  const getRoundId = async (competitionId: number, roundNumber: number) => {
    try {
      // Get all rounds for this competition to find the correct round ID
      const response = await roundApi.getRounds(competitionId);
      if (response.data.return_code === 'SUCCESS') {
        const rounds = response.data.rounds || [];
        const currentRound = rounds.find(r => r.round_number === roundNumber);
        if (currentRound) {
          setCurrentRoundId(currentRound.id);
          setRoundLockTime(currentRound.lock_time);
          // Now load fixtures with the correct round ID
          loadFixtures(currentRound.id);
        }
      }
    } catch (error) {
      console.error('Failed to get round ID:', error);
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

  const handleTeamSelect = (teamShort: string, fixtureId: number, position: 'home' | 'away') => {
    setSelectedTeam({ teamShort, fixtureId, position });
  };

  const submitPick = async () => {
    if (!selectedTeam || submitting) return;

    setSubmitting(true);
    try {
      // Use the correct API format: fixture_id and team position
      const response = await fetch('http://localhost:3015/set-pick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({
          fixture_id: selectedTeam.fixtureId,
          team: selectedTeam.position
        })
      });
      
      const data = await response.json();
      if (data.return_code === 'SUCCESS') {
        router.push('/play');
      } else {
        alert('Failed to submit pick: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to submit pick:', error);
      alert('Failed to submit pick');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout(router);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Competition Not Found</h3>
          <Link href="/play" className="text-blue-600 hover:text-blue-700">
            Back to Competitions
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
              <Link href="/" className="flex items-center">
                <TrophyIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">LMSLocal</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.display_name}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Navigation & Title */}
        <div className="mb-8">
          <div className="flex items-center">
            <Link href="/play" className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
              <p className="text-gray-600 mb-2">Round {competition.current_round} - Make Your Pick</p>
              {roundLockTime && (
                <p className="text-xl text-gray-700 mt-4 w-full">
                  Picks lock at: {new Date(roundLockTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>


        {/* Pick Selection */}
        {fixtures.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose Your Pick</h2>
            <p className="text-gray-600 mb-6">Select one team that you think will win. Remember, you can only pick each team once!</p>
            
            {/* Team Selection Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {fixtures.flatMap(fixture => [
                // Home team card with fixture context
                {
                  short: fixture.home_team_short,
                  full: fixture.home_team,
                  fixtureId: fixture.id,
                  position: 'home' as const,
                  fixtureDisplay: `${fixture.home_team} v ${fixture.away_team}`
                },
                // Away team card with fixture context
                {
                  short: fixture.away_team_short,
                  full: fixture.away_team,
                  fixtureId: fixture.id,
                  position: 'away' as const,
                  fixtureDisplay: `${fixture.home_team} v ${fixture.away_team}`
                }
              ]).map((team, index) => (
                <button
                  key={`${team.short}-${index}`}
                  onClick={() => handleTeamSelect(team.short, team.fixtureId, team.position)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTeam?.teamShort === team.short 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-center">
                    {/* Main team (large) */}
                    <div className="text-2xl font-bold text-gray-900 mb-1">{team.short}</div>
                    
                    {/* Fixture context */}
                    <div className="text-xs text-gray-500 leading-tight">
                      {team.fixtureDisplay}
                    </div>
                    
                    {selectedTeam?.teamShort === team.short && (
                      <CheckIcon className="h-4 w-4 text-green-600 mx-auto mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Submit Button */}
            {selectedTeam && (
              <div className="flex justify-center">
                <button
                  onClick={submitPick}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  {submitting ? 'Submitting...' : `Submit Pick: ${selectedTeam.teamShort}`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}