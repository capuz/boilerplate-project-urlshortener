require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dns = require("dns");
const bodyParser = require("body-parser");
const urlParser = require("url");
const app = express();
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.use(bodyParser.urlencoded({ extended: false }));

// Conexión a MongoDB (Reemplaza con tu URL de conexión si usas un servicio externo)
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Definir esquema y modelo de URL
const urlSchema = new mongoose.Schema({
    original_url: String,
    short_url: Number,
});

const UrlModel = mongoose.model("Url", urlSchema);

// Ruta principal
app.get("/", (req, res) => {
    res.send("URL Shortener Microservice - freeCodeCamp");
});

// Endpoint para acortar URL
app.post("/api/shorturl", (req, res) => {
  const { url } = req.body;

  // Expresión regular para validar URLs (debe empezar con http:// o https://)
  const urlRegex = /^(http|https):\/\/[^ "]+$/;
  if (!urlRegex.test(url)) {
      return res.json({ error: "invalid url" });
  }

  // Extraer el hostname de la URL
  const parsedUrl = urlParser.parse(url);

  // Verificar si el dominio es válido con DNS
  dns.lookup(parsedUrl.hostname, async (err) => {
      if (err) {
          return res.json({ error: "invalid url" });
      }

      // Buscar si la URL ya está en la base de datos
      let existingUrl = await UrlModel.findOne({ original_url: url });

      if (!existingUrl) {
          // Obtener el último ID corto y asignar uno nuevo
          const count = await UrlModel.countDocuments();
          existingUrl = new UrlModel({
              original_url: url,
              short_url: count + 1,
          });
          await existingUrl.save();
      }

      res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url,
      });
  });
});

// Endpoint para redireccionar a la URL original
app.get("/api/shorturl/:shorturl", async (req, res) => {
    const shorturl = req.params.shorturl;
    const urlEntry = await UrlModel.findOne({ short_url: shorturl });

    if (!urlEntry) {
        return res.json({ error: "No short URL found" });
    }

    res.redirect(urlEntry.original_url);
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
