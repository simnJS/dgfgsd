/********************************************************************
 *  SCRAPE FORTNITE CCU
 ********************************************************************/
import puppeteer from 'puppeteer-extra';

// Extend the Window interface to include __remixContext
declare global {
  interface Window {
    __remixContext?: any;
  }
}
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { SapphireClient } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder, TextChannel } from 'discord.js';

// Active le plugin stealth (si installé)
puppeteer.use(StealthPlugin());

// ----------------------------------------------------------------
// 1) Fonction pour récupérer le CCU Fortnite via Puppeteer
// ----------------------------------------------------------------
export async function scrapeFortniteCCU(url: string): Promise<number | null> {
  console.log('[SCRAPE] Début de scrapeFortniteCCU...');

  try {
    console.log('[SCRAPE] Lancement de Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      // Désactive la sandbox
      args: ['--no-sandbox', '--disable-setuid-sandbox'], 
    });
    console.log('[SCRAPE] Navigateur lancé avec --no-sandbox.');

    const page = await browser.newPage();
    console.log('[SCRAPE] Nouvelle page créée, accès à l\'URL...');
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('[SCRAPE] Page chargée.');

    // DEBUG 1 : screenshot complet
    const debugScreenshot = path.join(__dirname, '../debug.png');
    await page.screenshot({ path: debugScreenshot, fullPage: true });
    console.log(`[SCRAPE] Screenshot enregistré : ${debugScreenshot}`);

    // DEBUG 2 : loguer un extrait du HTML
    const html = await page.content();
    console.log('[SCRAPE] Extrait du HTML (500 premiers caractères) :');
    console.log(html.slice(0, 500));

    // Extraction depuis __remixContext :
    // On récupère le CCU de la map dont le code est celui
    // passé dans l'URL (p.ex. "1314-1221-7678").
    const ccuValue = await page.evaluate(() => {
      try {
        const data = window.__remixContext
          ?.state
          ?.loaderData?.["routes/$creatorCode.$islandCode"];

        if (!data?.island?.ccu) {
          console.warn('[SCRAPE] Impossible de trouver data.island.ccu');
          return null;
        }
        
        return data.island.ccu ?? null;
      } catch (error) {
        console.error('[SCRAPE] Erreur evaluate() :', error);
        return null;
      }
    });

    console.log(`[SCRAPE] Valeur CCU récupérée : ${ccuValue}`);
    
    console.log('[SCRAPE] Fermeture du navigateur...');
    await browser.close();
    console.log('[SCRAPE] Navigateur fermé, fin de scrapeFortniteCCU.');

    return ccuValue;
  } catch (error) {
    console.error('[SCRAPE] Erreur lors du scraping :', error);
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

function readCCUData(): CCUEntry[] {
  console.log('[JSON] Lecture du fichier ccu-data.json...');
  if (!fs.existsSync(DATA_FILE_PATH)) {
    console.log('[JSON] Fichier inexistant, on retourne un tableau vide.');
    return [];
  }
  const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(content) as CCUEntry[];
    console.log(`[JSON] Lecture réussie, nombre d'entrées: ${parsed.length}`);
    return parsed;
  } catch (error) {
    console.error('[JSON] Erreur de parsing JSON :', error);
    return [];
  }
}

function writeCCUData(data: CCUEntry[]): void {
  console.log(`[JSON] Écriture de ${data.length} entrées dans ccu-data.json...`);
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log('[JSON] Écriture terminée.');
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

async function generateCCUChart(entries: CCUEntry[], outputPath: string, title: string) {
  console.log(`[CHART] Génération du graphe : "${title}" -> ${outputPath}`);
  if (entries.length === 0) {
    console.log('[CHART] Aucune data, on ne génère pas le graphique.');
    return;
  }

  // Tri par date (au cas où)
  entries.sort((a, b) => a.timestamp - b.timestamp);
  // Labels
  const labels = entries.map((entry) => moment(entry.timestamp).format('DD/MM HH:mm'));
  // Data
  const data = entries.map((entry) => entry.ccu);

  const configuration: any = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nombre de joueurs connectés',
          data,
          borderColor: '#7289da', 
          backgroundColor: 'rgba(114,137,218, 0.2)',
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Joueurs simultanés', color: '#ffffff' },
          ticks: {
            color: '#ffffff',
          },
        },
        x: {
          title: { display: true, text: 'Date/Heure', color: '#ffffff' },
          ticks: {
            color: '#ffffff',
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
            color: '#ffffff',
          },
        },
      },
    },
  };

  try {
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync(outputPath, new Uint8Array(imageBuffer));
    console.log(`[CHART] Graphique généré avec succès : ${outputPath}`);
  } catch (err) {
    console.error('[CHART] Erreur lors de la génération du graphique :', err);
  }
}

// ----------------------------------------------------------------
// 4) Filtrage des données sur 1h, 24h, 7j
// ----------------------------------------------------------------
function filterDataByDuration(entries: CCUEntry[], durationInMs: number): CCUEntry[] {
  const now = Date.now();
  return entries.filter((entry) => entry.timestamp >= now - durationInMs);
}

// ----------------------------------------------------------------
// 5) Script principal
// ----------------------------------------------------------------
export async function main(client: SapphireClient) {
  console.log('[MAIN] Début du script principal.');

  // 5.1 : On scrape la valeur de CCU actuelle
  const urlFortnite = 'https://www.fortnite.com/@safia/5352-4561-8315?lang=fr';
  console.log('[MAIN] Appel de scrapeFortniteCCU...');
  const currentCCU = await scrapeFortniteCCU(urlFortnite);
  console.log(`[MAIN] currentCCU = ${currentCCU}`);

  if (currentCCU === null) {
    console.log('[MAIN] Impossible de récupérer le CCU. Fin du script principal.');
    return;
  }

  // 5.2 : On lit l'historique existant
  const ccuData = readCCUData();

  // 5.3 : On ajoute la nouvelle entrée (avec un timestamp)
  console.log('[MAIN] Ajout de la nouvelle entrée dans ccuData...');
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

  console.log('[MAIN] Génération graphique (1 heure)...');
  const ccuLastHour = filterDataByDuration(ccuData, oneHourMs);
  await generateCCUChart(ccuLastHour, path.join(__dirname, `../charts/ccu-last-hour.png`), 'Évolution du CCU (1 heure)');

  console.log('[MAIN] Génération graphique (1 jour)...');
  const ccuLastDay = filterDataByDuration(ccuData, oneDayMs);
  await generateCCUChart(ccuLastDay, path.join(__dirname, `../charts/ccu-last-day.png`), 'Évolution du CCU (1 jour)');

  console.log('[MAIN] Génération graphique (1 semaine)...');
  const ccuLastWeek = filterDataByDuration(ccuData, oneWeekMs);
  await generateCCUChart(ccuLastWeek, path.join(__dirname, `../charts/ccu-last-week.png`), 'Évolution du CCU (1 semaine)');

  console.log('[MAIN] Envoi sur Discord...');
  await discordSendGraph('1323329404386148445', client);

  console.log('[MAIN] Fin du script principal.');
}

// ----------------------------------------------------------------
// 6) Envoi des images sur Discord
// ----------------------------------------------------------------
let lastMessageId = '1234567890'; // ID du dernier message envoyé

async function discordSendGraph(channelId: string, client: SapphireClient) {
  console.log('[DISCORD] Début de discordSendGraph...');
  const channel = await client.channels.fetch(channelId);
  console.log('[DISCORD] Canal récupéré, vérification isTextBased...');

  if (!channel?.isTextBased()) {
    console.log('[DISCORD] Le canal n\'est pas textuel. Fin de discordSendGraph.');
    return;
  }

  const textChannel = channel as TextChannel;

  console.log('[DISCORD] Préparation des embeds...');
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

  console.log('[DISCORD] Chargement des fichiers...');
  const lastHourAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-hour.png'));
  const lastDayAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-day.png'));
  const lastWeekAttachment = new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-week.png'));

  console.log(`[DISCORD] Récupération du dernier message avec ID=${lastMessageId} pour suppression éventuelle...`);
  const lastMessage = await textChannel.messages.fetch(lastMessageId).catch(() => null);

  if (lastMessage) {
    console.log('[DISCORD] Dernier message trouvé, suppression...');
    await lastMessage.delete();
  } else {
    console.log('[DISCORD] Aucun dernier message à supprimer.');
  }

  console.log('[DISCORD] Envoi du nouveau message...');
  const message = await textChannel.send({
    content: 'Évolution du CCU Fortnite :',
    files: [lastHourAttachment, lastDayAttachment, lastWeekAttachment],
    embeds: [OneHourEmbed, OneDayEmbed, OneWeekEmbed],
  });

  console.log(`[DISCORD] Message envoyé avec succès, new message ID = ${message.id}`);
  lastMessageId = message.id;
  console.log('[DISCORD] Fin de discordSendGraph.');
}
