# Troubleshooting Guide

Common issues and solutions for NetViz Pro.

## Startup Issues

### App won't start

**Symptom**: `npm run dev` fails or shows errors

**Solutions**:

1. **Check Node version**:
   ```bash
   node --version  # Should be v18+
   ```

2. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Clear npm cache**:
   ```bash
   npm cache clean --force
   npm install
   ```

### Port already in use

**Symptom**: `Error: Port 9040 is already in use`

**Solution**:
```bash
# Kill process on port
lsof -ti:9040 | xargs kill -9

# Then restart
npm run dev
```

### JSX/TypeScript errors

**Symptom**: `Expected corresponding JSX closing tag` or similar

**Solution**: Check `App.tsx` for unclosed tags. Common issues:
- Missing `</header>` tag
- Missing `</div>` closing
- Unclosed JSX comments `{/* ... */}`

---

## File Upload Issues

### File won't upload

**Symptom**: Click upload, select file, nothing happens

**Solutions**:

1. **Check file format**: Must be `.json` file
2. **Check file size**: Very large files (>50MB) may timeout
3. **Check browser console**: Press F12, look for errors

### "Invalid JSON" error

**Symptom**: Error message about JSON parsing

**Solutions**:

1. **Validate JSON syntax**:
   ```bash
   # Check with jq
   jq . your_file.json

   # Or use online validator
   ```

2. **Common JSON issues**:
   - Trailing commas: `{"a": 1,}` - remove trailing comma
   - Single quotes: `{'a': 1}` - use double quotes
   - Unquoted keys: `{a: 1}` - quote the keys

### "Missing required fields" error

**Symptom**: Topology loads but shows errors

**Check these requirements**:
```json
{
  "nodes": [
    {"id": "required", "label": "required"}
  ],
  "links": [
    {"source": "node-id", "target": "node-id", "cost": 1}
  ]
}
```

---

## Visualization Issues

### Graph not rendering

**Symptom**: Empty center area after file upload

**Solutions**:

1. **Check node count**: Verify in stats panel
2. **Zoom out**: Scroll wheel or pinch to zoom out
3. **Reset view**: Refresh page and re-upload

### Nodes clustered together

**Symptom**: All nodes appear at center

**Solution**: Wait for force simulation to settle (2-3 seconds), or drag nodes apart.

### Links not visible

**Symptom**: Nodes show but no connections

**Check**:
1. Link `source` and `target` match node `id` values exactly
2. No typos in node IDs (case-sensitive)

---

## Modal Issues

### Modal won't open

**Symptom**: Click button, nothing happens

**Solutions**:

1. **Upload data first**: Most modals require topology data
2. **Check console for errors**: F12 → Console tab
3. **Refresh page**: Clear any stuck state

### Modal shows empty data

**Symptom**: Modal opens but tables are empty

**Check data requirements**:

| Modal | Required Data |
|-------|---------------|
| Capacity Planning | `capacity`, `traffic`, `utilization` on links |
| Traffic Matrix | `utilization` on links, `country` on nodes |
| Transit Analyzer | `country` on nodes |
| Dijkstra | Basic `nodes` and `links` |

### "nodes.forEach is not a function" error

**Symptom**: Error when opening Traffic Matrix or similar

**Cause**: Bug in `findAllPaths()` call

**Fix**: Ensure calls use correct parameters:
```typescript
// CORRECT
findAllPaths(data.nodes, data.links, srcId, dstId)

// WRONG - causes error
findAllPaths(data, srcId, dstId)
```

---

## Performance Issues

### Slow rendering with large topologies

**Symptom**: UI laggy with 500+ nodes

**Solutions**:

1. **Reduce node count**: Filter to relevant subset
2. **Disable animations**: In simulation settings
3. **Use production build**:
   ```bash
   npm run build
   npm run preview
   ```

### Browser memory warnings

**Symptom**: "Page using significant memory"

**Solutions**:

1. **Close unused modals**: Each modal caches data
2. **Refresh page**: Clears accumulated state
3. **Use smaller topology files**

---

## Export Issues

### CSV export fails

**Symptom**: Export button doesn't download

**Solutions**:

1. **Check popup blocker**: Allow downloads from localhost
2. **Check browser downloads**: May be going to default folder
3. **Try different browser**: Chrome recommended

### Exported data incomplete

**Symptom**: CSV missing expected columns

**Check**: Source data has required fields for that export type.

---

## Testing Issues

### Puppeteer tests fail

**Symptom**: E2E tests error out

**Solutions**:

1. **Install Puppeteer**:
   ```bash
   npm install puppeteer
   ```

2. **Start app first**:
   ```bash
   npm run dev &
   # Wait for startup
   node test_file.cjs
   ```

3. **Check test file path**: Ensure test topology exists

---

## Quick Diagnostic Checklist

1. ✓ Node.js v18+ installed
2. ✓ `npm install` completed without errors
3. ✓ App running at http://localhost:9040
4. ✓ JSON file valid and properly formatted
5. ✓ Required fields present in topology
6. ✓ Browser console shows no errors
7. ✓ Network requests completing (DevTools → Network)

---

## Getting Help

1. **Check documentation**: `/docs` folder
2. **Review examples**: `/docs/input-format/EXAMPLES.md`
3. **Console errors**: F12 → Console in browser
4. **Network tab**: F12 → Network for request issues

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "nodes.forEach is not a function" | Wrong params to findAllPaths | Use (nodes, links, src, dst) |
| "Cannot read property 'id' of undefined" | Missing node reference | Check link source/target IDs |
| "Expected corresponding JSX closing tag" | Unclosed JSX element | Find and close tag in App.tsx |
| "ENOENT: no such file or directory" | File path wrong | Check file exists at path |
| "Port 9040 is already in use" | Another process on port | Kill process or change port |
