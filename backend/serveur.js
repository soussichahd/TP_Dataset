const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Connexion MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/pemsd7';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Schéma Capteur
const CapteurSchema = new mongoose.Schema({
  sensorId: Number,
  freeway: String,
  direction: String,
  postmile: String,
  latitude: Number,
  longitude: Number,
  length_km: Number,
  lanes: Number
});

//creer un model Capteur à partir du schéma CapteurSchema
const Capteur = mongoose.model('Capteur', CapteurSchema);

//Charger le sensor_metadata.csv dans MongoDB
app.post('/api/load', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'sensor_metadata.csv');//Construit le chemin complet vers le fichier de dataset
    const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');//Lit le fichier CSV en texte (utf-8), supprime les espaces vides en début/fin, puis sépare chaque ligne avec \n

    // Récupérer l'en-tête pour savoir l'ordre des colonnes  ( api )
    const header = lines.shift().split(',');

    const capteurs = lines.map(line => {
      const cols = line.split(',');
      return {
        sensorId: parseInt(cols[header.indexOf('Sensor ID')]),
        freeway: cols[header.indexOf('Freeway')],
        direction: cols[header.indexOf('Direction')],
        postmile: cols[header.indexOf('Postmile')],
        latitude: parseFloat(cols[header.indexOf('Latitude')]),
        longitude: parseFloat(cols[header.indexOf('Longitude')]),
        length_km: parseFloat(cols[header.indexOf('Length (km)')]),
        lanes: parseInt(cols[header.indexOf('Lanes')])
      };
    });

    await Capteur.deleteMany({});
    await Capteur.insertMany(capteurs);//insertion

    res.json({ ok: true, count: capteurs.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Récupérer les capteurs depuis MongoDB
app.get('/api/capteurs', async (req, res) => {
  try {
    const capteurs = await Capteur.find().sort({ sensorId: 1 });
    res.json(capteurs);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(3000);