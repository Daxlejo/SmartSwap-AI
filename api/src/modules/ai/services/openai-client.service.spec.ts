import { ConfigService } from '@nestjs/config';
import { OpenAiClientService } from './openai-client.service';

const REAL_LOOKING_KEY = 'sk-test-0123456789abcdefghijklmnop';

const buildClient = (key: string) =>
  new OpenAiClientService({ get: () => key } as unknown as ConfigService);

const completion = (content: string | null, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  }) as unknown as Response;

describe('OpenAiClientService.chatJsonOrNull', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns null without calling OpenAI when the key is a placeholder', async () => {
    const client = buildClient('sk-placeholder-key-for-local-dev');
    await expect(client.chatJsonOrNull('system', 'user')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the parsed JSON body unchanged', async () => {
    fetchMock.mockResolvedValue(completion('{"estimatedValue":280000}'));
    await expect(buildClient(REAL_LOOKING_KEY).chatJsonOrNull('s', 'u')).resolves.toEqual({
      estimatedValue: 280000,
    });
  });

  it.each([
    ['an HTTP error', () => completion('{}', false, 500)],
    ['empty content', () => completion(null)],
    ['content that is not JSON', () => completion('el precio es 300 mil')],
  ])('returns null on %s', async (_label, response) => {
    fetchMock.mockResolvedValue(response());
    await expect(buildClient(REAL_LOOKING_KEY).chatJsonOrNull('s', 'u')).resolves.toBeNull();
  });

  it('returns null when the request fails or is aborted', async () => {
    fetchMock.mockRejectedValue(new Error('aborted'));
    await expect(buildClient(REAL_LOOKING_KEY).chatJsonOrNull('s', 'u')).resolves.toBeNull();
  });

  it('makes chatJson fall back when the body is not an object', async () => {
    fetchMock.mockResolvedValue(completion('[1, 2]'));
    const result = await buildClient(REAL_LOOKING_KEY).chatJson('s', 'u', () => ({
      source: 'fallback',
    }));
    expect(result).toEqual({ source: 'fallback' });
  });

  it('marks a chatJson answer from the model as openai', async () => {
    fetchMock.mockResolvedValue(completion('{"name":"Control"}'));
    const result = await buildClient(REAL_LOOKING_KEY).chatJson('s', 'u', () => ({
      name: 'x',
      source: 'fallback',
    }));
    expect(result).toEqual({ name: 'Control', source: 'openai' });
  });
});
