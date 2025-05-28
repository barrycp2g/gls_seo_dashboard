
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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
  tag: string;
  value: number;
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

// ... The rest of the full SEODashboard.tsx code is pasted from the previous long assistant message above ...

