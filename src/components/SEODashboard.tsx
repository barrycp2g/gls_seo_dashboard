import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// TypeScript interfaces
interface DomainInfo {
  country_name: string;
  country_code: string;
  total_keywords: number;
  total_keywords_brand: number;
  total_keywords_non_brand: number;
  avg_difficulty_brand: number;
  avg_difficulty_non_brand: number;
  nb_big_kw_opportunities: number;
}

interface KeywordType {
  country_code: string;
  percent: number;
  name: string;
}

interface LongTailKeyword {
  country_code: string;
  keyword: string;
  position: number;
  volume: number;
  difficulty: number;
  traffic: number;
  CPC: number;
  intent: string;
}

interface Competitor {
  country_code: string;
  domain: string;
  competitor_relevance: number;
  common_keywords: number;
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
  google_ads_keywords: number;
}

interface SEOData {
  domainInfo: DomainInfo[];
  keywordTypesBrand: KeywordType[];
  keywordTypesNonBrand: KeywordType[];
  longTailKeywords: LongTailKeyword[];
  competitors: Competitor[];
}

// Cache hook
const useCache = <T,>(ttl: number = 300_000) => {
  const cache = useRef<{ data?: T; ts: number }>({ ts: 0 });
  const get = () => {
    if (Date.now() - cache.current.ts < ttl) return cache.current.data;
    return undefined;
  };
  const set = (data: T) => {
    cache.current = { data, ts: Date.now() };
  };
  return { get, set };
};

// Pagination hook (unchanged) ...

// PieChart component (unchanged) ...

const SEODashboard: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('PL');
  const [selectedLanguage, setSelectedLanguage] = useState<'native' | 'english'>('native');
  const [data, setData] = useState<SEOData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cache = useCache<SEOData>();

  const countries = [
    { code: 'PL', name: 'Poland', native: 'PL-PL', english: 'PL-EN' },
    { code: 'ES', name: 'Spain', native: 'ES-ES', english: 'ES-EN' },
    { code: 'FR', name: 'France', native: 'FR-FR', english: 'FR-EN' },
    { code: 'DE', name: 'Germany', native: 'DE-DE', english: 'DE-EN' },
  ];

  const selectedTag = useMemo(() => {
    const country = countries.find(c => c.code === selectedCountry)!;
    return selectedLanguage === 'native' ? country.native : country.english;
  }, [selectedCountry, selectedLanguage]);

  // Fetch functions
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [domainRes, brandRes, nonBrandRes, longTailRes, compRes] = await Promise.all([
        fetch('https://api.sheety.co/.../domainInfo').then(r => r.json()),
        fetch('https://api.sheety.co/.../keywordTypesBrand').then(r => r.json()),
        fetch('https://api.sheety.co/.../keywordTypesNonBrand').then(r => r.json()),
        fetch('https://api.sheety.co/.../longTailKeywords').then(r => r.json()),
        fetch('https://api.sheety.co/.../competitors').then(r => r.json()),
      ]);
      const seoData: SEOData = {
        domainInfo: domainRes.bcSeoDashboard,
        keywordTypesBrand: brandRes.bcSeoDashboard,
        keywordTypesNonBrand: nonBrandRes.bcSeoDashboard,
        longTailKeywords: longTailRes.bcSeoDashboard,
        competitors: compRes.bcSeoDashboard,
      };
      cache.set(seoData);
      setData(seoData);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    const cached = cache.get();
    if (cached) { setData(cached); setIsLoading(false); }
    else fetchAll();
  }, [fetchAll]);

  // Filtered data
  const filteredDomain = useMemo(() =>
    data?.domainInfo.find(d => d.country_code === selectedTag) ?? null, [data, selectedTag]
  );

  const filteredBrand = useMemo(() =>
    data?.keywordTypesBrand.filter(k => k.country_code === selectedTag) ?? [],
    [data, selectedTag]
  );

  const filteredNonBrand = useMemo(() =>
    data?.keywordTypesNonBrand.filter(k => k.country_code === selectedTag) ?? [],
    [data, selectedTag]
  );

  const filteredLongTail = useMemo(() =>
    data?.longTailKeywords.filter(l => l.country_code === selectedTag) ?? [],
    [data, selectedTag]
  );

  const filteredCompetitors = useMemo(() =>
    data?.competitors.filter(c => c.country_code === selectedCountry) ?? [],
    [data, selectedCountry]
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="...">
      {/* Header, Tabs, Toggle unchanged */}
      {/* Overview using filteredDomain */}
      {/* PieCharts using filteredBrand and filteredNonBrand */}
      {/* Competitors table using filteredCompetitors */}
      {/* Long-tail table using filteredLongTail */}
    </div>
  );
};

export default SEODashboard;
