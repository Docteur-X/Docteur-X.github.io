import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The registry owns feature metadata, but app.js still calls these adapters
// directly during live pointer/drop events. Removing their imports breaks
// interactive commits even though pure mathematical tests continue to pass.
test('live gesture and visual adapters remain bound in app.js', () => {
  const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const adapters = [
    'describeIdentityPreview', 'distributionActionRequest',
    'describeDistributionPreview', 'groupingActionRequest',
    'describeGroupingPreview', 'factorisationActionRequest',
    'describeFactorisationPreview', 'describeRearrangementFeedback'
  ];
  for (const name of adapters) {
    assert.match(source, new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["'][^"']+["']`, 's'),
      `${name} must remain imported while app.js calls it directly`);
  }
});
