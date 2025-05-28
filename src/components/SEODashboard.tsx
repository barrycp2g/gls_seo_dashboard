import React, { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interfaces matching Sheety API schema
interface DomainInfo {
  country_code: string;
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
  keywordTypesBrand: KeywordTypeItem[];
  keywordTypesNonBrand: KeywordTypeItem[];
  longTailKeywords: LongTailKeyword[];
  competitors: Competitor[];
}

// Simple cache hook
const useCache = <T,>(ttl = 300000) => {
  const ref = useRef<{ data?: T; timestamp: number }>({ timestamp: 0 });
  const get = () => Date.now() - ref.current.timestamp < ttl ? ref.current.data : undefined;
  const set = (data: T) => { ref.current = { data, timestamp: Date.now() }; };
  return { get, set };
};

// Pagination hook
const usePagination = <T,>(items: T[], initialSize = 10) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const total = items.length;
  const pages = Math.ceil(total / size);
  const slice = items.slice((page - 1) * size, page * size);
  return { slice, page, pages, total, setPage, setSize };
};

// PieChart component
const PieChart = ({ data }: { data: KeywordTypeItem[] }) => {
  const total = data.reduce((s, x) => s + x.percent, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto">
      <circle cx={100} cy={100} r={80} fill="#f3f4f6" />
      {data.map((d, i) => {
        const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
        const end = ((acc + d.percent) / total) * 2 * Math.PI - Math.PI / 2;
        acc += d.percent;
        const x1 = 100 + 80 * Math.cos(start);
        const y1 = 100 + 80 * Math.sin(start);
        const x2 = 100 + 80 * Math.cos(end);
        const y2 = 100 + 80 * Math.sin(end);
        const large = d.percent / total > 0.5 ? 1 : 0;
        const pathData = [
          'M', 100, 100,
          'L', x1, y1,
          'A', 80, 80, 0, large, 1, x2, y2,
          'Z'
        ].join(' ');
        return (
          <path
            key={i}
            d={pathData}
            fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][i]}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};

const SEODashboard: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<'PL'|'ES'|'FR'|'DE'>('PL');
  const [langNative, setLangNative] = useState(true);
  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cache = useCache<SEOData>();
  const tag = `${selectedCountry}-${langNative ? selectedCountry : 'EN'}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cached = cache.get();
      if (cached) { setData(cached); return; }

      const [domRes, brandRes, nonBrandRes, longRes, compRes] = await Promise.all([
        fetch('https://api.sheety.co/.../domainInfo').then(r => r.json()),
        fetch('https://api.sheety.co/.../keywordTypesBrand').then(r => r.json()),
        fetch('https://api.sheety.co/.../keywordTypesNonBrand').then(r => r.json()),
        fetch('https://api.sheety.co/.../longTailKeywords').then(r => r.json()),
        fetch('https://api.sheety.co/.../competitors').then(r => r.json()),
      ]);

      const seo: SEOData = {
        domainInfo: domRes.bcSeoDashboard,
        keywordTypesBrand: brandRes.bcSeoDashboard,
        keywordTypesNonBrand: nonBrandRes.bcSeoDashboard,
        longTailKeywords: longRes.bcSeoDashboard,
        competitors: compRes.bcSeoDashboard,
      };
      cache.set(seo);
      setData(seo);
    } catch {
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overview = data?.domainInfo?.find(d => d.country_code === tag) ?? null;
  const brandPie = data?.keywordTypesBrand?.filter(k => k.country_code === tag) ?? [];
  const nonBrandPie = data?.keywordTypesNonBrand?.filter(k => k.country_code === tag) ?? [];
  const longTail = data?.longTailKeywords?.filter(l => l.country_code === tag) ?? [];
  const competitors = data?.competitors?.filter(c => c.country_code === selectedCountry) ?? [];

  const pagerLong = usePagination(longTail, 10);
  const pagerComp = usePagination(competitors, 5);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header & Controls */}
      <div className="bg-white shadow p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">SEO Dashboard</h1>
          <div className="flex space-x-4">
            <select 
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value as any)}
              className="border rounded p-2"
            >
              <option value="PL">Poland</option>
              <option value="ES">Spain</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
            </select>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={langNative}
                onChange={() => setLangNative(!langNative)}
                className="rounded"
              />
              <span>Native Language</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 space-y-8">
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500">Total Keywords</h3>
              <p className="text-2xl font-bold">{overview.total_keywords}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500">Brand Keywords</h3>
              <p className="text-2xl font-bold">{overview.total_keywords_brand}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500">Non-Brand Keywords</h3>
              <p className="text-2xl font-bold">{overview.total_keywords_non_brand}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-4">Brand Keyword Types</h3>
            <PieChart data={brandPie} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-4">Non-Brand Keyword Types</h3>
            <PieChart data={nonBrandPie} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-medium">Long-tail Keyword Opportunities</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagerLong.slice.map((kw, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">{kw.keyword}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{kw.position}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{kw.volume}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{kw.difficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-medium">Competitors</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Common Keywords</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organic Traffic</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagerComp.slice.map((comp, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.domain}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.competitor_relevance}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.common_keywords}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{comp.organic_traffic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SEODashboard;
