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

    // fetch all in parallel
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

// Pagination hook
const usePagination = <T,>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const total = items.length;
  const last = Math.ceil(total / pageSize);
  const slice = useMemo(
    () => items.slice((page-1)*pageSize, page*pageSize),
    [items, page, pageSize]
  );
  return { slice, page, last, total, setPage };
};

// Main component
const SEODashboard: React.FC = () => {
  const [country, setCountry] = useState<'PL'|'ES'|'FR'|'DE'>('PL');
  const [native, setNative] = useState(true);
  const [data, setData] = useState<SEOData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const cache = useCache<SEOData>();

  const tag = `${country}-${native?country:'EN'}`;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const cached = cache.get();
        if (cached) { setData(cached); return; }
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
  if (error)   return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data)  return null;

  // filter
  const overview = data.domainInfo.find(d=>d.countryCode===tag);
  const brandPie = data.keywordTypesBrand.filter(k=>k.countryCode===tag);
  const nonPie   = data.keywordTypesNonBrand.filter(k=>k.countryCode===tag);
  const longTail = data.longTailKeywords.filter(l=>l.countryCode===tag);
  const comps    = data.competitors.filter(c=>c.countryCode===country);

  const pLong = usePagination(longTail);
  const pComp = usePagination(comps);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Controls */}
      <div className="flex items-center space-x-4">
        <select value={country} onChange={e=>setCountry(e.target.value as any)}>
          <option value="PL">Poland</option>
          <option value="ES">Spain</option>
          <option value="FR">France</option>
          <option value="DE">Germany</option>
        </select>
        <label><input type="checkbox" checked={native} onChange={()=>setNative(x=>!x)} /> Native</label>
      </div>

      {/* Overview */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <h4>Total Keywords</h4>
            <p className="text-2xl font-bold">{overview.totalKeywords}</p>
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

      {/* Keyword Type Pie Charts */}
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

      {/* Competitors Table */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th>Domain</th><th>Relevance</th><th>Traffic</th>
            </tr>
          </thead>
          <tbody>
            {pComp.slice.map(c=>(
              <tr key={c.domain}>
                <td className="p-2">{c.domain}</td>
                <td className="p-2">{(c.competitorRelevance*100).toFixed(0)}%</td>
                <td className="p-2">{c.organicTraffic.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Long-tail Table */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th>Keyword</th><th>Pos</th><th>Vol</th><th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {pLong.slice.map(l=>(
              <tr key={l.keyword}>
                <td className="p-2">{l.keyword}</td>
                <td className="p-2">{l.position}</td>
                <td className="p-2">{l.volume}</td>
                <td className="p-2">{l.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SEODashboard;
