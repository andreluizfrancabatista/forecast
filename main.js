const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(
    async () => {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setViewport({ width: 1366, height: 768 });

        const response = await page.goto('http://www.flashscore.com');

        const jogo = {
            'Date': [], 'Time': [], 'Country': [], 'League': [], 'Home': [], 'Away': [],//scrapeData
            'bttsHome': [], 'totalHome': [],
            'bttsAway': [], 'totalAway': [],
            'pHome': [], 'pAway': [], 'pSum': [], 
            'odd': []
        }

        if (response.ok()) {
            const matchesLinks = await scrapeData(page);

            for (link of matchesLinks.LINK) {
                const teamsLinks = await scrapTeamsLinks(page, link);
                await getDataBTTS(page, teamsLinks[0]);//home
                await getDataBTTS(page, teamsLinks[1]);//away
            }

        } else {
            console.log('Página 404.');
        }

        await browser.close();
    }
)();

async function getDataBTTS(page, link) {
    link = `https://www.flashscore.com${link}results`;
    const response = await page.goto(link);
    if (response.ok()) {
        await page.waitForSelector('div.event__match--twoLine');
        const eventos = (await page.$$('div.event__match--twoLine'));
        for (let i = 0; i < 10; i++) {//slice é melhor
            const date = await eventos[i].$eval('div.event__time', el => el.innerText);
            console.log(date);
        }//




    } else {
        console.log(`Erro ao abrir o link: ${link}`);
    }
}

//async function scrapTeamsLinks(page, link)
//Essa função abre a página de cada partida. 
//Aqui dá pra pegar as últimas partidas sem entrar em cada página de cada time.
//Trocar o nome dessa função para getData
async function scrapTeamsLinks(page, link) {
    const response = await page.goto(link);
    if (response.ok()) {
        await page.waitForSelector('div.duelParticipant');
        const teams = await page.$$('div.participant__overflow');
        const homeLink = await teams[0].$eval('a', el => el.getAttribute('href'));
        const awayLink = await teams[1].$eval('a', el => el.getAttribute('href'));
        return [homeLink, awayLink];
    } else {
        console.log(`Erro ao abrir o link: ${link}`);
    }
}

async function scrapeData(page) {
    const start = Date.now();
    await page.waitForSelector('button.calendar__navigation--tomorrow');
    await page.click('button.calendar__navigation--tomorrow'); //jogos de amanhã

    //Abrir os jogos fechados -- resolver isso depois

    await page.waitForSelector('div.event__match--twoLine');
    //console.log('Times carregados com sucesso');
    const dados = {
        // DATE: [],
        // TIME: [],
        // COUNTRY: [],
        // LEAGUE: [],
        HOME: [],
        AWAY: []
    }

    const links = {
        LINK: []
    }

    const eventos = (await page.$$('div.event__match--twoLine'));
    let jogos = 0;
    for (evento of eventos) {
        try {
            const home = await evento.$eval('div.event__homeParticipant', el => el.innerText);
            const away = await evento.$eval('div.event__awayParticipant', el => el.innerText);
            dados.HOME.push(home);
            dados.AWAY.push(away);
            //console.log(`${home} x ${away}`);
            const link = await evento.$eval('a.eventRowLink', el => el.getAttribute('href'));
            links.LINK.push(link);
            jogos++;
        } catch (error) {
            console.log(error);
        }

    }
    console.log(`Jogos: ${jogos}`);
    //console.log(eventos);
    //saveToCSV(dados);
    const end = Date.now();
    console.log(`Tempo: ${(end - start) / 1000} segundos`);
    return links;
}

function saveToCSV(dados) {

    const header = 'HOME;AWAY;FTHG;FTAG';

    const rows = dados.HOME.map((home, index) => `${home};${dados.AWAY[index]};${dados.FTHG[index]};${dados.FTAG[index]}\n`).join('');

    const csvContent = header + rows;
    const filename = path.join(__dirname, 'datasetflashscore.csv');

    fs.writeFileSync(filename, csvContent, 'utf8');

}