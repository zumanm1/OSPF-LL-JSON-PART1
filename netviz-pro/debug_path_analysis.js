// Debug script to test path analysis with current sample data
import { findAllPaths, findShortestPathCost } from './utils/graphAlgorithms.js';
import { SAMPLE_DATA } from './constants.js';

console.log('=== PATH ANALYSIS DEBUG ===');

// Extract nodes by country
const zimNodes = SAMPLE_DATA.nodes.filter(n => n.country === 'ZIM');
const usaNodes = SAMPLE_DATA.nodes.filter(n => n.country === 'USA');

console.log('\nZIM Nodes:', zimNodes.map(n => `${n.id} (${n.hostname})`));
console.log('USA Nodes:', usaNodes.map(n => `${n.id} (${n.hostname})`));

console.log('\nAll Links:');
SAMPLE_DATA.links.forEach((link, i) => {
    const source = SAMPLE_DATA.nodes.find(n => n.id === link.source);
    const target = SAMPLE_DATA.nodes.find(n => n.id === link.target);
    console.log(`${i}: ${link.source}(${source?.country}) -> ${link.target}(${target?.country}) [F:${link.forward_cost}, R:${link.reverse_cost}]`);
});

// Test specific path calculations
console.log('\n=== TESTING SPECIFIC PATHS ===');

// Test R4 (ZIM) to R8 (USA)
const cost = findShortestPathCost(SAMPLE_DATA.nodes, SAMPLE_DATA.links, 'R4', 'R8');
console.log(`\nShortest path cost R4(ZIM) -> R8(USA): ${cost}`);

const paths = findAllPaths(SAMPLE_DATA.nodes, SAMPLE_DATA.links, 'R4', 'R8', 5);
console.log(`Found ${paths.length} paths from R4 to R8:`);
paths.forEach((path, i) => {
    console.log(`  ${i+1}: ${path.nodes.join(' -> ')} (Cost: ${path.totalCost})`);
});

// Test reverse direction
const reverseCost = findShortestPathCost(SAMPLE_DATA.nodes, SAMPLE_DATA.links, 'R8', 'R4');
console.log(`\nShortest path cost R8(USA) -> R4(ZIM): ${reverseCost}`);

const reversePaths = findAllPaths(SAMPLE_DATA.nodes, SAMPLE_DATA.links, 'R8', 'R4', 5);
console.log(`Found ${reversePaths.length} paths from R8 to R4:`);
reversePaths.forEach((path, i) => {
    console.log(`  ${i+1}: ${path.nodes.join(' -> ')} (Cost: ${path.totalCost})`);
});

// Test all ZIM to USA pairs
console.log('\n=== ALL ZIM -> USA PAIRS ===');
zimNodes.forEach(zim => {
    usaNodes.forEach(usa => {
        const cost = findShortestPathCost(SAMPLE_DATA.nodes, SAMPLE_DATA.links, zim.id, usa.id);
        console.log(`${zim.id}(ZIM) -> ${usa.id}(USA): ${cost}`);
    });
});
