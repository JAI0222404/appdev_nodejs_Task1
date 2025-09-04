const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const allowedExtensions = ['.png']; // Only allow PNG files

const server = http.createServer(async (req, res) => {
  // Dynamic import of mime because it's ESM-only now
  const mime = await import('mime');

  if (req.method === 'GET') {
    if (req.url === '/') {
      // Serve HTML form with CSS
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>PNG File Upload</title>
          <link rel="stylesheet" href="/style.css" />
        </head>
        <body>
          <h1>Upload a PNG File</h1>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="myfile" accept=".png" required />
            <button type="submit">Upload</button>
          </form>
        </body>
        </html>
      `);
    } else {
      // Serve static files like style.css
      const filePath = path.join(__dirname, 'public', req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mime.getType(filePath) || 'application/octet-stream' });
        res.end(data);
      });
    }
  } else if (req.method === 'POST' && req.url === '/upload') {
    const form = new formidable.IncomingForm();

    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    form.uploadDir = uploadDir;
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Upload error</h1><p>${err.message}</p>`);
        return;
      }

      const uploadedFile = files.myfile;
      if (!uploadedFile) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No file uploaded</h1>');
        return;
      }

      const ext = path.extname(uploadedFile.name).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        fs.unlink(uploadedFile.path, () => {});
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Invalid file type: ${ext}</h1><p>Only PNG files are allowed.</p>`);
        return;
      }

      const newPath = path.join(uploadDir, uploadedFile.name);
      fs.rename(uploadedFile.path, newPath, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error saving file</h1><p>${err.message}</p>`);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <h1>File uploaded successfully!</h1>
          <p>Saved as: ${uploadedFile.name}</p>
          <a href="/">Upload another PNG file</a>
        `);
      });
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
