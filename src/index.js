const fs          = require('fs');
const puppeteer   = require("puppeteer-extra");
const stealth     = require("puppeteer-extra-plugin-stealth")();
const chromePaths = require('chrome-paths');
const m3u8ToMp4   = require("m3u8-to-mp4");
const beautify    = require('beautify.log').default;
const sleep       = require("sleep-promise");
var converter     = new m3u8ToMp4();
puppeteer.use(stealth);

var downloading = false;
var current_chapitre = '';

var browser = null;
var page    = null;

beautify.log('❤️ {fgRed}Elephorm {fgGreen}ripper! ❤️');

async function DownloadVideo(url)
{
    try
    {
        await page.waitForNavigation({timeout: 3000, waitUntil: 'load'});
    }
    catch(error){}
    var path = '.';
    var videoName = '';
    const breadcrumbs = await page.$$('.fil_arianne a')
    for (let breadcrumb of breadcrumbs)
    {
        let text = (await page.evaluate(el => el.textContent, breadcrumb)).replace('\n', '').replace(/[^A-Z a-z0-9]/gi,'').trim().replace('  ', ' ');
        var link = (await page.evaluate(el => el.getAttribute('href'), breadcrumb));
        var linkIsNullOrEmpty = link == null || typeof link != 'string' && link.trim() == '';
        if(!linkIsNullOrEmpty)
        {
            path += '/' + text;
            if(!fs.existsSync(path))
            {
                fs.mkdirSync(path);
            }
        }
        else
        {
            videoName = text;
        }
    }
    if(current_chapitre != '')
    {
        path += '/' + current_chapitre;
        if(!fs.existsSync(path))
        {
            fs.mkdirSync(path);
        }
    }
    path += '/' + videoName;
    if(!fs.existsSync(path + ".mp4"))
    {
        await converter.setInputFile(url).setOutputFile(path + ".mp4").start();
    }
}

async function LoadCookies(page)
{
    await fs.readFile('./cookies.json', async function read(err, data)
    {
        if (err)
        {
            throw err;
        }
        const cookies = JSON.parse(data);
        await page.setCookie(...cookies);
    });
}

async function WriteCookies(page)
{
    const cookies = await page.cookies();
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2), function(err, result)
    {
        if(err) console.log('error', err);
    });
}

async function Downloading()
{
    while(downloading)
    {
        await sleep(1000);
    }
}

async function DownloadCourse(url)
{
    await page.goto(url);
    await sleep(1000);
    await Downloading();
    console.log('downloaded url: ' + url);
}

async function DownloadFormation(url)
{
    await page.goto(url);
    await sleep(1000);
    await Downloading();
    const chapitres_links = {};
    const chapitres = await page.$$('#chapitres .chapitre');
    for (const chapitre of chapitres)
    {
        //find h3 text...
        const chapitreText = (await page.evaluate(el => el.getElementsByTagName('h3')[0].innerText.trim(), chapitre));
        chapitres_links[chapitreText] = [];
        const courses = await chapitre.$$('.lesson__content a');
        for (const course of courses)
        {
            var newUrl = (await page.evaluate(el => el.getAttribute('href'), course));
            if(newUrl.startsWith("/"))
            {
                newUrl = "https://www.elephorm.com" + newUrl;
            }
            if(newUrl == url) continue;
            chapitres_links[chapitreText].push(newUrl);
        }
    }
    for(const chapitreText in Object.keys(chapitres_links))
    {
        for (const courseUrl of chapitres_links[chapitreText])
        {
            current_chapitre = chapitreText;
            await DownloadCourse(courseUrl);
        }
    }
    console.log('downloaded formation: ' + url);
}

async function DownloadPackFormation(url)
{
    //
    console.log('downloaded pack formation: ' + url);
}

async function DownloadFormations(url)
{
    //
}

async function DownloadAll()
{
    //
}

(async () => {
    browser = await puppeteer.launch({
        headless:        false,
        executablePath:  chromePaths.chrome,
        defaultViewport: null
    });
    page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setRequestInterception', { patterns: [{ urlPattern: '*' }] });
    client.on('Network.requestIntercepted', async ({
        interceptionId,
        request,
        responseHeaders,
        resourceType
    }) => {
        try
        {
            if
            (
                request.url.startsWith('https://videos-cloudflare.jwpsrv.com') &&
                request.url.includes('.mp4.m3u8')
            )
            {
                await Downloading();
                downloading = true;
                await DownloadVideo(request.url);
                downloading = false;
            }
            client.send('Network.continueInterceptedRequest', { interceptionId });
        }
        catch(error){}
    });
    if(fs.existsSync('./cookies.json'))
    {
        await LoadCookies(page);
    }
    await page.goto('https://www.elephorm.com/user/login');
    var login_link = await page.$('.user-login-form');
    if(login_link != null)
    {
        beautify.log('{bgRed}Please log on your account to continue.{reset}');
    }
    //
    while((await page.url()).includes('/user/login') == true)
    {
        try
        {
            await sleep(1000);
        }
        catch(error){}
    }
    console.log('IS LOGGED IN!');
    await WriteCookies(page);
    const links_to_download = [
        'https://www.elephorm.com/formation/infographie/cours-de-dessin/cours-de-dessin-le-corps-humain'
    ];
    for(var i = 0; i < links_to_download.length; i++)
    {
        const link_to_download = links_to_download[i];
        console.log(link_to_download);
        if(link_to_download.endsWith('/formations'))
        {
            await DownloadAll();
        }
        else if(link_to_download.includes('/formations/'))
        {
            await DownloadFormations(link_to_download);
        }
        else if(link_to_download.includes('/pack-formation/'))
        {
            await DownloadPackFormation(link_to_download);
        }
        else if(link_to_download.includes('/formation/'))
        {
            await DownloadFormation(link_to_download);
        }
    }
    console.log('Finished downloading.');
})();