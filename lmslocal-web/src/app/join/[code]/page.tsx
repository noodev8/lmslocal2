'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import JoinCompetitionPage from '../page';

export default function JoinWithCodePage() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Pre-fill the competition code from URL
    if (params.code && typeof params.code === 'string') {
      const code = params.code.toUpperCase();
      // Set a URL search param that the main join page can read
      const url = new URL(window.location.href);
      url.pathname = '/join';
      url.searchParams.set('code', code);
      window.history.replaceState({}, '', url.toString());
    }
  }, [params.code]);

  if (!mounted) {
    return null;
  }

  // Render the main join page component
  return <JoinCompetitionPage />;
}