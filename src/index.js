const fs          = require('fs').promises;
const puppeteer   = require("puppeteer-extra");
const stealth     = require("puppeteer-extra-plugin-stealth")();
const chromePaths = require('chrome-paths');
const m3u8ToMp4   = require("m3u8-to-mp4");
const prompt      = require('prompt');
const beautify    = require('beautify.log').default;
var converter     = new m3u8ToMp4();
puppeteer.use(stealth);

beautify.log('❤️ {fgRed}Hello, {fgGreen}world! ❤️');
beautify.log('{bgWhite}{fgRed}Hello, {bgRed}{fgGreen}world!');
beautify.log('{fgGreen}Hello, {fgRed}world!');
beautify.log('{dim}{fgRed}Hello, {fgGreen}world!');
beautify.log('{underscore}{fgRed}Hello, {fgGreen}world!');
beautify.log('{bright}{fgRed}Hello, {fgGreen}world!');
beautify.log(
	'{bright}{fgYellow}Lorem ipsum dolor {fgBlue}sit amet consectetur {fgCyan}adipisicing elit.',
);
beautify.log(
	'{fgYellow}Lorem ipsum dolor {reset}{bgRed}sit amet consectetur{reset} {fgCyan}adipisicing elit.',
);
beautify.log(
	'{reverse}{fgYellow}Lorem ipsum dolor{reset} {reverse}{bgRed}sit amet consectetur{reset} {reverse}{fgCyan}adipisicing elit.',
);

const properties = [
    {
        name: 'username',
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Username must be only letters, spaces, or dashes'
    },
    {
        name: 'password',
        hidden: true
    }
];

prompt.start();


prompt.get(properties, function (err, result) {
    if (err) { return onErr(err); }
    console.log('Command-line input received:');
    console.log('  Username: ' + result.username);
    console.log('  Password: ' + result.password);
});

function onErr(err) {
    console.log(err);
    return 1;
}

var downloaded = false;

async function DownloadVideo(url, outputname)
{
    await converter.setInputFile(request.url).setOutputFile("dummy.mp4").start();
}

async function LoadCookies(page)
{
    const cookiesString = await fs.readFile('./cookies.json');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
}

async function WriteCookies(page)
{
    const cookies = await page.cookies();
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
}

(async () => {
    const browser = await puppeteer.launch({
        headless:         false,
        executablePath:   chromePaths.chrome,
        defaultViewport:  null
    });

    const page   = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setRequestInterception', { patterns: [{ urlPattern: '*' }] });
    client.on('Network.requestIntercepted', async ({
        interceptionId,
        request,
        responseHeaders,
        resourceType
    }) => {
        if (request.url.includes('m3u8'))
        {
            if(downloaded) return;
            downloaded = true;
            console.log(request.url);
            await DownloadVideo(request.url, 'dummy.mp4')
        }
        client.send('Network.continueInterceptedRequest', { interceptionId });
    });
    await page.goto('...url...');
})();