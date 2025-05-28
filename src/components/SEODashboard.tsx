```tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// TypeScript interfaces matching Sheety API schema
interface DomainInfo {
  country_code: string; // "PL-EN", "ES-ES", etc.
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
  country_code: string; // e.g. "PL" or "ES"
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

// Pagination hook (unchanged)
const usePagination = <T,>(items: T[], initialSize = 10) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const total = items.length;
  const pages = Math.ceil(total / size);
  const slice = items.slice((page - 1) * size, page * size);
  return { slice, page, pages, total, setPage, setSize };
};

// PieChart component (unchanged)
const PieChart = ({ data }: { data: KeywordTypeItem[] }) => {
  const total = data.reduce((s, x) => s + x.percent, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto">
      <circle cx={100} cy={100} r={80} fill="#f3f4f6" />
      {data.map((d, i) => {
        const start = (acc / total) * 2 * Math.PI - Math.PI/2;
        const end = ((acc + d.percent) / total) * 2 * Math.PI - Math.PI/2;
        acc += d.percent;
        const x1 = 100 + 80 * Math.cos(start);
        const y1 = 100 + 80 * Math.sin(start);
        const x2 = 100 + 80 * Math.cos(end);
        const y2 = 100 + 80 * Math.sin(end);
        const large = d.percent / total > 0.5 ? 1 : 0;
        return (
          <path
            key={i}
            d={"M100,100 L" + x1 + "," + y1 + " A80,80 0 " + large + " 1 " + x2 + "," + y2 + " Z"}
            fill={['#3B82F6','#10B981','#F59E0B','#EF4444'][i]}
            stroke="#fff"
            strokeWidth={2}
          />
