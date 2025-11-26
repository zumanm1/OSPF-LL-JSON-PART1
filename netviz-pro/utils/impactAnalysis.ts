import { NetworkNode, NetworkLink, PathResult } from '../types';
import { findAllPaths } from './graphAlgorithms';

export interface LinkImpact {
  linkIndex: number;
  link: NetworkLink;
  affectedPaths: number;
  affectedCountryPairs: Array<{ source: string; dest: string; pathCount: number }>;
  localImpact: string[]; // Directly connected nodes
  downstreamImpact: string[]; // Nodes affected through path changes
}

export interface TransitCountryImpact {
  country: string;
  transitPathCount: number;
  transitForPairs: Array<{ source: string; dest: string; pathCount: number }>;
  criticalityScore: number; // 0-100, higher = more critical as transit
  nodeCount: number; // Number of nodes in this country used as transit
}

export interface ImpactAnalysisResult {
  totalPaths: number;
  affectedPaths: number;
  impactPercentage: number;
  linkImpacts: LinkImpact[];
  countryPairImpacts: Map<string, { before: PathResult[]; after: PathResult[]; changed: boolean }>;
  transitCountries: TransitCountryImpact[]; // Level 4: Transit country analysis
}

/**
 * Calculate impact of link cost changes on network paths
 * Implements the "Downstream Ripple Effect" analysis
 */
export function calculateLinkImpact(
  nodes: NetworkNode[],
  originalLinks: NetworkLink[],
  modifiedLinks: NetworkLink[],
  sourceCountries?: string[],
  destCountries?: string[]
): ImpactAnalysisResult {
  
  // Get unique countries
  const allCountries = Array.from(new Set(nodes.map(n => n.country)));
  const sources = sourceCountries || allCountries;
  const destinations = destCountries || allCountries;

  // Calculate paths before and after
  const pathsBefore: PathResult[] = [];
  const pathsAfter: PathResult[] = [];
  const countryPairImpacts = new Map<string, { before: PathResult[]; after: PathResult[]; changed: boolean }>();

  sources.forEach(sourceCountry => {
    const sourceNodes = nodes.filter(n => n.country === sourceCountry);
    
    destinations.forEach(destCountry => {
      if (sourceCountry === destCountry) return; // Skip same country
      
      const destNodes = nodes.filter(n => n.country === destCountry);
      const pairKey = `${sourceCountry}->${destCountry}`;
      const beforePaths: PathResult[] = [];
      const afterPaths: PathResult[] = [];

      sourceNodes.forEach(sNode => {
        destNodes.forEach(dNode => {
          // Calculate paths with original links
          const pathBefore = findAllPaths(nodes, originalLinks, sNode.id, dNode.id, 1);
          if (pathBefore.length > 0) {
            pathsBefore.push(...pathBefore);
            beforePaths.push(...pathBefore);
          }

          // Calculate paths with modified links
          const pathAfter = findAllPaths(nodes, modifiedLinks, sNode.id, dNode.id, 1);
          if (pathAfter.length > 0) {
            pathsAfter.push(...pathAfter);
            afterPaths.push(...pathAfter);
          }
        });
      });

      // Check if this country pair was affected
      const changed = beforePaths.length !== afterPaths.length ||
                     beforePaths.some((bp, i) => {
                       const ap = afterPaths[i];
                       return !ap || bp.totalCost !== ap.totalCost || 
                              bp.nodes.join(',') !== ap.nodes.join(',');
                     });

      countryPairImpacts.set(pairKey, { before: beforePaths, after: afterPaths, changed });
    });
  });

  // Count affected paths
  let affectedCount = 0;
  pathsBefore.forEach((pathBefore, idx) => {
    const pathAfter = pathsAfter[idx];
    if (!pathAfter || 
        pathBefore.totalCost !== pathAfter.totalCost || 
        pathBefore.nodes.join(',') !== pathAfter.nodes.join(',')) {
      affectedCount++;
    }
  });

  // Analyze impact per link
  const linkImpacts: LinkImpact[] = [];
  modifiedLinks.forEach((modLink, index) => {
    const origLink = originalLinks[index];
    
    // Check if this link was modified
    if (origLink && (
      origLink.forward_cost !== modLink.forward_cost ||
      origLink.reverse_cost !== modLink.reverse_cost ||
      origLink.status !== modLink.status
    )) {
      
      // Local impact: directly connected nodes
      const sourceId = typeof modLink.source === 'object' ? modLink.source.id : modLink.source;
      const targetId = typeof modLink.target === 'object' ? modLink.target.id : modLink.target;
      const localImpact = [sourceId, targetId];

      // Downstream impact: find all paths that used this link
      const downstreamImpact = new Set<string>();
      pathsBefore.forEach((path, idx) => {
        const pathAfter = pathsAfter[idx];
        // Check if path used this link
        const usedLink = path.nodes.some((nodeId, i) => {
          if (i === path.nodes.length - 1) return false;
          const nextNode = path.nodes[i + 1];
          return (nodeId === sourceId && nextNode === targetId) ||
                 (nodeId === targetId && nextNode === sourceId);
        });

        if (usedLink && pathAfter && path.totalCost !== pathAfter.totalCost) {
          path.nodes.forEach(nodeId => downstreamImpact.add(nodeId));
        }
      });

      // Count affected country pairs for this link
      const affectedCountryPairs: Array<{ source: string; dest: string; pathCount: number }> = [];
      countryPairImpacts.forEach((impact, pairKey) => {
        if (impact.changed) {
          const [source, dest] = pairKey.split('->');
          affectedCountryPairs.push({
            source,
            dest,
            pathCount: impact.after.length
          });
        }
      });

      linkImpacts.push({
        linkIndex: index,
        link: modLink,
        affectedPaths: affectedCount,
        affectedCountryPairs,
        localImpact,
        downstreamImpact: Array.from(downstreamImpact)
      });
    }
  });

  // Level 4: Transit Country Analysis
  // Analyze which countries serve as transit hubs for other countries
  const transitAnalysis = analyzeTransitCountries(nodes, pathsAfter);

  return {
    totalPaths: pathsBefore.length,
    affectedPaths: affectedCount,
    impactPercentage: pathsBefore.length > 0 ? (affectedCount / pathsBefore.length) * 100 : 0,
    linkImpacts,
    countryPairImpacts,
    transitCountries: transitAnalysis
  };
}

/**
 * Level 4: Transit Country Analysis
 * Identifies countries that serve as transit hubs for traffic between other countries
 */
function analyzeTransitCountries(nodes: NetworkNode[], paths: PathResult[]): TransitCountryImpact[] {
  const allCountries = Array.from(new Set(nodes.map(n => n.country)));
  const transitMap = new Map<string, {
    pathCount: number;
    pairs: Map<string, number>;
    transitNodes: Set<string>;
  }>();

  // Initialize transit map for all countries
  allCountries.forEach(country => {
    transitMap.set(country, {
      pathCount: 0,
      pairs: new Map(),
      transitNodes: new Set()
    });
  });

  // Analyze each path to find transit countries
  paths.forEach(path => {
    if (path.nodes.length < 3) return; // Need at least 3 nodes for transit

    // Get source and destination countries
    const sourceNode = nodes.find(n => n.id === path.nodes[0]);
    const destNode = nodes.find(n => n.id === path.nodes[path.nodes.length - 1]);
    
    if (!sourceNode || !destNode) return;
    
    const sourceCountry = sourceNode.country;
    const destCountry = destNode.country;
    
    if (sourceCountry === destCountry) return; // Skip intra-country paths

    // Check intermediate nodes for transit countries
    const transitCountries = new Set<string>();
    for (let i = 1; i < path.nodes.length - 1; i++) {
      const intermediateNode = nodes.find(n => n.id === path.nodes[i]);
      if (intermediateNode && 
          intermediateNode.country !== sourceCountry && 
          intermediateNode.country !== destCountry) {
        transitCountries.add(intermediateNode.country);
        
        // Track which node is used as transit
        const transit = transitMap.get(intermediateNode.country);
        if (transit) {
          transit.transitNodes.add(intermediateNode.id);
        }
      }
    }

    // Record transit for each country
    transitCountries.forEach(transitCountry => {
      const transit = transitMap.get(transitCountry);
      if (transit) {
        transit.pathCount++;
        const pairKey = `${sourceCountry}->${destCountry}`;
        transit.pairs.set(pairKey, (transit.pairs.get(pairKey) || 0) + 1);
      }
    });
  });

  // Convert to TransitCountryImpact array and calculate criticality
  const transitCountries: TransitCountryImpact[] = [];
  const maxTransitPaths = Math.max(...Array.from(transitMap.values()).map(t => t.pathCount), 1);

  transitMap.forEach((transit, country) => {
    if (transit.pathCount > 0) {
      // Criticality score based on:
      // - Number of paths using this country as transit (70%)
      // - Number of unique country pairs using it (20%)
      // - Number of nodes involved (10%)
      const pathScore = (transit.pathCount / maxTransitPaths) * 70;
      const pairScore = (transit.pairs.size / (allCountries.length * (allCountries.length - 1))) * 100 * 20;
      const nodeScore = (transit.transitNodes.size / nodes.length) * 100 * 10;
      const criticalityScore = Math.min(100, pathScore + pairScore + nodeScore);

      transitCountries.push({
        country,
        transitPathCount: transit.pathCount,
        transitForPairs: Array.from(transit.pairs.entries()).map(([pairKey, count]) => {
          const [source, dest] = pairKey.split('->');
          return { source, dest, pathCount: count };
        }).sort((a, b) => b.pathCount - a.pathCount),
        criticalityScore: Math.round(criticalityScore),
        nodeCount: transit.transitNodes.size
      });
    }
  });

  // Sort by criticality score (highest first)
  return transitCountries.sort((a, b) => b.criticalityScore - a.criticalityScore);
}

/**
 * Analyze impact between specific country pairs
 */
export function analyzePairCountries(
  nodes: NetworkNode[],
  links: NetworkLink[],
  sourceCountry: string,
  destCountry: string
): {
  paths: PathResult[];
  nodeCount: number;
  linkCount: number;
  avgCost: number;
  minCost: number;
  maxCost: number;
  transitCountries: Array<{ country: string; pathCount: number; nodeCount: number }>; // Transit countries used
} {
  const sourceNodes = nodes.filter(n => n.country === sourceCountry);
  const destNodes = nodes.filter(n => n.country === destCountry);
  
  const allPaths: PathResult[] = [];
  
  sourceNodes.forEach(sNode => {
    destNodes.forEach(dNode => {
      const paths = findAllPaths(nodes, links, sNode.id, dNode.id, 3);
      allPaths.push(...paths);
    });
  });

  // Calculate statistics
  const costs = allPaths.map(p => p.totalCost);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

  // Count unique nodes and links used
  const usedNodes = new Set<string>();
  const usedLinks = new Set<string>();
  allPaths.forEach(path => {
    path.nodes.forEach(nodeId => usedNodes.add(nodeId));
    path.nodes.forEach((nodeId, i) => {
      if (i < path.nodes.length - 1) {
        const linkKey = `${nodeId}-${path.nodes[i + 1]}`;
        usedLinks.add(linkKey);
      }
    });
  });

  // Analyze transit countries for this pair
  const transitMap = new Map<string, { pathCount: number; nodes: Set<string> }>();
  allPaths.forEach(path => {
    if (path.nodes.length < 3) return;
    
    const transitCountriesInPath = new Set<string>();
    for (let i = 1; i < path.nodes.length - 1; i++) {
      const intermediateNode = nodes.find(n => n.id === path.nodes[i]);
      if (intermediateNode && 
          intermediateNode.country !== sourceCountry && 
          intermediateNode.country !== destCountry) {
        transitCountriesInPath.add(intermediateNode.country);
        
        if (!transitMap.has(intermediateNode.country)) {
          transitMap.set(intermediateNode.country, { pathCount: 0, nodes: new Set() });
        }
        transitMap.get(intermediateNode.country)!.nodes.add(intermediateNode.id);
      }
    }
    
    transitCountriesInPath.forEach(country => {
      transitMap.get(country)!.pathCount++;
    });
  });

  const transitCountries = Array.from(transitMap.entries())
    .map(([country, data]) => ({
      country,
      pathCount: data.pathCount,
      nodeCount: data.nodes.size
    }))
    .sort((a, b) => b.pathCount - a.pathCount);

  return {
    paths: allPaths.sort((a, b) => a.totalCost - b.totalCost),
    nodeCount: usedNodes.size,
    linkCount: usedLinks.size,
    avgCost,
    minCost,
    maxCost,
    transitCountries
  };
}
