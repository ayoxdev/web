const express = require('express');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB
mongoose.connect(process.env.MONGO_URI);
const Message = mongoose.model('Message', {
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

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

app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
});
