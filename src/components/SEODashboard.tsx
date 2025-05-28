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

  return <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto bg-white rounded"><circle cx={center} cy={center} r={radius} fill="#f3f4f6" />{paths}</svg>;
};

// Pagination hook
const usePagination = <T,>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const total = items.length;
  const last = Math.ceil(total / pageSize);
  const slice = useMemo(() => items.slice((page - 1)*pageSize, page*pageSize), [items, page, pageSize]);
  return { slice, page, last, total, setPage };
};

// Main Dashboard
const SEODashboard: React.FC = () => {
  const [country, setCountry] = useState<'PL'|'ES'|'FR'|'DE'>('PL');
  const [native, setNative] = useState(true);
  const [data, setData] = useState<SEOData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const cache = useCache<SEOData>();
  const tag = `${country}-${native ? country : 'EN'}`;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const cached = cache.get();
        if (cached) { setData(cached); setLoading(false); return; }
        const seo = await APIService.fetchAll();
        cache.set(seo);
        setData(seo);
      } catch (e) {
        setError('Failed to load SEO data');
      } finally { setLoading(false); }
    };
    load();
  }, [country, native]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data) return null;

  const overview = data.domainInfo.find(d => d.countryCode === tag);
  const brandPie = data.keywordTypesBrand.filter(k => k.countryCode === tag);
  const nonPie = data.keywordTypesNonBrand.filter(k => k.countryCode === tag);
  const longTail = data.longTailKeywords.filter(l => l.countryCode === tag);
  const comps = data.competitors.filter(c => c.countryCode === country);

  const pLong = usePagination(longTail);
  const pComp = usePagination(comps);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center space-x-4">
        <select value={country} onChange={e => setCountry(e.target.value as any)}>
          <option value="PL">Poland</option>
          <option value="ES">Spain</option>
          <option value="FR">France</option>
          <option value="DE">Germany</option>
        </select>
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={native} onChange={() => setNative(x => !x)} />
          <span>Native ({tag})</span>
        </label>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <h4>Total Keywords</h4>
            <p className="text-2xl font-bold">{overview.totalKeywords.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <h4>Brand Difficulty</h4>
            <p>{overview.avgDifficultyBrand.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <h4>Non-Brand Difficulty</h4>
            <p>{overview.avgDifficultyNonBrand.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <h4>Big Opportunities</h4>
            <p>{overview.nbBigKwOpportunities}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h4>Brand Split</h4>
          <PieChart data={brandPie} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h4>Non-Brand Split</h4>
          <PieChart data={nonPie} />
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100"><tr><th>Domain</th><th>Relevance</th><th>Traffic</th></tr></thead>
          <tbody>
            {pComp.slice.map(c => (
              <tr key={c.domain} className="border-b">
