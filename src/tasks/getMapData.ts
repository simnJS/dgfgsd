import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { SapphireClient } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder, TextChannel } from 'discord.js';

// ----------------------------------------------------------------
// 1) Fonction pour récupérer le CCU Fortnite via Puppeteer
// ----------------------------------------------------------------
export async function scrapeFortniteCCU(url: string): Promise<number | null> {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Configure l'user-agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Accès à la page
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Récupération du texte du <span data-testid="ccu">
    const ccuValue = await page.evaluate(() => {
      const spanCcu = document.querySelector('span[data-testid="ccu"]');
      return spanCcu ? Number(spanCcu.textContent!.trim()) : null;
    });

    await browser.close();
    return ccuValue;
  } catch (error) {
    console.error('Erreur lors du scraping :', error);
    return null;
  }
}

// ----------------------------------------------------------------
// 2) Lecture / Écriture dans le fichier JSON
// ----------------------------------------------------------------
interface CCUEntry {
  timestamp: number; // Timestamp en millisecondes
  ccu: number;
}

const DATA_FILE_PATH = path.join(__dirname, '../data/ccu-data.json');

/**
 * Lit le fichier ccu-data.json et retourne un tableau de CCUEntry
 */
function readCCUData(): CCUEntry[] {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return [];
  }
  const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  try {
    return JSON.parse(content) as CCUEntry[];
  } catch (error) {
    console.error('Erreur de parsing JSON :', error);
    return [];
  }
}

/**
 * Écrit le tableau de CCUEntry dans ccu-data.json
 */
function writeCCUData(data: CCUEntry[]): void {
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------------------------------------------------------
// 3) Génération de graphiques avec chartjs-node-canvas
// ----------------------------------------------------------------
const WIDTH = 800;
const HEIGHT = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: WIDTH,
  height: HEIGHT,
  backgroundColour: '#2f3136', // exemple de gris type Discord
});

/**
 * Génère un fichier image PNG représentant les données passées en paramètre
 * @param entries Tableau d'entrées (timestamp + ccu)
 * @param outputPath Chemin de sortie de l'image
 * @param title Titre du graphique
 */
async function generateCCUChart(entries: CCUEntry[], outputPath: string, title: string) {
  if (entries.length === 0) return;

  // Tri par date (au cas où)
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Prépare les labels (heures, dates, etc.)
  const labels = entries.map((entry) => moment(entry.timestamp).format('DD/MM HH:mm'));
  // Prépare la data
  const data = entries.map((entry) => entry.ccu);

  // Configuration du graphique Chart.js
  const configuration: any = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nombre de joueurs connectés',
          data,
          borderColor: '#7289da',             // Exemple couleur bleue type Discord
          backgroundColor: 'rgba(114,137,218, 0.2)', // Couleur bleue semi-transparente
          fill: true,
          tension: 0.2,                       // Courbe plus smooth
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Joueurs simultanés', color: '#ffffff' },
          ticks: {
            color: '#ffffff', // Couleur des graduations
          },
        },
        x: {
          title: { display: true, text: 'Date/Heure', color: '#ffffff' },
          ticks: {
            color: '#ffffff', // Couleur des labels sur l'axe X
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#ffffff',
        },
        legend: {
          labels: {
            color: '#ffffff', // Couleur du label de la légende
          },
        },
      },
    },
  };
  

  // Génération de l'image
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(outputPath, new Uint8Array(imageBuffer));
  console.log(`Graphique généré : ${outputPath}`);
}

// ----------------------------------------------------------------
// 4) Filtrage des données sur 1h, 24h, 7j
// ----------------------------------------------------------------
/**
 * Retourne les données dont le timestamp est >= now - période
 * @param entries tableau d'entrées
 * @param durationInMs période en millisecondes (1h, 1 jour, etc.)
 */
function filterDataByDuration(entries: CCUEntry[], durationInMs: number): CCUEntry[] {
  const now = Date.now();
  return entries.filter((entry) => entry.timestamp >= now - durationInMs);
}

// ----------------------------------------------------------------
// 5) Script principal
// ----------------------------------------------------------------
export async function main(client : SapphireClient) {
  // 5.1 : On scrape la valeur de CCU actuelle
  const urlFortnite = 'https://www.fortnite.com/@safia/5352-4561-8315?lang=fr'; // <-- Remplacez par l'URL réelle
  const currentCCU = await scrapeFortniteCCU(urlFortnite);

  if (currentCCU === null) {
    console.log('Impossible de récupérer le CCU.');
    return;
  }

  // 5.2 : On lit l'historique existant
  const ccuData = readCCUData();

  // 5.3 : On ajoute la nouvelle entrée (avec un timestamp)
  ccuData.push({
    timestamp: Date.now(),
    ccu: currentCCU,
  });

  // 5.4 : On sauvegarde à nouveau dans le JSON
  writeCCUData(ccuData);

  // 5.5 : Génération des graphiques pour différentes périodes
  const oneHourMs = 60 * 60 * 1000;
  const oneDayMs = 24 * oneHourMs;
  const oneWeekMs = 7 * oneDayMs;


  // a) Graphique sur 1 Chart
  const ccuLastHour = filterDataByDuration(ccuData, oneHourMs);
  await generateCCUChart(
    ccuLastHour,
    path.join(__dirname, `../charts/ccu-last-hour.png`),
    'Évolution du CCU (1 heure)'
  );

  // b) Graphique sur 1 jour
  const ccuLastDay = filterDataByDuration(ccuData, oneDayMs);
  await generateCCUChart(
    ccuLastDay,
    path.join(__dirname, `../charts/ccu-last-day.png`),
    'Évolution du CCU (1 jour)'
  );

  // c) Graphique sur 1 semaine
  const ccuLastWeek = filterDataByDuration(ccuData, oneWeekMs);
  await generateCCUChart(
    ccuLastWeek,
    path.join(__dirname, `../charts/ccu-last-week.png`),
    'Évolution du CCU (1 semaine)'
  );

  discordSendGraph('1323329404386148445', client);
  console.log('Fin du script principal.');
}

// Lancement du script principal

let lastMessageId = '1234567890'; // ID du dernier message envoyé

async function discordSendGraph(channelId: string, client : SapphireClient) {
  const channel = await client.channels.fetch(channelId) as TextChannel;
  if (!channel?.isTextBased()) return;

  // create 3 embeds for the 3 images
  const OneHourEmbed = new EmbedBuilder()
    .setTitle('Évolution du CCU (1 heure)')
    .setImage('attachment://ccu-last-hour.png')
    .setColor('#7289da');

  const OneDayEmbed = new EmbedBuilder()
    .setTitle('Évolution du CCU (1 jour)')
    .setImage('attachment://ccu-last-day.png')
    .setColor('#7289da');

  const OneWeekEmbed = new EmbedBuilder()
    .setTitle('Évolution du CCU (1 semaine)')
    .setImage('attachment://ccu-last-week.png')
    .setColor('#7289da');
  






  // Envoi des graphiques
  const lastHourAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-hour.png'));
  const lastDayAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-day.png'));
  const lastWeekAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-week.png'));

  const lastMessage = await channel.messages.fetch(lastMessageId).catch(() => null);
  if (lastMessage) {
    await lastMessage.delete();
  }

  const message = await channel.send({
    content: 'Évolution du CCU Fortnite :',
    files: [lastHourAttachment, lastDayAttachment, lastWeekAttachment],
    embeds: [OneHourEmbed, OneDayEmbed, OneWeekEmbed]
  });

  lastMessageId = message.id;
}