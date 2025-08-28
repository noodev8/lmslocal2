'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  FireIcon,
  CogIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { userApi } from '@/lib/api';
import { logout } from '@/lib/auth';

interface User {
  id: number;
  display_name: string;
  email: string;
}

interface Competition {
  id: number;
  name: string;
  player_count?: number;
  current_round?: number;
  total_rounds?: number;
  needs_pick?: boolean;
  my_pick?: string;
  is_organiser?: boolean;
  lives_remaining?: number;
  user_status?: string; // User participation status: 'active', 'eliminated', etc.
  round_locked?: boolean;
}


export default function PlayerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Load player competitions from API
      loadPlayerCompetitions();
      
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/join');
      return;
    }
  }, [router]);

  const loadPlayerCompetitions = async () => {
    try {
      const response = await userApi.getPlayerDashboard();
      if (response.data.return_code === 'SUCCESS') {
        setCompetitions(response.data.competitions || []);
      } else {
        console.error('Failed to load player competitions:', response.data.message);
        setCompetitions([]);
      }
    } catch (error) {
      console.error('Failed to load player competitions:', error);
      setCompetitions([]);
    } finally {
      setLoading(false);
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header with Competition Selection */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center">
                <TrophyIcon className="h-8 w-8 text-blue-600 mr-4" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Player Dashboard</h1>
                  <p className="text-gray-600">Welcome back, {user?.display_name}!</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="flex items-center text-gray-600 hover:text-gray-900">
                  <CogIcon className="h-5 w-5 mr-2" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Competition Selector */}
        {competitions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Competitions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitions.map((competition) => (
                <Link
                  key={competition.id}
                  href={`/play/${competition.id}`}
                  className="block p-6 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{competition.name}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Current Round</span>
                      <span className="font-medium">{competition.current_round}</span>
                    </div>
                    {competition.my_pick && (
                      <div className="flex items-center justify-between">
                        <span>Latest Pick</span>
                        <span className="font-medium text-blue-600">{competition.my_pick}</span>
                      </div>
                    )}
                  </div>
                  
                  {competition.needs_pick ? (
                    <div className="flex items-center justify-center bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mr-2" />
                      <span className="text-sm font-medium text-orange-800">Pick Required</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Up to Date</span>
                    </div>
                  )}
                </Link>
              ))}
              
              {/* Join New Competition Card */}
              <Link
                href="/join"
                className="p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-center transition-colors"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Join Competition</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Show message if no competitions */}
        {competitions.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Competitions Yet</h3>
            <p className="text-gray-600 mb-6">Join your first competition to get started!</p>
            <Link
              href="/join"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Join Competition
            </Link>
          </div>
        )}

        
      </main>
    </div>
  );
}