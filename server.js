const express = require('express');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const Selection = require('./models/Selection');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB setup
//mongoose.connect(process.env.MONGO_URI);
// const Message = mongoose.model('messages', {
// name: String,
// email: String,
// message: String,
// date: { type: Date, default: Date.now }
// });
const Token = mongoose.model('tokens', {
  token: String,
  forcedColors: [String],
  selectedColors: [String],
  maxSelectable: Number,
  emailToNotify: String,
  createdAt: { type: Date, default: Date.now }
});
const responseSchema = new mongoose.Schema({
  token: String,             // référence au token utilisé
  selectedColors: [String],  // tableau des couleurs choisies
  submittedAt: { type: Date, default: Date.now },
});

const Response = mongoose.model('responses', responseSchema);

// Nodemailer OVH config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true pour port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Route de traitement du formulaire
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !email || !emailRegex.test(email) || !message) {
    return res.status(400).json({ success: false, message: "Champs invalides." });
  }

  try {
    // Sauvegarde MongoDB
    await new Message({ name, email, message }).save();

    // Envoi au visiteur
    await transporter.sendMail({
      from: `"Ilïas de ayox.dev" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Merci pour votre message",
      html: `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="color-scheme" content="light dark" />
    <title>Merci pour votre message</title>
</head>

<body
    style="background: #f4f7fa; color: #1f1f1f; font-family: 'Segoe UI', 'Roboto', sans-serif; margin: 0; padding: 20px; transition: background 0.3s, color 0.3s;">
    <div style="
        max-width: 600px;
        margin: auto;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      ">
        <div style="
          padding: 30px 20px;
          text-align: center;
          background: linear-gradient(135deg, #61a5c2, #f07f3e);
        ">
            <!--<img src="https://ayox.dev/public/images/icon.svg" width="85" height="85"
                style="display: block; margin: 0 auto 20px;" />-->
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">
                Merci pour votre message ✉️
            </h1>
        </div>

        <div
            style="padding: 30px 20px; text-align: center; background: rgba(255,255,255,0.12); backdrop-filter: blur(15px); border-radius: 0 0 0 0;">
            <h2 style="margin: 0 0 16px; color: #f07f3e; font-size: 20px;">
                Bonjour ${name},
            </h2>
            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">
                Merci d’avoir pris quelques instants pour remplir le formulaire. Votre message a bien été reçu et je
                m’engage à vous répondre dans les plus brefs délais.
            </p>
        </div>

        <div style="
    padding: 16px;
    text-align: center;
    font-size: 0.75rem;
    color: #f07f3e;
    border-top: 1px solid rgba(240, 127, 62, 0.4);
    max-width: 420px;
    margin: 0 auto;
  ">
            RIGOLET Ilïas<br />
            Nivelles, Belgique<br />
            <a href="mailto:hello@ayox.dev" style="color: #888; text-decoration: none;">
                hello@ayox.dev
            </a>
        </div>
    </div>
</body>

</html>`,
    });

    // Envoi à l'admin
    await transporter.sendMail({
      from: `"Ayox Bot" <${process.env.SMTP_USER}>`,
      to: 'ayoxdev@gmail.com',
      subject: "📬 Nouveau message via le formulaire ayox.dev",
      text: `Nom : ${name}\nEmail : ${email}\n\nMessage :\n${message}`
    });

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Erreur serveur :", err);
    res.status(500).json({ success: false, message: "Erreur serveur, réessaye plus tard." });
  }
});




// Couleurs disponibles (fixes ici, sinon mettre en DB)
const AVAILABLE_COLORS = [
  { name: "NOIR", code: "#212721" },
  { name: "BLANC", code: "#FFFFFF" },
  { name: "ORANGE", code: "#FF7338" },
  { name: "MARRON", code: "#927968" },
  { name: "POURPRE", code: "#744BD2" },
  { name: "PANTONE VIOLET", code: "#695FA2" },
  { name: "PANTONE VERT", code: "#89A84F" },
  { name: "PANTONE CYAN", code: "#23A3C7" },
  { name: "PANTONE ORANGE", code: "#FAB178" },
  { name: "MATTE ROSE", code: "#FFB5E6" }
];

// Pages statiques
app.get('/admin/panel.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/panel.html'));
});

app.get('/color-filament/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/color-filament/index.html'));
});

// API créer un token
app.post('/api/admin/create-token', async (req, res) => {
  try {
    const { forcedColors, maxSelectable, emailToNotify } = req.body;
    if (!Array.isArray(forcedColors) || typeof maxSelectable !== 'number' || !emailToNotify) {
      return res.status(400).json({ error: 'Paramètres invalides' });
    }

    const token = crypto.randomBytes(8).toString('hex');
    const newToken = new Token({ token, forcedColors, maxSelectable, emailToNotify });
    await newToken.save();

    res.json({ token, link: `http://${DOMAIN}/color-filament/${token}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API récupérer données token
app.get('/api/color-filament/:token/data', async (req, res) => {
  const tokenStr = req.params.token;
  try {
    const tokenDoc = await Token.findOne({ token: tokenStr });
    if (!tokenDoc) return res.status(404).json({ error: 'Token non trouvé' });

    res.json({
      availableColors: AVAILABLE_COLORS,
      forcedColors: tokenDoc.forcedColors,
      maxSelectable: tokenDoc.maxSelectable,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API soumettre sélection utilisateur
app.post('/api/color-filament/:token/submit', async (req, res) => {
  const tokenStr = req.params.token;
  try {
    const tokenDoc = await Token.findOne({ token: tokenStr });
    if (!tokenDoc) return res.status(404).json({ error: 'Token non trouvé' });

    const { selectedColors } = req.body;
    if (!Array.isArray(selectedColors)) {
      return res.status(400).json({ error: 'Sélection invalide' });
    }

    // Vérifier couleurs forcées
    for (const forced of tokenDoc.forcedColors) {
      if (!selectedColors.includes(forced)) {
        return res.status(400).json({ error: 'Les couleurs forcées doivent être sélectionnées.' });
      }
    }

    // Vérifier limite max
    if (selectedColors.length > tokenDoc.maxSelectable) {
      return res.status(400).json({ error: `Vous ne pouvez sélectionner que ${tokenDoc.maxSelectable} couleurs.` });
    }

    // Sauvegarder la réponse
    const newResponse = new Response({
      token: tokenStr,
      selectedColors,
    });
    await newResponse.save();

    // Envoyer mail de notification
    const mailOptions = {
      from: `"Filament Choix" <${process.env.SMTP_USER}>`,
      to: tokenDoc.emailToNotify,
      subject: 'Nouvelle sélection de couleurs de filament',
      text: `Un utilisateur a soumis une sélection via le lien ${tokenStr}.\n\nCouleurs choisies:\n${selectedColors.join('\n')}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error('Erreur envoi mail:', error);
      else console.log('Mail envoyé:', info.response);
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API lister tous les tokens (optionnel)
app.get('/api/admin/list-tokens', async (req, res) => {
  try {
    const tokens = await Token.find({});
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});