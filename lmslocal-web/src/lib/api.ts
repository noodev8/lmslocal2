import axios from 'axios';

const API_BASE_URL = 'http://localhost:3015';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  return_code: string;
  [key: string]: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateCompetitionRequest {
  name: string;
  description?: string;
  access_code?: string;
  slug?: string;
}

// Auth API calls
export const authApi = {
  login: (data: LoginRequest) => api.post<ApiResponse<{ token: string; user: any }>>('/login', data),
  register: (data: RegisterRequest) => api.post<ApiResponse<{ token: string; user: any }>>('/register', data),
  forgotPassword: (email: string) => api.post<ApiResponse<any>>('/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post<ApiResponse<any>>('/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post<ApiResponse<any>>('/verify-email', { token }),
  resendVerification: (email: string) => api.post<ApiResponse<any>>('/resend-verification', { email }),
};

// Player auth API calls (magic link system)
export const playerApi = {
  login: (email: string, competition_slug?: string) => api.post<ApiResponse<any>>('/player-login', { email, competition_slug }),
  loginGeneral: (email: string) => api.post<ApiResponse<any>>('/player-login-general', { email }),
  verifyToken: (token: string) => api.post<ApiResponse<{ user: any }>>('/verify-player-token', { token }),
  joinCompetition: (access_code: string) => api.post<ApiResponse<any>>('/join-competition', { access_code }),
  joinBySlug: (slug: string) => api.post<ApiResponse<any>>('/join-competition-by-slug', { slug }),
  registerAndJoin: (name: string, email: string, access_code: string) => api.post<ApiResponse<any>>('/register-and-join-competition', { name, email, access_code }),
};

// Competition API calls
export const competitionApi = {
  create: (data: CreateCompetitionRequest) => api.post<ApiResponse<{ competition_id: string }>>('/create-competition', data),
  getMyCompetitions: () => api.post<ApiResponse<{ competitions: any[] }>>('/mycompetitions', {}),
  getBySlug: (slug: string) => api.post<ApiResponse<{ competition: any }>>('/get-competition-by-slug', { slug }),
  lockUnlock: (competition_id: string, is_locked: boolean) => api.post<ApiResponse<any>>('/lock-unlock-competition', { competition_id, is_locked }),
  validateAccessCode: (access_code: string) => api.post<ApiResponse<{ competition: any }>>('/validate-access-code', { access_code }),
  joinByAccessCode: (access_code: string) => api.post<ApiResponse<any>>('/join-by-access-code', { access_code }),
};

// Round API calls
export const roundApi = {
  create: (competition_id: string, lock_time: string) => 
    api.post<ApiResponse<{ round_id: string }>>('/create-round', { competition_id: parseInt(competition_id), lock_time }),
  getRounds: (competition_id: number) => api.post<ApiResponse<{ rounds: any[] }>>('/get-rounds', { competition_id }),
  update: (round_id: string, updates: any) => api.post<ApiResponse<any>>('/update-round', { round_id, ...updates }),
  getPlayerCurrentRound: (competition_id: string) => api.post<ApiResponse<{ round: any }>>('/get-player-current-round', { competition_id }),
};

// Fixture API calls
export const fixtureApi = {
  add: (round_id: string, home_team: string, away_team: string, kick_off_time: string) =>
    api.post<ApiResponse<{ fixture_id: string }>>('/add-fixture', { round_id, home_team, away_team, kick_off_time }),
  addBulk: (round_id: string, fixtures: any[]) => api.post<ApiResponse<any>>('/add-fixtures-bulk', { round_id, fixtures }),
  replaceBulk: (round_id: string, fixtures: any[]) => api.post<ApiResponse<any>>('/replace-fixtures-bulk', { round_id, fixtures }),
  get: (round_id: string) => api.post<ApiResponse<{ fixtures: any[] }>>('/get-fixtures', { round_id: parseInt(round_id) }),
  modify: (fixture_id: string, updates: any) => api.post<ApiResponse<any>>('/modify-fixture', { fixture_id, ...updates }),
  delete: (fixture_id: string) => api.post<ApiResponse<any>>('/delete-fixture', { fixture_id }),
  setResult: (fixture_id: string, home_score: number, away_score: number, admin_note?: string) =>
    api.post<ApiResponse<any>>('/set-fixture-result', { fixture_id, home_score, away_score, admin_note }),
};

// Team API calls
export const teamApi = {
  getTeams: () => api.post<ApiResponse<{ teams: any[] }>>('/get-teams', {}),
  getTeamLists: () => api.post<ApiResponse<{ team_lists: any[] }>>('/team-lists', {}),
};

// Player actions
export const playerActionApi = {
  setPick: (round_id: string, team_name: string) => api.post<ApiResponse<any>>('/set-pick', { round_id, team_name }),
  calculateResults: (round_id: string) => api.post<ApiResponse<any>>('/calculate-results', { round_id }),
};

// User profile
export const userApi = {
  updateProfile: (updates: any) => api.post<ApiResponse<any>>('/update-profile', updates),
};

export default api;