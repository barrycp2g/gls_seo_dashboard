import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// TypeScript interfaces matching the actual API structure
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

interface KeywordType {
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
  keywordTypesBrand: KeywordType[];
  keywordTypesNonBrand: KeywordType[];
  longTailKeywords: LongTailKeyword[];
  competitors: Competitor[];
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Cache hook for API responses
const useCache = <T,>(key: string, ttl: number = 5 * 60 * 1000) => {
  const cache = useRef<Map<string, CacheItem<T>>>(new Map());

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
    cache.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  return { get, set, clear };
};

// Optimized Pagination Hook
const usePagination = <T,>(data: T[], initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { totalPages, totalItems, paginatedData, startItem, endItem } = useMemo(() => {
    const total = data.length;
    const pages = Math.ceil(total / pageSize);
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    
    return {
      totalPages: pages,
      totalItems: total,
      paginatedData: data.slice(start, end),
      startItem: total === 0 ? 0 : start + 1,
      endItem: end
    };
  }, [data, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  }, [currentPage]);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    paginatedData,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize: changePageSize,
    pageInfo: { startItem, endItem, totalItems }
  };
};

// Memoized Pagination Controls
const PaginationControls = React.memo(({ pagination }: { pagination: any }) => {
  const { 
    currentPage, 
    totalPages, 
    pageSize, 
    pageInfo, 
    hasNextPage, 
    hasPreviousPage, 
    goToPage, 
    goToNextPage, 
    goToPreviousPage, 
    setPageSize 
  } = pagination;

  if (pageInfo.totalItems === 0) {
    return <div className="p-4 text-center text-gray-500">No data available</div>;
  }

  const pageSizes = [5, 10, 25, 50];
  const maxVisiblePages = 5;
  
  const getPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-3 md:px-4 py-3 bg-white border-t border-gray-200 space-y-3 sm:space-y-0">
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs md:text-sm text-gray-700">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#061ab1] focus:border-[#061ab1]"
          >
            {pageSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-xs md:text-sm text-gray-700">per page</span>
        </div>
        <div className="text-xs md:text-sm text-gray-700 text-center sm:text-left">
          Showing {pageInfo.startItem} to {pageInfo.endItem} of {pageInfo.totalItems}
        </div>
      </div>
      
      <div className="flex items-center space-x-1 md:space-x-2">
        <button
          onClick={goToPreviousPage}
          disabled={!hasPreviousPage}
          className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        
        <div className="flex space-x-1">
          {currentPage > 3 && totalPages > maxVisiblePages && (
            <>
              <button
                onClick={() => goToPage(1)}
                className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded hover:bg-gray-50"
              >
                1
              </button>
              <span className="px-1 md:px-2 py-1 text-xs md:text-sm text-gray-500">...</span>
            </>
          )}
          
          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`px-2 md:px-3 py-1 text-xs md:text-sm border rounded transition-colors ${
                page === currentPage 
                  ? 'bg-[#061ab1] text-white border-[#061ab1]' 
                  : 'hover:bg-gray-50 hover:border-[#061ab1]'
              }`}
            >
              {page}
            </button>
          ))}
          
          {currentPage < totalPages - 2 && totalPages > maxVisiblePages && (
            <>
              <span className="px-1 md:px-2 py-1 text-xs md:text-sm text-gray-500">...</span>
              <button
                onClick={() => goToPage(totalPages)}
                className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        
        <button
          onClick={goToNextPage}
          disabled={!hasNextPage}
          className="px-2 md:px-3 py-1 text-xs md:text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
});

// API service with real Sheety endpoints
class APIService {
  static baseUrl = 'https://api.sheety.co/5bcc5e9b5a9271eb36b750afdfe11bae/bcSeoDashboard';

  static async fetchSEOData(): Promise<SEOData> {
    try {
      const [domainInfoRes, keywordTypesBrandRes, keywordTypesNonBrandRes, longTailKeywordsRes, competitorsRes] = 
        await Promise.all([
          fetch(`${this.baseUrl}/domainInfo`),
          fetch(`${this.baseUrl}/keywordTypesBrand`),
          fetch(`${this.baseUrl}/keywordTypesNonBrand`),
          fetch(`${this.baseUrl}/longTailKeywords`),
          fetch(`${this.baseUrl}/competitors`)
        ]);

      const [domainInfo, keywordTypesBrand, keywordTypesNonBrand, longTailKeywords, competitors] = 
        await Promise.all([
          domainInfoRes.json(),
          keywordTypesBrandRes.json(),
          keywordTypesNonBrandRes.json(),
          longTailKeywordsRes.json(),
          competitorsRes.json()
        ]);

      // Map colors to keyword types
      const keywordColors = {
        'Informational': '#061ab1',
        'Commercial': '#4d5fc7',
        'Transactional': '#F59E0B',
        'Navigational': '#94a3b8'
      };

      // Add colors to keyword types
      const brandWithColors = keywordTypesBrand.keywordTypesBrand.map(item => ({
        ...item,
        color: keywordColors[item.name] || '#666666'
      }));

      const nonBrandWithColors = keywordTypesNonBrand.keywordTypesNonBrand.map(item => ({
        ...item,
        color: keywordColors[item.name] || '#666666'
      }));

      return {
        domainInfo: domainInfo.domainInfo,
        keywordTypesBrand: brandWithColors,
        keywordTypesNonBrand: nonBrandWithColors,
        longTailKeywords: longTailKeywords.longTailKeywords,
        competitors: competitors.competitors
      };
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      throw error;
    }
  }
}

// Pie Chart Component
const PieChart = ({ data }: { data: KeywordType[] }) => {
  if (!data || data.length === 0) return null;

  const size = 200;
  const center = size / 2;
  const radius = 80;

  let cumulativePercentage = 0;
  const paths = data.map((item, index) => {
    const percentage = item.percent || 0;
    const startAngle = (cumulativePercentage * 360) / 100 - 90;
    const endAngle = ((cumulativePercentage + percentage) * 360) / 100 - 90;
    cumulativePercentage += percentage;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArcFlag = percentage > 50 ? 1 : 0;

    if (percentage < 0.1) return null;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return (
      <g key={index}>
        <path
          d={pathData}
          fill={item.color}
          stroke="white"
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity cursor-pointer"
        />
        {percentage > 10 && (
          <text
            x={center + (radius * 0.7) * Math.cos((startAngleRad + endAngleRad) / 2)}
            y={center + (radius * 0.7) * Math.sin((startAngleRad + endAngleRad) / 2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="14"
            fontWeight="bold"
          >
            {Math.round(percentage)}%
          </text>
        )}
      </g>
    );
  }).filter(Boolean);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="max-w-full">
      <circle cx={center} cy={center} r={radius} fill="#f3f4f6" />
      {paths}
    </svg>
  );
};

// Main Dashboard Component
const SEODashboard = () => {
  const [selectedCountry, setSelectedCountry] = useState('PL');
  const [selectedLanguage, setSelectedLanguage] = useState('native');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SEOData | null>(null);
  
  const cache = useCache<SEOData>('seoData');
  const abortControllerRef = useRef<AbortController | null>(null);

  const countries = [
    { code: 'PL', name: 'Poland', native: 'PL-PL', english: 'PL-EN' },
    { code: 'ES', name: 'Spain', native: 'ES-ES', english: 'ES-EN' },
    { code: 'FR', name: 'France', native: 'FR-FR', english: 'FR-EN' },
    { code: 'DE', name: 'Germany', native: 'DE-DE', english: 'DE-EN' }
  ];

  // Load data with caching
  const loadData = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'all-seo-data';
    
    if (!forceRefresh) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const seoData = await APIService.fetchSEOData();
      cache.set(cacheKey, seoData);
      setData(seoData);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Failed to load SEO data. Please try again.');
        console.error('Error loading data:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cache]);

  // Initial data load
  useEffect(() => {
    loadData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  // Data transformation
  const getCurrentCountry = useCallback(() => 
    countries.find(c => c.code === selectedCountry), [selectedCountry, countries]
  );
  
  const getCurrentTag = useCallback(() => {
    const country = getCurrentCountry();
    return selectedLanguage === 'native' ? country?.native : country?.english;
  }, [getCurrentCountry, selectedLanguage]);

  const transformedData = useMemo(() => {
    if (!data) {
      return {
        domainInfo: null,
        brandKeywords: [],
        nonBrandKeywords: [],
        longTailKeywords: [],
        competitors: []
      };
    }

    const currentTag = getCurrentTag();
    
    return {
      domainInfo: data.domainInfo.find(d => d.country_code === currentTag) || null,
      brandKeywords: data.keywordTypesBrand.filter(k => k.country_code === currentTag),
      nonBrandKeywords: data.keywordTypesNonBrand.filter(k => k.country_code === currentTag),
      longTailKeywords: data.longTailKeywords.filter(k => k.country_code === currentTag),
      competitors: data.competitors.filter(c => c.country_code === selectedCountry)
    };
  }, [data, getCurrentTag, selectedCountry]);

  // Pagination instances
  const keywordsPagination = usePagination(transformedData.longTailKeywords, 10);
  const competitorsPagination = usePagination(transformedData.competitors, 5);

  // Utility functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }, []);

  const getPositionColor = useCallback((position: number) => {
    if (position <= 3) return 'bg-green-500 text-white';
    if (position <= 10) return 'bg-yellow-500 text-white';
    if (position <= 20) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  }, []);

  const getDifficultyColor = useCallback((difficulty: number) => {
    if (difficulty <= 30) return 'bg-green-500';
    if (difficulty <= 50) return 'bg-yellow-500';
    if (difficulty <= 70) return 'bg-orange-500';
    return 'bg-red-500';
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#061ab1] mx-auto"></div>
          <p className="mt-4 text-xl font-semibold text-gray-700">Loading SEO Dashboard...</p>
          <p className="text-gray-500">Fetching data from APIs</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-700">{error}</p>
          <button 
            onClick={() => loadData(true)}
            className="mt-4 px-4 py-2 bg-[#061ab1] text-white rounded hover:bg-[#0515a0] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white text-gray-800 p-4 md:p-6 shadow-lg relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="bg-gray-50 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-sm">
                <img 
                  src="https://barrycp2g.sirv.com/logo.png"
                  alt="Parcel2Go"
                  className="h-7 md:h-9"
                />
              </div>
              <div className="bg-gray-50 px-3 py-2 md:px-4 md:py-3 rounded-lg shadow-sm">
                <img 
                  src="https://barrycp2g.sirv.com/gls-logo-png_seeklogo-428620.png"
                  alt="GLS"
                  className="h-8 md:h-11"
                />
              </div>
            </div>
            <div className="text-left md:text-right">
              <h1 className="text-xl md:text-2xl font-bold text-[#061ab1]">Multi-Country SEO Dashboard</h1>
              <p className="text-sm md:text-base text-gray-600">Comprehensive keyword analysis across European markets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Separator */}
      <div className="h-1 bg-gradient-to-r from-[#061ab1] via-[#4d5fc7] to-[#061ab1] opacity-20"></div>

      {/* Country Tabs */}
      <div className="bg-white shadow-md border-b relative z-10">
        <div className="max-w-7xl mx-auto px-3 md:px-6">
          <div className="flex overflow-x-auto scrollbar-hide space-x-1">
            {countries.map(country => (
              <button
                key={country.code}
                className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 font-medium border-b-3 transition-all ${
                  selectedCountry === country.code
                    ? 'border-[#061ab1] text-[#061ab1] bg-blue-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-[#061ab1]'
                }`}
                onClick={() => setSelectedCountry(country.code)}
              >
                <span className="text-base md:text-lg">{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Language Toggle & Refresh */}
      <div className="bg-gray-50 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <span className="text-xs md:text-sm font-medium text-gray-700">Language:</span>
              <button
                onClick={() => setSelectedLanguage(prev => prev === 'native' ? 'english' : 'native')}
                className={`relative inline-block w-12 md:w-14 h-6 md:h-7 rounded-full transition-colors duration-200 ease-in-out ${
                  selectedLanguage === 'english' ? 'bg-[#061ab1]' : 'bg-gray-400'
                }`}
              >
                <div className={`absolute left-0.5 md:left-1 top-0.5 md:top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
                  selectedLanguage === 'english' ? 'transform translate-x-6 md:translate-x-7' : ''
                }`}></div>
              </button>
              <span className="text-xs md:text-sm font-medium text-gray-600">
                {selectedLanguage === 'native' ? `Native (${getCurrentTag()})` : `English (${getCurrentTag()})`}
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline border-l pl-3 ml-2">
                {transformedData.longTailKeywords.length} keywords • {transformedData.competitors.length} competitors
              </span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="flex items-center justify-center sm:justify-start px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white hover:bg-gray-100 rounded border border-gray-300 transition-colors shadow-sm"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* Overview Section */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Overview - {getCurrentCountry()?.name}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg transition-shadow col-span-2 md:col-span-1">
              <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Total Keywords</h3>
              <div className="text-2xl md:text-3xl font-bold text-[#061ab1]">
                {transformedData.domainInfo?.total_keywords?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                {transformedData.domainInfo?.domain_name}
              </p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Brand Difficulty</h3>
              <div className="flex items-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mr-2 md:mr-3">
                  {transformedData.domainInfo?.avg_difficulty_brand || '0'}
                </div>
                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${getDifficultyColor(transformedData.domainInfo?.avg_difficulty_brand || 0)}`}></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">Avg score</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Non-Brand Difficulty</h3>
              <div className="flex items-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mr-2 md:mr-3">
                  {transformedData.domainInfo?.avg_difficulty_non_brand || '0'}
                </div>
                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${getDifficultyColor(transformedData.domainInfo?.avg_difficulty_non_brand || 0)}`}></div>
              </div>
              <p className="text-xs text-gray-400 mt-1">Avg score</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-lg transition-shadow col-span-2 md:col-span-1">
              <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1 md:mb-2">Big Opportunities</h3>
              <div className="text-2xl md:text-3xl font-bold text-[#061ab1]">
                {transformedData.domainInfo?.nb_big_kw_opportunities || '0'}
              </div>
              <p className="text-xs text-gray-400 mt-1">High-volume, low-competition</p>
            </div>
          </div>

          {/* Brand vs Non-Brand Split */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Brand vs Non-Brand Split</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-[#061ab1] bg-opacity-10 rounded-lg border border-[#061ab1] border-opacity-20">
                <div className="text-xl md:text-2xl font-bold text-[#061ab1]">
                  {transformedData.domainInfo?.total_keywords_brand?.toLocaleString() || '0'}
                </div>
                <div className="text-sm md:text-base text-gray-700 font-medium">Brand Keywords</div>
                <div className="text-xs text-gray-600 mt-1">
                  {transformedData.domainInfo && transformedData.domainInfo.total_keywords > 0
                    ? `${((transformedData.domainInfo.total_keywords_brand / transformedData.domainInfo.total_keywords) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-3 md:p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-xl md:text-2xl font-bold text-amber-700">
                  {transformedData.domainInfo?.total_keywords_non_brand?.toLocaleString() || '0'}
                </div>
                <div className="text-sm md:text-base text-gray-700 font-medium">Non-Brand Keywords</div>
                <div className="text-xs text-gray-600 mt-1">
                  {transformedData.domainInfo && transformedData.domainInfo.total_keywords > 0
                    ? `${((transformedData.domainInfo.total_keywords_non_brand / transformedData.domainInfo.total_keywords) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyword Types */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Keyword Types - {getCurrentTag()}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Brand Keywords Pie Chart */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                Brand Keywords Distribution
              </h3>
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[200px]">
                  <PieChart data={transformedData.brandKeywords} />
                </div>
                <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 w-full">
                  {transformedData.brandKeywords.map((type, index) => (
                    <div key={index} className="flex items-center text-xs md:text-sm">
                      <div 
                        className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full mr-1.5 md:mr-2 flex-shrink-0" 
                        style={{ backgroundColor: type.color }}
                      ></div>
                      <span className="text-gray-600 truncate">{type.name}: {type.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Non-Brand Keywords Pie Chart */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">
                Non-Brand Keywords Distribution
              </h3>
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[200px]">
                  <PieChart data={transformedData.nonBrandKeywords} />
                </div>
                <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 w-full">
                  {transformedData.nonBrandKeywords.map((type, index) => (
                    <div key={index} className="flex items-center text-xs md:text-sm">
                      <div 
                        className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full mr-1.5 md:mr-2 flex-shrink-0" 
                        style={{ backgroundColor: type.color }}
                      ></div>
                      <span className="text-gray-600 truncate">{type.name}: {type.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Competitors */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            Competitors - {getCurrentCountry()?.name}
          </h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Mobile View */}
            <div className="block md:hidden">
              {competitorsPagination.paginatedData.map((competitor, index) => (
                <div key={index} className="p-4 border-b hover:bg-gray-50">
                  <div className="font-medium text-[#061ab1] mb-2">{competitor.domain}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Relevance:</span>
                      <div className="flex items-center mt-1">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="h-2 rounded-full bg-[#061ab1]"
                            style={{ width: `${(competitor.competitor_relevance || 0) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {((competitor.competitor_relevance || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Common KW:</span>
                      <div className="font-medium">{(competitor.common_keywords || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Organic KW:</span>
                      <div className="font-medium">{(competitor.organic_keywords || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Traffic:</span>
                      <div className="font-medium">{(competitor.organic_traffic || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost:</span>
                      <div className="font-medium">{formatCurrency(competitor.organic_cost)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Ads KW:</span>
                      <div className="font-medium">{(competitor.google_ads_keywords || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance (%)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Common Keywords</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organic Keywords</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organic Traffic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organic Cost ($)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Google Ads Keywords</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {competitorsPagination.paginatedData.map((competitor, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#061ab1]">{competitor.domain}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="h-2 rounded-full bg-[#061ab1]"
                              style={{ width: `${(competitor.competitor_relevance || 0) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {((competitor.competitor_relevance || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{(competitor.common_keywords || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{(competitor.organic_keywords || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{(competitor.organic_traffic || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(competitor.organic_cost)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{(competitor.google_ads_keywords || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={competitorsPagination} />
          </div>
        </div>

        {/* Long-tail Keywords */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            Long-tail Keywords - {getCurrentTag()}
          </h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Mobile View */}
            <div className="block md:hidden">
              {keywordsPagination.paginatedData.map((keyword, index) => (
                <div key={index} className="p-4 border-b hover:bg-gray-50">
                  <div className="font-medium text-gray-900 mb-2">{keyword.keyword}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Position:</span>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${getPositionColor(keyword.position)}`}>
                        {keyword.position}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Volume:</span>
                      <div className="font-medium">{(keyword.volume || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <div className="flex items-center mt-1">
                        <div className="w-12 bg-gray-200 rounded-full h-1.5 mr-1">
                          <div 
                            className={`h-1.5 rounded-full ${getDifficultyColor(keyword.difficulty)}`}
                            style={{ width: `${keyword.difficulty}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{keyword.difficulty}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Traffic:</span>
                      <div className="font-medium">{(keyword.traffic || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">CPC:</span>
                      <div className="font-medium">{formatCurrency(keyword.CPC)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Intent:</span>
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          keyword.intent === 'Commercial' ? 'bg-emerald-100 text-emerald-800' :
                          keyword.intent === 'Informational' ? 'bg-[#061ab1] bg-opacity-10 text-[#061ab1]' :
                          keyword.intent === 'Transactional' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {keyword.intent}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traffic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keywordsPagination.paginatedData.map((keyword, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{keyword.keyword}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getPositionColor(keyword.position)}`}>
                          {keyword.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{(keyword.volume || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${getDifficultyColor(keyword.difficulty)}`}
                              style={{ width: `${keyword.difficulty}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{keyword.difficulty}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{(keyword.traffic || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(keyword.CPC)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          keyword.intent === 'Commercial' ? 'bg-emerald-100 text-emerald-800' :
                          keyword.intent === 'Informational' ? 'bg-[#061ab1] bg-opacity-10 text-[#061ab1]' :
                          keyword.intent === 'Transactional' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {keyword.intent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={keywordsPagination} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#061ab1] text-white p-6 text-center">
        <p className="text-sm font-medium">© BC 2025 Parcel2Go × GLS - Multi-Country SEO Dashboard</p>
        <p className="text-xs text-blue-200 mt-1">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default SEODashboard;
