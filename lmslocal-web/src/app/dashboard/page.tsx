'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon, 
  PlusIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  PlayCircleIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline';
import { userApi } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useAppData } from '@/contexts/AppDataContext';


export default function DashboardPage() {
  const router = useRouter();
  // Use app-level data from context instead of local API calls
  const { competitions, user, loading } = useAppData();
  
  // Filter to only show competitions where user is organiser
  const organizedCompetitions = competitions?.filter(comp => comp.is_organiser) || [];
  const [newCompetitionId, setNewCompetitionId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userType, setUserType] = useState<string | null>(null);


  const checkUserTypeAndRoute = useCallback(async () => {
    try {
      const response = await userApi.checkUserType();
      if (response.data.return_code === 'SUCCESS') {
        const { user_type, suggested_route, has_organized } = response.data;
        setUserType(user_type as string);
        
        // Smart routing logic
        if (user_type === 'player' && !has_organized) {
          // Pure player - redirect to player dashboard
          router.push('/play');
          return;
        } else if (user_type === 'both' && suggested_route === '/play') {
          // User participates more than organizes - suggest player dashboard
          const shouldRedirect = window.confirm(
            'You participate in more competitions than you organize. Would you like to go to your player dashboard instead?'
          );
          if (shouldRedirect) {
            router.push('/play');
            return;
          }
        }
        
        // Stay on admin dashboard for organisers or if user chooses to
        // Competitions are now loaded via AppDataProvider
      } else {
        // Competitions are now loaded via AppDataProvider
      }
    } catch (error) {
      console.error('Failed to check user type:', error);
      // Competitions are now loaded via AppDataProvider
    }
  }, [router]);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData || userData === 'undefined' || userData === 'null') {
      router.push('/login');
      return;
    }

    try {
      JSON.parse(userData); // Just validate the user data is valid JSON
      // User data is now loaded via AppDataProvider, no need to set local state
    } catch (error) {
      console.error('Failed to parse user data:', error);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }
    
    // Check if we just created a new competition
    const newCompId = localStorage.getItem('new_competition_id');
    if (newCompId) {
      setNewCompetitionId(newCompId);
      // Clear it after showing
      localStorage.removeItem('new_competition_id');
    }
    
    // Check URL params to see if user is returning from competition page
    const urlParams = new URLSearchParams(window.location.search);
    const fromCompetition = urlParams.get('from') === 'competition';
    
    // Only do smart routing if not returning from competition
    if (!fromCompetition) {
      checkUserTypeAndRoute();
    } else {
      // Competitions are now loaded via AppDataProvider
    }
  }, [router, checkUserTypeAndRoute]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNLOCKED': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'LOCKED': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'SETUP': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UNLOCKED': return <PlayCircleIcon className="h-4 w-4" />;
      case 'LOCKED': return <PauseCircleIcon className="h-4 w-4" />;
      case 'SETUP': return <ExclamationTriangleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const handleLogout = () => {
    logout(router);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <TrophyIcon className="h-7 w-7 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-900">LMSLocal</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Dashboard</h3>
                <p className="text-slate-500">Please wait while we fetch your competitions...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Material 3 Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <TrophyIcon className="h-7 w-7 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-900">LMSLocal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 text-slate-600">
                <span className="text-sm">Welcome back,</span>
                <span className="font-semibold text-slate-900">{user?.display_name}</span>
              </div>
              <div className="h-6 w-px bg-slate-300" />
              <Link
                href="/profile"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Welcome Section - Material 3 Style */}
        <div className="mb-10">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              Welcome back, {user?.display_name}
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Manage your Last Man Standing competitions with professional tools designed for pub landlords, 
              workplace organizers, and club managers.
            </p>
          </div>
        </div>
        
        {/* Section Header */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-900">My Competitions</h3>
          <p className="text-slate-600 mt-1">Create and manage engaging competitions for your community</p>
        </div>

        {/* Competitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Competition Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-8 hover:shadow-lg transition-all duration-200 group cursor-pointer">
            <Link href="/competition/create" className="block">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6 group-hover:bg-blue-200 transition-colors">
                  <PlusIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Start New Competition</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Create engaging Last Man Standing competitions that bring your community together. 
                  Setup takes just minutes with our guided process.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm group-hover:bg-blue-700 transition-colors">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Quick Setup
                </div>
              </div>
            </Link>
          </div>

          {/* Competition Cards */}
          {organizedCompetitions.map((competition) => {
            const isNewCompetition = newCompetitionId && competition.id.toString() === newCompetitionId;
            return (
              <div
                key={competition.id}
                className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                  isNewCompetition 
                    ? 'border-blue-200 ring-2 ring-blue-100' 
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900 truncate">{competition.name}</h4>
                        {isNewCompetition && (
                          <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <SparklesIcon className="h-3 w-3 mr-1" />
                            NEW
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <div className="flex items-center space-x-2">
                          <UserGroupIcon className="h-4 w-4" />
                          <span>{competition.player_count || 0} active</span>
                        </div>
                        {competition.current_round && (
                          <div className="flex items-center space-x-2">
                            <ChartBarIcon className="h-4 w-4" />
                            <span>Round {competition.current_round}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Removed status badge as requested */}
                  </div>

                  {/* Status Messages */}
                  {isNewCompetition && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">Competition Created Successfully!</p>
                          <p className="text-xs text-blue-700 mt-1">Ready to add rounds, fixtures, and invite players</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!isNewCompetition && competition.player_count === 0 && (competition.status as string) !== 'COMPLETE' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-900">Waiting for Players</p>
                          <p className="text-xs text-amber-700 mt-1">Share your access code to get players joining</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Competition Status Display */}
                  {(competition.status as string) === 'COMPLETE' ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <TrophyIcon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">Competition Complete</p>
                          <p className="text-xs text-slate-600 mt-1">This competition has finished - all results have been calculated</p>
                        </div>
                      </div>
                    </div>
                  ) : competition.current_round && competition.player_count && competition.player_count > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <PlayCircleIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-900">Competition Active</p>
                          <p className="text-xs text-emerald-700 mt-1">Players are engaged and competition is running</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Competition Stats */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      {/* Removed rounds count and created date as requested */}
                    </div>
                    
                    {/* Access Code */}
                    {competition.access_code && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-700 mb-1">Player Access Code</p>
                            <div className="flex items-center space-x-2">
                              <code className="text-lg font-mono font-bold text-blue-600 tracking-wider">
                                {competition.access_code}
                              </code>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigator.clipboard.writeText(competition.access_code || '');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Single Action - Open Competition Dashboard */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <Link
                    href={`/competition/${competition.id}/dashboard`}
                    className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors text-base ${
                      isNewCompetition 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                        : 'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    <ChartBarIcon className="h-5 w-5 mr-2" />
                    Open Dashboard
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {organizedCompetitions.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
              <TrophyIcon className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-900 mb-2">No Competitions Yet</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Create your first Last Man Standing competition to start engaging your community. 
              Setup is quick and easy with our guided process.
            </p>
            <Link
              href="/competition/create"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Competition
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}