#!/usr/bin/env node

const fs = require('fs');
const GIFEncoder = require('gifencoder');
const path = require('path');
const pngFileStream = require('png-file-stream');
const puppeteer = require('puppeteer');
const tempdir = require('tempdir');

const screenSize = 480;

const argv = require('yargs')
  .alias('url', 'u').default('url', 'https://giphy.com/search/lol')
  .describe('url', 'URL to generate GIF from')
  .alias('duration', 'd').default('duration', 10)
  .describe('duration', 'GIF duration in frames')
    .alias('delay', 'l').default('delay', 1000)
    .describe('delay', 'Initial delay in milliseconds')
    .alias('frames', 'f').default('frames', 150)
    .describe('frames', 'Frames duration in milliseconds')
    .alias('quality', 'q').default('quality', 25)
    .describe('quality', 'Image quality')
  .alias('output', 'o').default('output', `${process.cwd()}${require('path').sep}web.gif`)
  .describe('output', 'Output file name')
    .alias('type', 't').default('type', 'gif')
    .describe('type', 'Image output format (gif/png)')
  .alias('h', 'help')
  .alias('V', 'version')
  .usage('webgif -u URL -d DURATION [-o OUTFILE] [-l DELAY] [-f FRAMES] [-q QUALITY] [-t TYPE]')
  .version()
  .argv;

(async () => {
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ['--allow-running-insecure-content', '--disable-setuid-sandbox', '--no-sandbox', ],
  });
  const page = await browser.newPage();
  const workdir = await tempdir();

  page.setViewport({
    width: screenSize,
    height: screenSize,
  });

  console.log(`Navigating to URL: ${argv.url}`);
  await page.goto(argv.url);

  process.stdout.write('Taking screenshots: .');
  const screenshotPromises = [];
  for (let i = 1; i <= argv.duration; ++i) {
    filename = (argv.type == 'png') ? `${argv.output}/${i}.png` : `temp/${argv.output}/T${new Date().getTime()}.png`;
    process.stdout.write('.');
    screenshotPromises.push(page.screenshot({
      path: filename,
      omitBackground: true,
    }));
    if((argv.type == 'png') && i == argv.duration - 1) {
      screenshotPromises.push(page.screenshot({
        path: `${argv.output}.png`,
        omitBackground: true,
      }));
    }
    await delay(argv.frames);
  }

  await delay(argv.delay);
  await Promise.all(screenshotPromises);
  if(argv.type == 'gif'){
    console.log(`\nEncoding GIF: ${argv.output}`);
    const encoder = new GIFEncoder(screenSize, screenSize);
    await pngFileStream(`temp/${argv.output}/T*png`)
        .pipe(encoder.createWriteStream({ repeat: 0, delay: argv.frames, quality: argv.quality }))
        .pipe(fs.createWriteStream(`${argv.output}.gif`));
  }
  await page.close();
  await browser.close();

})();

process.on('unhandledRejection', function(reason, p) {
  throw new Error(reason);
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}