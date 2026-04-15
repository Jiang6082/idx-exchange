import { fetchProperties } from './client';

// Mock the global fetch function
global.fetch = jest.fn();
Storage.prototype.getItem = jest.fn(() => null);

describe('fetchProperties', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('fetches properties successfully', async () => {
    const mockResponse = {
      total: 100,
      limit: 20,
      offset: 0,
      results: [
        { ListingId: '123', City: 'Portland', ListPrice: 500000 }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const data = await fetchProperties({ limit: 20 });

    expect(fetch).toHaveBeenCalledWith(
      '/api/properties?limit=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-user-email': 'demo@idxexchange.local',
          'x-user-name': 'Guest Buyer'
        })
      })
    );
    expect(data).toEqual(mockResponse);
  });

  test('throws error on failed request', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(fetchProperties()).rejects.toThrow('HTTP 500');
  });

  test('builds query string correctly with multiple params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] })
    });

    await fetchProperties({ city: 'Portland', minPrice: 300000, beds: 3 });

    const callUrl = fetch.mock.calls[0][0];
    expect(callUrl).toContain('city=Portland');
    expect(callUrl).toContain('minPrice=300000');
    expect(callUrl).toContain('beds=3');
  });
});
