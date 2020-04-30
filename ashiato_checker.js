const fs = require('fs');
require('date-utils');

const puppeteer = require('puppeteer');
const program   = require('commander');
const { IncomingWebhook } = require('@slack/webhook');

program
  .requiredOption('-i, --id <id>', 'id')
  .requiredOption('-p, --password <password>', 'password')
  .requiredOption('-u, --url <slack web hook url>', 'password')
  .parse(process.argv);

if(process.argv.length < 3) {
    program.help();
}
const id = program.id
const password  = program.password
const url = program.url;

puppeteer.launch({headless: true,
                  dumpio: false,
                  devtools: false,
                  args: ['--lang=ja',
                         '--window-size=1600,800',
                         '--no-sandbox',
                         '--disable-setuid-sandbox']}).then(async browser => {
  try {

    let page = await browser.newPage();
    await page.setViewport({width: 1600, height: 800});
    // Change browser language for inputting Japanese date format(YYYY/MM/DD)
    await page.setExtraHTTPHeaders({'Accept-Language': 'ja-JP'});

    login_page = 'https://www.pairs.lv/';
    // login
    await page.goto(login_page, {waitUntil: 'domcontentloaded'});
    await page.waitFor(5000);
    await page.click('div.login-facebook-button-start')
    await page.waitFor(5000);
    const pages = await browser.pages();
    const popup = pages[pages.length - 1];
    await popup.waitFor(5000);
    await popup.type('input[name="email"]', id);
    await popup.waitFor(1000);
    await popup.type('input[name="pass"]', password);
    await popup.waitFor(1000);
    await popup.click('input[type="submit"]')
    await page.waitFor(20000);

    //page = pages[1];
    ashiato_page = 'https://pairs.lv/#/visitor/list/1';
    await page.goto(ashiato_page, {waitUntil: 'domcontentloaded'});
    await page.waitFor(5000);

    visitor_value = '';
    let date = await page.$$('th.date');
    visitor_value += await (await date[0].getProperty('textContent')).jsonValue();
    visitor_value += "\n";

    let time = await page.$$('td.time');
    let age = await page.$$('span.user_age');
    let area = await page.$$('span.user_area');
    for(let i=0; i< time.length; i++) {
      visitor_value += await (await time[i].getProperty('textContent')).jsonValue();
      visitor_value += " ";
      visitor_value += await (await age[i].getProperty('textContent')).jsonValue();
      visitor_value += " ";
      visitor_value += await (await area[i].getProperty('textContent')).jsonValue();
      visitor_value += "\n";
    }

    let text = fs.readFileSync("../weekly_visitor.txt");
    if(text != visitor_value) {
      fs.writeFileSync("../weekly_visitor.txt", visitor_value);

      const webhook = new IncomingWebhook(url);
      await webhook.send({
        text: "<!channel>" + visitor_value
      });
    }

    await page.waitFor(5000);
    //await page.waitFor(1000000);
    await browser.close();

    var dt = new Date();
    var formatted = dt.toFormat("YYYYMMDD HH24MISS");
    console.log('[' + formatted + '] script end');
  } catch (e) {
    console.log(e.toString);
    console.log(e.stack);
    await browser.close();
    process.exit(1);
  }
});
