import { wsClient } from './ws-client';

describe('wsClient', () => {
  it('should work', () => {
    expect(wsClient()).toEqual('ws-client');
  });
});
