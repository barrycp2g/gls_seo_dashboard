import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Type definitions matching Sheety responses
interface DomainInfo {
  countryName: string;
  countryCode: string;
  domainName: string;
  totalKeywords: number;
  totalKeywordsBrand: number;
  totalKeywordsNonBrand: number;
  avgDifficultyBrand: number;
  avgDifficultyNonBrand: number;
  nbBigKwOpportunities: number;
}

interface KeywordTypeItem {
  countryCode: string;
  name: string;
  percent: number;
}

interface LongTailKeyword {
  countryCode: string;
  keyword: string;
  position: number;
  volume: number;
  difficulty: number;
  traffic: number;
  cpc: number;
  intent: string;
}

interface Competitor {
  countryCode: string;
  domain: string;
  competitorRelevance: number;
  commonKeywords: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  googleAdsKeywords: number;
}

interface SEOData {
  domainInfo: DomainInfo[];
  keywordTypesBrand: KeywordTypeItem[];
  keywordTypesNonBrand: KeywordTypeItem[];
  longTailKeywords: LongTailKeyword[];
  competitors: Competitor[];
}

// Simple cache hook
const useCache = <T,>(ttl = 300000) => {
  const ref = useRef<{ data?: T; time: number }>({ time: 0 });
  const get = () => (Date.now() - ref.current.time < ttl ? ref.current.data : undefined);
  const set = (data: T) => { ref.current = { data, time: Date.now() }; };
  return { get, set };
};

// API calling service
class APIService {
  private static base = 'https://api.sheety.co/5bcc5e9b5a9271eb36b750afdfe11bae/bcSeoDashboard';
  
  static async fetchAll(): Promise<SEOData> {
    const urls = {
      domainInfo: `${this.base}/domainInfo`,
      keywordTypesBrand: `${this.base}/keywordTypesBrand`,
      keywordTypesNonBrand: `${this.base}/keywordTypesNonBrand`,
      longTailKeywords: `${this.base}/longTailKeywords`,
      competitors: `${this.base}/competitors`,
    };
    
    const [dRes, bRes, nbRes, ltRes, cRes] = await Promise.all(
      Object.values(urls).map(u => fetch(u).then(r => r.json()))
    );
    
    return {
      domainInfo: dRes.domainInfo,
      keywordTypesBrand: bRes.keywordTypesBrand,
      keywordTypesNonBrand: nbRes.keywordTypesNonBrand,
      longTailKeywords: ltRes.longTailKeywords,
      competitors: cRes.competitors,
    };
  }
}

// PieChart component
const PieChart = ({ data }: { data: KeywordTypeItem[] }) => {
  if (!data || data.length === 0) return null;
  
  // Convert decimal percentages to whole numbers if needed
  const processedData = data.map(item => ({
    ...item,
    percent: item.percent < 1 ? item.percent * 100 : item.percent
  }));
  
  const total = processedData.reduce((sum, item) => sum + item.percent, 0);
  let cumulative = 0;
  const size = 200;
  const radius = 80;
  const center = size / 2;
  
  const paths = processedData.map((item, idx) => {
    const value = item.percent;
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI/2;
    const endAngle = ((cumulative + value) / total) * 2 * Math.PI - Math.PI/2;
    cumulative += value;
    
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    
    const largeArc = value / total > 0.5 ? 1 : 0;
    const d = [`M ${center} ${center}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, 'Z'].join(' ');
    const colors = ['#061ab1','#4d5fc7','#F59E0B','#94a3b8'];
    
    // Add percentage text for larger slices
    const midAngle = (startAngle + endAngle) / 2;
    const textX = center + (radius * 0.7) * Math.cos(midAngle);
    const textY = center + (radius * 0.7) * Math.sin(midAngle);
    
    return (
      <g key={idx}>
        <path d={d} fill={colors[idx % colors.length]} stroke="white" strokeWidth={2}/>
        {value > 10 && (
          <text
            x={textX}
            y={textY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="14"
            fontWeight="bold"
          >
            {Math.round(value)}%
          </text>
        )}
      </g>
    );
  });
  
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto bg-white rounded">
      <circle cx={center} cy={center} r={radius} fill="#f3f4f6" />
      {paths}
    </svg>
  );
};

// Pagination hook
const usePagination = <T,>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);
  
  const goToPage = (n: number) => setPage(Math.max(1, Math.min(n, totalPages)));
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  
  return {
    paginatedData,
    currentPage: page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    goToPage,
    nextPage,
    prevPage
  };
};

// Main Dashboard Component
const SEODashboard = () => {
  const [selectedCountry, setSelectedCountry] = useState('PL');
  const [selectedLanguage, setSelectedLanguage] = useState('native');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SEOData | null>(null);
  
  const cache = useCache<SEOData>();
  
  const countries = [
    { code: 'PL', name: 'Poland', native: 'PL-PL', english: 'PL-EN' },
    { code: 'ES', name: 'Spain', native: 'ES-ES', english: 'ES-EN' },
    { code: 'FR', name: 'France', native: 'FR-FR', english: 'FR-EN' },
    { code: 'DE', name: 'Germany', native: 'DE-DE', english: 'DE-EN' },
    { code: 'NL', name: 'Netherlands', native: 'NL-NL', english: 'NL-EN' }
  ];
  
  // Load data
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = cache.get();
      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const seoData = await APIService.fetchAll();
      cache.set(seoData);
      setData(seoData);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [cache]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Get current country and tag
  const currentCountry = countries.find(c => c.code === selectedCountry);
  const currentTag = selectedLanguage === 'native' ? currentCountry?.native : currentCountry?.english;
  
  // Filter data based on selection
  const filteredData = useMemo(() => {
    if (!data) return {
      domainInfo: null,
      brandKeywords: [],
      nonBrandKeywords: [],
      longTailKeywords: [],
      competitors: []
    };
    
    return {
      domainInfo: data.domainInfo.find(d => d.countryCode === currentTag) || null,
      brandKeywords: data.keywordTypesBrand.filter(k => k.countryCode === currentTag),
      nonBrandKeywords: data.keywordTypesNonBrand.filter(k => k.countryCode === currentTag),
      longTailKeywords: data.longTailKeywords.filter(k => k.countryCode === currentTag),
      competitors: data.competitors.filter(c => c.countryCode === selectedCountry)
    };
  }, [data, currentTag, selectedCountry]);
  
  // Pagination
  const keywordsPagination = usePagination(filteredData.longTailKeywords, 10);
  const competitorsPagination = usePagination(filteredData.competitors, 5);
  
  // Helper functions
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  
  const getPositionColor = (pos: number) => {
    if (pos <= 3) return 'bg-green-500 text-white';
    if (pos <= 10) return 'bg-yellow-500 text-white';
    if (pos <= 20) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };
  
  const getDifficultyColor = (diff: number) => {
    if (diff <= 30) return 'bg-green-500';
    if (diff <= 50) return 'bg-yellow-500';
    if (diff <= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#061ab1] mx-auto"></div>
          <p className="mt-4 text-xl font-semibold text-gray-700">Loading SEO Dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Error state
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
          <button onClick={() => loadData(true)} className="mt-4 px-4 py-2 bg-[#061ab1] text-white rounded hover:bg-[#0515a0] transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 shadow-lg relative z-20">
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
          <div className="flex overflow-x-auto space-x-1">
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
      
      {/* Language Toggle */}
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
                }`} />
              </button>
              <span className="text-xs md:text-sm font-medium text-gray-600">
                {selectedLanguage === 'native' ? `Native (${currentTag})` : `English (${currentTag})`}
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
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Overview - {currentCountry?.name}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Keywords</h3>
              <div className="text-3xl font-bold text-[#061ab1]">
                {filteredData.domainInfo?.totalKeywords?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Brand Difficulty</h3>
              <div className="flex items-center">
                <div className="text-3xl font-bold text-gray-900 mr-3">
                  {filteredData.domainInfo?.avgDifficultyBrand || '0'}
                </div>
                <div className={`w-4 h-4 rounded-full ${getDifficultyColor(filteredData.domainInfo?.avgDifficultyBrand || 0)}`} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Non-Brand Difficulty</h3>
              <div className="flex items-center">
                <div className="text-3xl font-bold text-gray-900 mr-3">
                  {filteredData.domainInfo?.avgDifficultyNonBrand || '0'}
                </div>
                <div className={`w-4 h-4 rounded-full ${getDifficultyColor(filteredData.domainInfo?.avgDifficultyNonBrand || 0)}`} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Big Opportunities</h3>
              <div className="text-3xl font-bold text-[#061ab1]">
                {filteredData.domainInfo?.nbBigKwOpportunities || '0'}
              </div>
            </div>
          </div>
          
          {/* Brand vs Non-Brand Split */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Brand vs Non-Brand Split</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[#061ab1] bg-opacity-10 rounded-lg border border-[#061ab1] border-opacity-20">
                <div className="text-2xl font-bold text-[#061ab1]">
                  {filteredData.domainInfo?.totalKeywordsBrand?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-700 font-medium">Brand Keywords</div>
                <div className="text-xs text-gray-600 mt-1">
                  {filteredData.domainInfo && filteredData.domainInfo.totalKeywords > 0
                    ? `${((filteredData.domainInfo.totalKeywordsBrand / filteredData.domainInfo.totalKeywords) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">
                  {filteredData.domainInfo?.totalKeywordsNonBrand?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-700 font-medium">Non-Brand Keywords</div>
                <div className="text-xs text-gray-600 mt-1">
                  {filteredData.domainInfo && filteredData.domainInfo.totalKeywords > 0
                    ? `${((filteredData.domainInfo.totalKeywordsNonBrand / filteredData.domainInfo.totalKeywords) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Keyword Types */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Keyword Types - {currentTag}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Keywords Distribution</h3>
              <div className="w-48 h-48 mx-auto">
                <PieChart data={filteredData.brandKeywords} />
              </div>
              <div className="mt-4 space-y-2">
                {filteredData.brandKeywords.map((item, idx) => {
                  const displayPercent = item.percent < 1 ? Math.round(item.percent * 100) : Math.round(item.percent);
                  return (
                    <div key={idx} className="flex items-center text-sm">
                      <div className={`w-3 h-3 rounded-full mr-2`} style={{backgroundColor: ['#061ab1','#4d5fc7','#F59E0B','#94a3b8'][idx % 4]}} />
                      <span className="text-gray-600">{item.name}: {displayPercent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Non-Brand Keywords Distribution</h3>
              <div className="w-48 h-48 mx-auto">
                <PieChart data={filteredData.nonBrandKeywords} />
              </div>
              <div className="mt-4 space-y-2">
                {filteredData.nonBrandKeywords.map((item, idx) => {
                  const displayPercent = item.percent < 1 ? Math.round(item.percent * 100) : Math.round(item.percent);
                  return (
                    <div key={idx} className="flex items-center text-sm">
                      <div className={`w-3 h-3 rounded-full mr-2`} style={{backgroundColor: ['#061ab1','#4d5fc7','#F59E0B','#94a3b8'][idx % 4]}} />
                      <span className="text-gray-600">{item.name}: {displayPercent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Competitors */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Competitors - {currentCountry?.name}</h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relevance (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Common Keywords</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organic Keywords</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organic Traffic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organic Cost ($)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Google Ads Keywords</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {competitorsPagination.paginatedData.map((comp, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{comp.domain}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="h-2 rounded-full bg-[#061ab1]" style={{width: `${comp.competitorRelevance * 100}%`}} />
                        </div>
                        <span>{(comp.competitorRelevance * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{comp.commonKeywords.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{comp.organicKeywords.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{comp.organicTraffic.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(comp.organicCost)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{comp.googleAdsKeywords.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={competitorsPagination.prevPage}
                  disabled={!competitorsPagination.hasPrev}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {competitorsPagination.currentPage} of {competitorsPagination.totalPages}
                </span>
                <button
                  onClick={competitorsPagination.nextPage}
                  disabled={!competitorsPagination.hasNext}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Long-tail Keywords */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Long-tail Keywords - {currentTag}</h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keywordsPagination.paginatedData.map((kw, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{kw.keyword}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getPositionColor(kw.position)}`}>
                        {kw.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{kw.volume.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div className={`h-2 rounded-full ${getDifficultyColor(kw.difficulty)}`} style={{width: `${kw.difficulty}%`}} />
                        </div>
                        <span>{kw.difficulty}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{kw.traffic.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(kw.cpc)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        kw.intent === 'Commercial' ? 'bg-emerald-100 text-emerald-800' :
                        kw.intent === 'Informational' ? 'bg-[#061ab1] bg-opacity-10 text-[#061ab1]' :
                        kw.intent === 'Transactional' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {kw.intent}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={keywordsPagination.prevPage}
                  disabled={!keywordsPagination.hasPrev}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {keywordsPagination.currentPage} of {keywordsPagination.totalPages}
                </span>
                <button
                  onClick={keywordsPagination.nextPage}
                  disabled={!keywordsPagination.hasNext}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-[#061ab1] text-white p-6 text-center">
        <p className="text-sm font-medium">© 2025 Parcel2Go × GLS - Multi-Country SEO Dashboard</p>
        <p className="text-xs text-blue-200 mt-1">Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default SEODashboard;
