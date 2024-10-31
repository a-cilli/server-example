const express = require('express');
const next = require('next');
const bodyParser = require('body-parser');
const bodyParserXml = require('body-parser-xml');
const xml2js = require('xml2js');
const querystring = require('querystring');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();


  // Log incoming requests
  server.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "frame-ancestors viewer.ipaper.io");
    
    console.log('Response Headers:', res.getHeaders());
    next();
  });

  // Middleware to parse JSON and XML body
  server.use(bodyParser.json());
  server.use(bodyParser.urlencoded({ extended: true }));

  // Configure bodyParserXml to handle XML
  bodyParserXml(bodyParser);
  server.use(bodyParser.xml({
    limit: '1MB',
    xmlParseOptions: {
      explicitArray: false
    }
  }));

  // Custom POST handler for XML
  server.post('/api/xml', async (req, res) => {
    try {
      const xmlData = req.body.basket;
      console.log("xmlData", xmlData);

      // Parse XML to JSON
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      console.log("Parsed XML:", result);

      // Extract items from parsed XML
      let items = result.shop.item;

      // Ensure items is always an array
      if (!Array.isArray(items)) {
        items = [items];
      }

      items = items.map(item => ({
        id: item.productid,
        quantity: parseInt(item.amount, 10)
      }));
      console.log("itemsJson", items);

      // Convert itemsJson to query string
      const queryString = querystring.stringify({ items: JSON.stringify(items) });

      // Redirect to localhost:3000 with query string
      res.redirect(`http://localhost:3000/redirect/?${queryString}`);
    } catch (error) {
      console.error('Error processing XML:', error);
      res.status(500).json({ error: 'Failed to process XML' });
    }
  });

  // Default handler for Next.js pages
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
