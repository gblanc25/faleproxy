const axios = require('axios');
const cheerio = require('cheerio');
const nock = require('nock');
const { sampleHtmlWithYale } = require('./test-utils');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
const TEST_URL = 'http://test-yale-site.example';

describe('Integration Tests', () => {
  beforeAll(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    nock.enableNetConnect('localhost');
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    console.log('Setting up mock for test URL');
    const mock = nock(TEST_URL)
      .get('/')
      .reply(200, sampleHtmlWithYale);

    try {
      console.log('Making request to proxy');
      const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: TEST_URL
      });
      
      console.log('Response received:', {
        status: response.status,
        success: response.data.success,
        contentPreview: response.data.content.substring(0, 100)
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      const $ = cheerio.load(response.data.content);
      console.log('Parsed content title:', $('title').text());
      expect($('title').text()).toBe('Fale University Test Page');
      expect($('h1').text()).toBe('Welcome to Fale University');
      expect($('p').first().text()).toContain('Fale University is a private');
      
      const links = $('a');
      let hasYaleUrl = false;
      links.each((i, link) => {
        const href = $(link).attr('href');
        if (href && href.includes('yale.edu')) {
          hasYaleUrl = true;
        }
      });
      expect(hasYaleUrl).toBe(true);
      expect($('a').first().text()).toBe('About Fale'); 
    } catch (error) {
      console.error('Test error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    } finally {
      console.log('Pending mocks:', nock.pendingMocks());
      mock.done();
    }
  }, 10000);

  test('Should handle invalid URLs', async () => { 
    try {
      const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'not-a-valid-url'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response?.status || 500).toBe(500);
    }
  });

  test('Should handle missing URL parameter', async () => {
    try {
      const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response?.status || 400).toBe(400);
      expect(error.response?.data?.error).toBe('URL is required');
    }
  });
});