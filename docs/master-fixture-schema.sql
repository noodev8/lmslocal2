-- Master Fixture System Schema
-- Allows sharing Premier League fixtures across multiple competitions
-- without duplication, while supporting competitions at different rounds

-- Master fixtures table - contains all Premier League fixtures for a season
CREATE TABLE public.master_fixture (
    id SERIAL PRIMARY KEY,
    home_team VARCHAR(100) NOT NULL,
    away_team VARCHAR(100) NOT NULL,  
    home_team_short VARCHAR(20),
    away_team_short VARCHAR(20),
    kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
    season VARCHAR(20) NOT NULL,  -- e.g. "2024-25"
    match_week INTEGER NOT NULL,  -- Premier League matchweek (1-38)
    result VARCHAR(100),          -- Actual Premier League result
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate fixtures in same season
    UNIQUE(home_team, away_team, season, match_week)
);

-- Link competitions to master fixtures at different round numbers
CREATE TABLE public.competition_master_fixture (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competition(id),
    master_fixture_id INTEGER NOT NULL REFERENCES master_fixture(id),
    round_number INTEGER NOT NULL,  -- Which round this fixture appears in THIS competition
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure no duplicate fixtures in same competition/round
    UNIQUE(competition_id, master_fixture_id),
    UNIQUE(competition_id, round_number, master_fixture_id)
);

-- Indexes for performance
CREATE INDEX idx_master_fixture_season ON master_fixture(season);
CREATE INDEX idx_master_fixture_matchweek ON master_fixture(season, match_week);
CREATE INDEX idx_master_fixture_kickoff ON master_fixture(kickoff_time);
CREATE INDEX idx_competition_master_fixture_comp ON competition_master_fixture(competition_id);
CREATE INDEX idx_competition_master_fixture_round ON competition_master_fixture(competition_id, round_number);

-- Migration strategy:
-- 1. Import all Premier League fixtures into master_fixture table
-- 2. For existing competitions, link their current fixtures to master_fixture via competition_master_fixture
-- 3. Update fixture creation flow to:
--    a) Select from master_fixture
--    b) Create competition_master_fixture links instead of duplicate fixture records
-- 4. Update fixture queries to JOIN through competition_master_fixture to master_fixture

-- Example usage:
-- Competition A uses Premier League Week 1 fixtures as Round 1
-- Competition B uses Premier League Week 1 fixtures as Round 3  
-- Competition C uses Premier League Week 5 fixtures as Round 1
-- All three competitions share the same master fixture data