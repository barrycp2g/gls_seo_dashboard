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
  CPC: number;
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
  
  const total = data.reduce((sum, item) => sum + item.percent, 0);
  let cumulative = 0;
  const size = 200;
  const radius = 80;
  const center = size / 2;
  
  const paths = data.map((item, idx) => {
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
    const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444'];
    
    return <path key={idx} d={d} fill={colors[idx % colors.length]} stroke="white" strokeWidth={2}/>;
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
    { code: 'DE', name: 'Germany', native: 'DE-DE', english: 'DE-EN' }
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
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
          <button onClick={() => loadData(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
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
      <div className="bg-white shadow-lg p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Multi-Country SEO Dashboard</h1>
          <p className="text-gray-600">Comprehensive keyword analysis across European markets</p>
        </div>
      </div>
      
      {/* Country Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {countries.map(country => (
              <button
                key={country.code}
                className={`px-6 py-4 font-medium border-b-2 transition-all ${
                  selectedCountry === country.code
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setSelectedCountry(country.code)}
              >
                {country.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Language Toggle */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Language:</span>
              <button
                onClick={() => setSelectedLanguage(prev => prev === 'native' ? 'english' : 'native')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  selectedLanguage === 'english' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  selectedLanguage === 'english' ? 'translate-x-6' : 'translate-x-0.5'
                } top-0.5`} />
              </button>
              <span className="text-sm text-gray-600">
                {selectedLanguage === 'native' ? `Native (${currentTag})` : `English (${currentTag})`}
              </span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
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
              <div className="text-3xl font-bold text-gray-900">
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
              <div className="text-3xl font-bold text-green-600">
                {filteredData.domainInfo?.nbBigKwOpportunities || '0'}
              </div>
            </div>
          </div>
          
          {/* Brand vs Non-Brand Split */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Brand vs Non-Brand Split</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredData.domainInfo?.totalKeywordsBrand?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Brand Keywords</div>
                <div className="text-xs text-gray-500 mt-1">
                  {filteredData.domainInfo && filteredData.domainInfo.totalKeywords > 0
                    ? `${((filteredData.domainInfo.totalKeywordsBrand / filteredData.domainInfo.totalKeywords) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredData.domainInfo?.totalKeywordsNonBrand?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-600">Non-Brand Keywords</div>
                <div className="text-xs text-gray-500 mt-1">
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
                {filteredData.brandKeywords.map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm">
                    <div className={`w-3 h-3 rounded-full mr-2`} style={{backgroundColor: ['#3B82F6','#10B981','#F59E0B','#EF4444'][idx % 4]}} />
                    <span className="text-gray-600">{item.name}: {item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Non-Brand Keywords Distribution</h3>
              <div className="w-48 h-48 mx-auto">
                <PieChart data={filteredData.nonBrandKeywords} />
              </div>
              <div className="mt-4 space-y-2">
                {filteredData.nonBrandKeywords.map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm">
                    <div className={`w-3 h-3 rounded-full mr-2`} style={{backgroundColor: ['#3B82F6','#10B981','#F59E0B','#EF4444'][idx % 4]}} />
                    <span className="text-gray-600">{item.name}: {item.percent}%</span>
                  </div>
                ))}
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
                          <div className="h-2 rounded-full bg-blue-500" style={{width: `${comp.competitorRelevance * 100}%`}} />
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
                    <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(kw.CPC)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        kw.intent === 'Commercial' ? 'bg-green-100 text-green-800' :
                        kw.intent === 'Informational' ? 'bg-blue-100 text-blue-800' :
                        kw.intent === 'Transactional' ? 'bg-yellow-100 text-yellow-800' :
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
      <div className="bg-gray-800 text-white p-6 text-center">
        <p className="text-sm">© 2025 Parcel2Go × GLS - Multi-Country SEO Dashboard</p>
        <p className="text-xs text-gray-400 mt-1">Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default SEODashboard;
