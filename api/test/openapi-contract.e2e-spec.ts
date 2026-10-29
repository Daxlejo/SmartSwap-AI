import { readFileSync } from 'fs';
import { buildContract, CONTRACT_PATH } from '../scripts/openapi';

describe('OpenAPI contract (docs/contract/openapi.yaml)', () => {
  it('matches the endpoints and DTO schemas in the code', async () => {
    const committed = readFileSync(CONTRACT_PATH, 'utf8').replace(/\r\n/g, '\n');
    const generated = await buildContract();

    // On failure run `npm run openapi` and commit the regenerated contract.
    expect(generated).toBe(committed);
  }, 60000);
});
