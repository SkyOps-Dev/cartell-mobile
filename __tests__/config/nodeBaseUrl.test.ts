// Not ported from Flutter: covers nodeBaseUrlHttp(), the per-endpoint switch to the Node backend
// (node_backend/CLAUDE.md §1).

type Environment = typeof import('../../src/config/environment');

function loadWith(env: Record<string, string>): Environment {
  let loaded: Environment | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../src/config/__fixtures__/env.test.json', () => env);
    loaded = require('../../src/config/environment');
  });
  return loaded!;
}

const dev = {
  baseDomain: '192.168.100.29:8000',
  shouldUseTLS: 'false',
  envIdentifier: 'DEVELOPMENT',
};

describe('nodeBaseUrlHttp', () => {
  afterEach(() => {
    jest.dontMock('../../src/config/__fixtures__/env.test.json');
  });

  test('is Node’s address when the env names one', () => {
    const environment = loadWith({
      ...dev,
      nodeBaseDomain: '192.168.100.29:8001',
    });
    expect(environment.nodeBaseUrlHttp()).toBe('http://192.168.100.29:8001');
    expect(environment.baseUrlHttp()).toBe('http://192.168.100.29:8000');
  });

  test('is Django’s address when the env has no nodeBaseDomain (test, beta, live)', () => {
    const environment = loadWith({
      baseDomain: 'cartellap.com',
      shouldUseTLS: 'true',
      envIdentifier: 'LIVE',
    });
    expect(environment.nodeBaseUrlHttp()).toBe('https://cartellap.com');
  });

  test('follows the Debug Info panel off the developer’s server', () => {
    const environment = loadWith({
      ...dev,
      nodeBaseDomain: '192.168.100.29:8001',
    });
    // What DebugMenu's saveModifications does when switching to TEST.
    environment.config.baseDomain = 'test.cartellap.com';
    environment.config.shouldUseTLS = true;
    expect(environment.nodeBaseUrlHttp()).toBe('https://test.cartellap.com');
  });
});
