const chrome = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

export default async (req: any, res: any) => {
  let {
    // query: { hash, path, resolution },
    body,
    method
  } = req
  const sessionId = getRandomHex8()

  if (method !== 'POST') {
    // CORS https://vercel.com/guides/how-to-enable-cors
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    return res.status(200).end()
  }

  if (!body) return res.status(400).end(`No body provided`)

  if (typeof body === 'object' && !body.url) return res.status(400).end(`No url provided`)

  const url = body.url
  console.log('[debug] ', ' [sessionId]: ', sessionId, ' [url]: ', url)

  const isProd = process.env.NODE_ENV === 'production'

  let browser

  if (isProd) {
    browser = await puppeteer.launch({
      args: [
        ...chrome.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--disable-features=IsolateOrigins",
        "--disable-site-isolation-trials"
      ],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: 'new',
      ignoreHTTPSErrors: true
    })
  } else {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  }

  const page = await browser.newPage()

  // log all console logs
  page.on('console', msg => {
    console.log('[debug] [sessionId=]: ', sessionId, ' [console=]: ', msg.text());
  })

  // log all request failed events
  page.on('requestfailed', event => {
    const req = JSON.stringify(event.failure())   
    console.log('[debug] [sessionId=]: ', sessionId, ' [reqFailed=]: ', req);
  })

  await page.setViewport({ width: 1200, height: 630 })

  await page.goto(url, {
    waitUntil: "networkidle2",
  });

  const data = await page.screenshot()

  await browser.close()
  // Set the s-maxage property which caches the images then on the Vercel edge
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
  res.setHeader('Content-Type', 'image/png')
  // CORS
  // res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  res.end(data)
}


function getRandomHex8() {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
}
