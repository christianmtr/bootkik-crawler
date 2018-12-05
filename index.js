const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fsPath = require("fs-path");
var fs = require('fs');

const port = 3003;
app.get('*', async (req, res) => {
    try {
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
            
        // we need to override the headless Chrome user agent since its default one is still considered as "bot"
        await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');

        const origin_url = req.originalUrl;
        console.log('origin_url: ' + origin_url);
      
                
        let cached_file_path = `.${origin_url}.html`;
      
        if(cached_file_path.endsWith("/.html")){
          cached_file_path = cached_file_path.replace("/.html", ".html");
        }
        console.log('Lets go to search if exists: ', cached_file_path);
        
        if (fs.existsSync(cached_file_path)) {
            let file_content = fs.readFileSync('DATA', 'utf8');
            console.log("I got a cached file. Sending...")
            res.send(file_content);
        }        
        
        await page.goto('https://test.bootkik.com' + origin_url, {
            waitUntil: "networkidle0",
        });

        const html = await page.evaluate(() => {
            return document.documentElement.innerHTML;
        });       
  
       fsPath.writeFile(cached_file_path, html, err => {
          if (err) {
              throw err;
          }
      });
        
        await page.close();
        browser.disconnect();
        browser.close();

        res.send(html);

        } catch(e) {
            console.log(e);
            res.send("ERROR");
        } finally{
            console.log('FInally reached');
        }

});

app.listen(port, () => {
    console.log(`Web server is running at port ${port}`);
});
