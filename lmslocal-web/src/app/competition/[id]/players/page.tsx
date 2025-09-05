'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  TrophyIcon,
  ArrowLeftIcon,
  UserIcon,
  TrashIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { competitionApi, adminApi, offlinePlayerApi, Competition, Player } from '@/lib/api';
import { useAppData } from '@/contexts/AppDataContext';
import ConfirmationModal from '@/components/ConfirmationModal';


export default function CompetitionPlayersPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = parseInt(params.id as string);
  
  const [competition, setCompetition] = useState<Competition | null>(null);
  
  // Use AppDataProvider context to avoid redundant API calls
  const { competitions } = useAppData();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{ id: number; name: string } | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [updatingPayment, setUpdatingPayment] = useState<Set<number>>(new Set());
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerForm, setAddPlayerForm] = useState({ display_name: '', email: '' });
  const abortControllerRef = useRef<AbortController | null>(null);

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
          await loadPlayers();
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
  }, [competitionId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlayers = useCallback(async () => {
    if (abortControllerRef.current?.signal.aborted) return;
    
    try {
      // Use cached API call with 30-second TTL for player data
      const response = await competitionApi.getPlayers(competitionId);
      if (abortControllerRef.current?.signal.aborted) return;
      
      if (response.data.return_code === 'SUCCESS') {
        // Get competition from context if available, otherwise from API response
        const competitionFromContext = competitions?.find(c => c.id === competitionId);
        setCompetition(competitionFromContext || response.data.competition as Competition);
        setPlayers(response.data.players as Player[]);
      } else {
        console.error('Failed to load players:', response.data.message);
        router.push(`/competition/${competitionId}/dashboard`);
      }
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return;
      console.error('Failed to load players:', error);
      router.push('/dashboard');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [competitionId, router, competitions]);

  const handleRemovePlayerClick = (playerId: number, playerName: string) => {
    setPlayerToRemove({ id: playerId, name: playerName });
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!playerToRemove) return;

    const { id: playerId } = playerToRemove;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: playerName } = playerToRemove;
    setRemoving(prev => new Set(prev).add(playerId));
    
    try {
      const response = await competitionApi.removePlayer(competitionId, playerId);
      
      if (response.data.return_code === 'SUCCESS') {
        // Remove player from local state
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        
        // Update competition player count if available
        setCompetition(prev => prev ? { 
          ...prev, 
          player_count: (prev.player_count || 0) - 1 
        } : null);
      } else {
        console.error('Failed to remove player:', response.data.message);
        alert(`Failed to remove player: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Failed to remove player:', error);
      alert('Failed to remove player due to network error');
    } finally {
      setRemoving(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
      setShowConfirmModal(false);
      setPlayerToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmModal(false);
    setPlayerToRemove(null);
  };


  const handleAddOfflinePlayer = async () => {
    if (!competition || !addPlayerForm.display_name.trim()) return;

    setAddingPlayer(true);
    
    try {
      const response = await offlinePlayerApi.addOfflinePlayer(
        competition.id,
        addPlayerForm.display_name.trim(),
        addPlayerForm.email.trim() || undefined
      );
      
      if (response.data.return_code === 'SUCCESS') {
        // Reload players list to show the new player
        await loadPlayers();
        
        // Reset form and close modal
        setAddPlayerForm({ display_name: '', email: '' });
        setShowAddPlayerModal(false);
      } else {
        alert(`Failed to add offline player: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add offline player:', error);
      alert('Failed to add offline player. Please try again.');
    } finally {
      setAddingPlayer(false);
    }
  };

  const handlePaymentToggle = async (playerId: number, currentPaid: boolean) => {
    if (!competition || updatingPayment.has(playerId)) return;
    
    setUpdatingPayment(prev => new Set([...prev, playerId]));
    
    try {
      const response = await adminApi.updatePaymentStatus(
        competition.id,
        playerId,
        !currentPaid, // Toggle the payment status
        undefined, // No amount for now
        !currentPaid ? new Date().toISOString() : undefined // Set current time if marking as paid
      );
      
      if (response.data.return_code === 'SUCCESS') {
        // Update the local state
        setPlayers(prev => prev.map(player => 
          player.id === playerId 
            ? { 
                ...player, 
                paid: !currentPaid,
                paid_date: !currentPaid ? new Date().toISOString() : undefined
              }
            : player
        ));
      } else {
        alert(`Failed to update payment status: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update payment:', error);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setUpdatingPayment(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

  // Filter players based on payment status
  const filteredPlayers = players.filter(player => {
    if (paymentFilter === 'paid') return player.paid;
    if (paymentFilter === 'unpaid') return !player.paid;
    return true; // 'all'
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-400 border-t-transparent"></div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Loading Players</h3>
          <p className="text-slate-500">Please wait while we fetch player data...</p>
        </div>
      </div>
    );
  }

  const activePlayers = filteredPlayers.filter(p => p.status === 'active');
  
  // Payment summary
  const paidCount = players.filter(p => p.paid).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={`/competition/${competitionId}/dashboard`} className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="font-medium">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center space-x-3">
                <TrophyIcon className="h-6 w-6 text-slate-800" />
                <h1 className="text-lg font-semibold text-slate-900">Player Management</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {competition?.access_code && (
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  Add Player
                </button>
              )}
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
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{competition?.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span>{players.length} total</span>
                <span>•</span>
                <span>{activePlayers.length} active</span>
                <span>•</span>
                <span>{paidCount}/{players.length} paid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Access Code */}
          {competition?.access_code && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600">Join code:</span>
              <code className="px-2 py-1 bg-slate-100 text-slate-900 rounded font-mono text-sm font-medium">{competition.access_code}</code>
              <button
                onClick={() => navigator.clipboard.writeText(competition.access_code!)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                copy
              </button>
            </div>
          )}
          
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                paymentFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                paymentFilter === 'paid'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                paymentFilter === 'unpaid'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unpaid
            </button>
          </div>
        </div>

        {/* Players List - Simplified */}
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {filteredPlayers.map((player) => (
            <div key={player.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-slate-900 truncate">{player.display_name}</p>
                        {player.status === 'eliminated' && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">OUT</span>
                        )}
                        {player.is_managed && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Managed</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 truncate">{player.email || 'No email'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Status & Actions */}
                <div className="flex items-center space-x-4">
                  {/* Lives */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900">{player.lives_remaining}</p>
                    <p className="text-xs text-slate-500">lives</p>
                  </div>

                  {/* Payment Status */}
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {player.paid ? (
                        <span className="text-slate-600">Paid</span>
                      ) : (
                        <span className="text-slate-600">Unpaid</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePaymentToggle(player.id, player.paid)}
                      disabled={updatingPayment.has(player.id)}
                      className="p-1 text-slate-500 hover:text-slate-700 rounded transition-colors disabled:opacity-50"
                      title={player.paid ? 'Mark unpaid' : 'Mark paid'}
                    >
                      {updatingPayment.has(player.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-slate-400 border-t-transparent"></div>
                      ) : (
                        <CurrencyDollarIcon className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleRemovePlayerClick(player.id, player.display_name)}
                      disabled={removing.has(player.id)}
                      className="p-1 text-slate-500 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                      title="Remove player"
                    >
                      {removing.has(player.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-slate-400 border-t-transparent"></div>
                      ) : (
                        <TrashIcon className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Players State */}
        {players.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <h3 className="text-lg font-medium text-slate-900 mb-2">No players yet</h3>
            <p className="text-slate-600 mb-4">
              Share your join code to get players started.
            </p>
            {competition?.access_code && (
              <div className="inline-flex items-center space-x-2">
                <code className="px-3 py-1 bg-slate-100 text-slate-900 rounded font-mono font-medium">{competition.access_code}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(competition.access_code!)}
                  className="text-slate-500 hover:text-slate-700 underline text-sm"
                >
                  copy
                </button>
              </div>
            )}
          </div>
        )}

      </main>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        title="Remove Player"
        message={playerToRemove ? `Are you sure you want to remove ${playerToRemove.name} from the competition? This will delete all their picks and progress data and cannot be undone.` : ''}
        confirmText="Remove Player"
        isLoading={playerToRemove ? removing.has(playerToRemove.id) : false}
      />

      {/* Add Offline Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mr-4">
                  <UserIcon className="h-6 w-6 text-slate-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Add Offline Player</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="display_name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Player Name *
                  </label>
                  <input
                    id="display_name"
                    type="text"
                    value={addPlayerForm.display_name}
                    onChange={(e) => setAddPlayerForm(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Enter player name"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm transition-colors"
                    disabled={addingPlayer}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={addPlayerForm.email}
                    onChange={(e) => setAddPlayerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="player@email.com"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm transition-colors"
                    disabled={addingPlayer}
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-600">
                    💡 This creates a managed player that you can set picks for on the fixtures page. Perfect for customers without smartphones.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    setAddPlayerForm({ display_name: '', email: '' });
                  }}
                  disabled={addingPlayer}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOfflinePlayer}
                  disabled={addingPlayer || !addPlayerForm.display_name.trim()}
                  className="px-6 py-3 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {addingPlayer ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Adding Player...
                    </div>
                  ) : (
                    'Add Player'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}