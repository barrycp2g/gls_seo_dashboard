import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// TypeScript interfaces matching Sheety API schema
interface DomainInfo {
  country_name: string;
  country_code: string;
  domain_name: string;
  total_keywords: number;
  total_keywords_brand: number;
  total_keywords_non_brand: number;
  avg_difficulty_brand: number;
  avg_difficulty_non_brand: number;
  nb_big_kw_opportunities: number;
}

interface KeywordTypeItem {
  country_code: string;
  name: string;
  percent: number;
  color: string;
}

interface LongTailKeyword {
  country_code: string;
  keyword: string;
  tag: string;
  position: number;
  volume: number;
  difficulty: number;
  traffic: number;
  CPC: number;
  position_type: string;
  intent: string;
}

interface Competitor {
  country_code: string;
  country_name: string;
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
  keywordTypesBrand: KeywordTypeItem[];
  keywordTypesNonBrand: KeywordTypeItem[];
  longTailKeywords: LongTailKeyword[];
  competitors: Competitor[];
}

// Cache hook for API responses
const useCache = <T,>(key: string, ttl: number = 5 * 60 * 1000) => {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const item = cache.current.get(cacheKey);
    if (!item) return null;
    if (Date.now() - item.timestamp > ttl) {
      cache.current.delete(cacheKey);
      return null;
    }
    return item.data;
  }, [ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    cache.current.set(cacheKey, { data, timestamp: Date.now() });
  }, []);

  return { get, set };
};

// Pagination hook (unchanged)
const usePagination = <T,>(data: T[], initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { totalPages, totalItems, paginatedData } = useMemo(() => {
    const total = data.length;
    const pages = Math.ceil(total / pageSize);
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    return {
      totalPages: pages,
      totalItems: total,
      paginatedData: data.slice(start, end)
    };
  }, [data, currentPage, pageSize]);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    paginatedData,
    currentPage,
    totalPages,
    totalItems,
    setPageSize: changePageSize,
    setCurrentPage
  };
};

// PieChart component
const PieChart = ({ data }: { data: KeywordTypeItem[] }) => {
  if (!data || data.length === 0) return null;
  const size = 200;
  const center = size / 2;
  const radius = 80;

  let cumulative = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      <circle cx={center} cy={center} r={radius} fill="#f3f4f6" />
      {data.map((d, i) => {
        const startAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((cumulative + d.percent) / 100) * 2 * Math.PI - Math.PI / 2;
        cumulative += d.percent;
        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        const largeArcFlag = d.percent > 50 ? 1 : 0;
        const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        return (
          <path
            key={i}
            d={pathData}
            fill={d.color}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};

// API service with safe defaults and key mapping
class APIService {
  static baseUrl = 'https://api.sheety.co/5bcc5e9b5a9271eb36b750afdfe11bae/bcSeoDashboard';

  static async fetchSEOData(): Promise<SEOData> {
    // Attempt all fetches in parallel
    const endpoints = [
      'domainInfo',
      'keywordTypesBrand',
      'keywordTypesNonBrand',
      'longTailKeywords',
      'competitors'
    ];
    const fetches = endpoints.map(path =>
      fetch(`${this.baseUrl}/${path}`).then(r => r.json()).catch(() => null)
    );
    const [dom, br, nbr, lt, cp] = await Promise.all(fetches);

    // Guard against missing data
    const rawDomain = dom?.domainInfo ?? [];
    const rawBrand = br?.keywordTypesBrand ?? [];
    const rawNonBrand = nbr?.keywordTypesNonBrand ?? [];
    const rawLongTail = lt?.longTailKeywords ?? [];
    const rawComp = cp?.competitors ?? [];

    // Color map for keyword types
    const keywordColors: Record<string,string> = {
      Informational: '#061ab1',
      Commercial:    '#4d5fc7',
      Transactional: '#F59E0B',
      Navigational:  '#94a3b8'
    };

    // Map domain info keys to snake_case
    const domainInfo: DomainInfo[] = rawDomain.map((it: any) => ({
      country_name: it.countryName,
      country_code: it.countryCode,
      domain_name: it.domainName,
      total_keywords: it.totalKeywords,
      total_keywords_brand: it.totalKeywordsBrand,
      total_keywords_non_brand: it.totalKeywordsNonBrand,
      avg_difficulty_brand: it.avgDifficultyBrand,
      avg_difficulty_non_brand: it.avgDifficultyNonBrand,
      nb_big_kw_opportunities: it.nbBigKwOpportunities
    }));

    // Map keyword types
    const keywordTypesBrand: KeywordTypeItem[] = rawBrand.map((it: any) => ({
      country_code: it.countryCode,
      name: it.name,
      percent: it.percent,
      color: keywordColors[it.name] || '#666'
    }));
    const keywordTypesNonBrand: KeywordTypeItem[] = rawNonBrand.map((it: any) => ({
      country_code: it.countryCode,
      name: it.name,
      percent: it.percent,
      color: keywordColors[it.name] || '#666'
    }));

    // Long-tail keywords (keys assumed correct)
    const longTailKeywords: LongTailKeyword[] = rawLongTail.map((it: any) => ({
      country_code: it.countryCode,
      keyword: it.keyword,
      tag: it.tag,
      position: it.position,
      volume: it.volume,
      difficulty: it.difficulty,
      traffic: it.traffic,
      CPC: it.CPC,
      position_type: it.position_type,
      intent: it.intent
    }));

    // Competitors map
    const competitors: Competitor[] = rawComp.map((it: any) => ({
      country_code: it.countryCode,
      country_name: it.countryName,
      domain: it.domain,
      competitor_relevance: it.competitor_relevance,
      common_keywords: it.common_keywords,
      organic_keywords: it.organic_keywords,
      organic_traffic: it.organic_traffic,
      organic_cost: it.organic_cost,
      google_ads_keywords: it.google_ads_keywords
    }));

    return { domainInfo, keywordTypesBrand, keywordTypesNonBrand, longTailKeywords, competitors };
  }
}

// Main Dashboard Component
const SEODashboard: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('PL');
  const [selectedLanguage, setSelectedLanguage] = useState<'native'|'english'>('native');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<SEOData>({ domainInfo: [], keywordTypesBrand: [], keywordTypesNonBrand: [], longTailKeywords: [], competitors: [] });

  const cache = useCache<SEOData>('seoData');
  const abortRef = useRef<AbortController|null>(null);

  const countries = [
    { code: 'PL', native: 'PL-PL', english: 'PL-EN', name: 'Poland' },
    { code: 'ES', native: 'ES-ES', english: 'ES-EN', name: 'Spain' },
    { code: 'FR', native: 'FR-FR', english: 'FR-EN', name: 'France' },
    { code: 'DE', native: 'DE-DE', english: 'DE-EN', name: 'Germany' }
  ];

  const getCurrentTag = useCallback(() => {
    const c = countries.find(c=>c.code===selectedCountry)!;
    return selectedLanguage==='native' ? c.native : c.english;
  }, [selectedCountry, selectedLanguage]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const cacheKey = 'all-seo-data';
    const cached = cache.get(cacheKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const seo = await APIService.fetchSEOData();
      cache.set(cacheKey, seo);
      setData(seo);
    } catch (err) {
      console.error('API fetch failed, using empty data', err);
      setData({ domainInfo: [], keywordTypesBrand: [], keywordTypesNonBrand: [], longTailKeywords: [], competitors: [] });
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    loadData();
    return () => { abortRef.current?.abort(); };
  }, [loadData]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading dashboard…</div>;
  }

  const tag = getCurrentTag();
  const overview = data.domainInfo.find(d=>d.country_code===tag) || null;
  const brandPie = data.keywordTypesBrand.filter(x=>x.country_code===tag);
  const nonBrandPie = data.keywordTypesNonBrand.filter(x=>x.country_code===tag);
  const longTail = data.longTailKeywords.filter(x=>x.country_code===tag);
  const competitors = data.competitors.filter(x=>x.country_code===selectedCountry);

  const kp = usePagination(longTail, 10);
  const cp = usePagination(competitors, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* … your existing JSX, unchanged … */}
    </div>
  );
};

export default SEODashboard;
