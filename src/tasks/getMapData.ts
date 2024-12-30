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
const CHART_FONT = 'Inter'; // Police Inter (Google Fonts)

const WIDTH = 800;
const HEIGHT = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: WIDTH,
  height: HEIGHT,
  backgroundColour: '#2f3136', // exemple de gris type Discord
});

async function generateCCUChart(entries: CCUEntry[], outputPath: string, title: string) {
  console.log(`[CHART] Génération du graphe amélioré : "${title}" -> ${outputPath}`);
  if (entries.length === 0) {
    console.log('[CHART] Aucune data, on ne génère pas le graphique.');
    return;
  }

  // Tri par date
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Calcul des statistiques
  const peak = Math.max(...entries.map(e => e.ccu));
  const average = Math.round(entries.reduce((sum, e) => sum + e.ccu, 0) / entries.length);
  const peakEntry = entries.find(e => e.ccu === peak)!;

  // Labels et données
  const labels = entries.map((entry) => moment(entry.timestamp).format('DD/MM HH:mm'));
  const data = entries.map((entry) => entry.ccu);

  const configuration: any = {
    type: 'line',
    data: {
      labels,
      datasets: [
        // Dataset principal
        {
          label: 'Joueurs connectés',
          data,
          borderColor: '#10b981', // Vert moderne type IA
          borderWidth: 3,
          backgroundColor(context: any) {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');  // Vert subtil
            gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            return gradient;
          },
          fill: 'start',
          tension: 0.3, // Courbe plus lisse
          pointRadius: (ctx: any) => {
            // Point uniquement pour le peak
            return data[ctx.dataIndex] === peak ? 6 : 0;
          },
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#5865f2',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#5865f2',
          pointHoverBorderColor: '#ffffff',
        },
        // Ligne de moyenne
        {
          label: 'Moyenne',
          data: Array(labels.length).fill(average),
          borderColor: 'rgba(87, 242, 135, 0.6)', // Vert plus moderne
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        }
      ],
    },
    options: {
      layout: {
        padding: {
          top: 25,
          right: 25,
          bottom: 25,
          left: 25
        }
      },
      color: '#ffffff',
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'JOUEURS SIMULTANÉS',
            color: 'rgba(255, 255, 255, 0.95)',
            font: {
              size: 16,
              weight: '600',
              family: CHART_FONT,
              letterSpacing: '0.05em'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.03)', // Grille très subtile
            borderDash: [6, 6],
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            font: {
              size: 14,
              family: CHART_FONT,
              weight: '500'
            },
            padding: 10,
            callback: (value: any) => {
              return new Intl.NumberFormat('fr-FR').format(value);
            }
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            font: {
              size: 13,
              family: CHART_FONT,
              weight: '500'
            },
            maxRotation: 45,
            minRotation: 45,
            padding: 8,
            callback: function(_value: any, index: number, values: any[]) {
              const timestamp = entries[index].timestamp;
              
              // Calcul du nombre d'intervalles selon la période
              if (title.includes('1 heure')) {
                // ~12 points pour 1h (environ toutes les 5 minutes)
                if (index === 0 || index === values.length - 1 || index % Math.max(1, Math.floor(values.length / 12)) === 0) {
                  return moment(timestamp).format('HH:mm');
                }
              } 
              else if (title.includes('1 jour')) {
                // ~24 points pour 24h (environ toutes les heures)
                if (index === 0 || index === values.length - 1 || index % Math.max(1, Math.floor(values.length / 24)) === 0) {
                  return moment(timestamp).format('HH:mm');
                }
              }
              else if (title.includes('1 semaine')) {
                // ~14 points pour 7j (environ toutes les 12h)
                if (index === 0 || index === values.length - 1 || index % Math.max(1, Math.floor(values.length / 14)) === 0) {
                  return moment(timestamp).format('DD/MM HH:mm');
                }
              }
              return '';
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: [
            title.toUpperCase(),
            `${new Intl.NumberFormat('fr-FR').format(peak)} JOUEURS MAX`,
            `${moment(peakEntry.timestamp).format('DD/MM HH:mm')}`
          ],
          color: '#ffffff',
          font: {
            size: 20,
            weight: '600',
            family: CHART_FONT,
            lineHeight: 1.6,
            letterSpacing: '0.05em'
          },
          padding: {
            top: 30,
            bottom: 30
          }
        },
        legend: {
          labels: {
            color: 'rgba(255, 255, 255, 0.9)',
            font: {
              size: 14,
              weight: '500',
              family: CHART_FONT
            },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20
          },
        },
        subtitle: {
          display: true,
          text: 'STATISTIQUES EN TEMPS RÉEL',
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 14,
            weight: '600',
            family: CHART_FONT,
            letterSpacing: '0.1em'
          },
          padding: {
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(32, 34, 37, 0.95)', // Fond plus foncé
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          bodyFont: {
            size: 13,
            weight: '500'
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (tooltipItems: any) => {
              return moment(entries[tooltipItems[0].dataIndex].timestamp).format('DD/MM/YYYY HH:mm');
            },
            label: (context: any) => {
              const value = context.parsed.y;
              return `${new Intl.NumberFormat('fr-FR').format(value)} joueurs`;
            },
          },
        },
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart',
      },
      interaction: {
        intersect: false,
        mode: 'nearest',
      },
      responsive: true,
      maintainAspectRatio: false,
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
  let lastMessageId: string | undefined = undefined;
  const messageId = await discordSendGraph('1323329404386148445', client, lastMessageId);
  if (messageId) {
    lastMessageId = messageId; // Stockage pour la prochaine utilisation
  }

  console.log('[MAIN] Fin du script principal.');
}

// ----------------------------------------------------------------
// 6) Envoi des images sur Discord
// ----------------------------------------------------------------
async function discordSendGraph(channelId: string, client: SapphireClient, lastMessageId?: string) {
  console.log('[DISCORD] Début de discordSendGraph...');
  
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel?.isTextBased()) {
      console.log('[DISCORD] Le canal n\'est pas textuel. Fin de discordSendGraph.');
      return;
    }

    const textChannel = channel as TextChannel;

    // Préparation des embeds et attachments
    console.log('[DISCORD] Préparation des embeds...');
    const embeds = [
      new EmbedBuilder()
        .setTitle('Évolution du CCU (1 heure)')
        .setImage('attachment://ccu-last-hour.png')
        .setColor('#5865f2'),
      new EmbedBuilder()
        .setTitle('Évolution du CCU (1 jour)')
        .setImage('attachment://ccu-last-day.png')
        .setColor('#5865f2'),
      new EmbedBuilder()
        .setTitle('Évolution du CCU (1 semaine)')
        .setImage('attachment://ccu-last-week.png')
        .setColor('#5865f2')
    ];

    const attachments = [
      new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-hour.png')),
      new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-day.png')),
      new AttachmentBuilder(path.join(__dirname, '../charts/ccu-last-week.png'))
    ];

    // Gestion des messages existants
    if (lastMessageId) {
      console.log(`[DISCORD] Tentative de modification du message existant (ID: ${lastMessageId})...`);
      try {
        const existingMessage = await textChannel.messages.fetch(lastMessageId);
        if (existingMessage) {
          console.log('[DISCORD] Message existant trouvé, mise à jour...');
          const updatedMessage = await existingMessage.edit({
            content: '📊 Évolution du CCU Fortnite',
            files: attachments,
            embeds: embeds
          });
          console.log('[DISCORD] Message mis à jour avec succès');
          return updatedMessage.id;
        }
      } catch (error) {
        console.log('[DISCORD] Message existant non trouvé ou erreur de mise à jour');
        // On continue vers la création d'un nouveau message
      }
    } else {
      console.log('[DISCORD] Pas de message existant, nettoyage du canal...');
      // Suppression des messages existants
      try {
        const messages = await textChannel.messages.fetch({ limit: 10 });
        await textChannel.bulkDelete(messages);
        console.log('[DISCORD] Canal nettoyé avec succès');
      } catch (error) {
        console.log('[DISCORD] Erreur lors du nettoyage du canal:', error);
      }
    }

    // Envoi d'un nouveau message
    console.log('[DISCORD] Envoi d\'un nouveau message...');
    const message = await textChannel.send({
      content: '📊 Évolution du CCU Fortnite',
      files: attachments,
      embeds: embeds
    });

    console.log(`[DISCORD] Nouveau message envoyé avec succès (ID: ${message.id})`);
    return message.id;
  } catch (error) {
    console.error('[DISCORD] Erreur lors de l\'envoi du message:', error);
    return null;
  }
}