# Substance Reader

**Substance Reader** is just a custom integration of eLife Lens. See [here](http://lens.substance.io) for more infos:

### Website integration

The easiest way to integrate the Substance Reader into your website is by creating one HTML file per document and adapt the url to the document you want to display. 

    var app = new Substance({
      // Endpoint must have CORS enabled, or file is served from the same domain as the app
      document_url: "http://example.com/path/to/any-substance-doc.json"
    });
