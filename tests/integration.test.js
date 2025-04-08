const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const { sampleHtmlWithYale } = require('./test-utils');

// Set different ports for testing to avoid conflicts
const TEST_PORT = 3099;
const TEST_SERVER_PORT = 3098;
const TEST_URL = `http://localhost:${TEST_SERVER_PORT}`;

describe('Integration Tests', () => {
  let testServer;

  beforeAll(async () => {
    // Create a simple test server that returns Yale content
    const app = express();
    app.get('/', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(sampleHtmlWithYale);
    });
    
    // Start test server
    await new Promise(resolve => {
      testServer = app.listen(TEST_SERVER_PORT, () => {
        console.log(`Test server running at ${TEST_URL}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup test server
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
  });

  test('Should replace Yale with Fale in fetched content', async () => {
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