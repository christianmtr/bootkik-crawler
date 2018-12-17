const express = require("express");
const puppeteer = require("puppeteer");
const fsPath = require("fs-path");
const fs = require("fs");
const {URL} = require('url');

const port = 3003;
const app = express();

app.get("*", async (request, response) => {
  try {
    const query_url = request.query.url; // https://www.dominio.com/algo/mas
    const url = new URL(query_url); // https://www.dominio.com/algo/mas
    const hostname = url.hostname; // www.dominio.com/
    const pathname = url.pathname; // /algo/mas

    let cached_file_path = `prerender_cache/${url.href}.html`;

    if (cached_file_path.endsWith("/.html")) {
      cached_file_path = cached_file_path.replace("/.html", ".html");
    }
    console.log("Lets go to search if exists: ", cached_file_path);

    if (fs.existsSync(cached_file_path)) {
      console.log("I got a cached file. Sending...");

      let file_content = fs.readFileSync(cached_file_path, "utf8");
      response.header("Content-Type", "text/html");
      response.status(200).send(file_content);
    } else {
      const browser = await puppeteer.launch({ headless: true });

      try {
        const page = await browser.newPage();

        // we need to override the headless Chrome user agent since its default one is still considered as "bot"
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36"
        );
        const res = await page.goto(url, {waitUntil: "networkidle0"});

        // Inject <base> on page to relative resources load properly.
        await page.evaluate(url => {
          /* global document */
          const base = document.createElement("base");
          base.href = url;
          document.head.prepend(base); // Add to top of head, before all other resources.
        }, url);

        // Remove scripts(except structured data) and html imports. They've already executed and loaded on the page.
        await page.evaluate(() => {
          const elements = document.querySelectorAll(
            'script:not([type="application/ld+json"]), link[rel="import"]'
          );
          elements.forEach(e => e.remove());
        });

        const html = await page.evaluate(() => {
          return document.documentElement.innerHTML;
        });

        fsPath.writeFileSync(cached_file_path, html);

        // await page.close();
        // browser.disconnect();
        // browser.close();

        response.status(res.status()).send(html);
      } catch (e) {
        response.status(500).send(e.toString());
      }

      await page.close();
      // browser.disconnect();
      // browser.close();
    }
  } catch (e) {
    console.log("I got an error: ", e);
    res.status(500).send("ERROR");
  } finally {
    console.log("Finally reached");
  }
});

app.listen(port, () => {
  console.log(`Web server is running at port ${port}`);
});
