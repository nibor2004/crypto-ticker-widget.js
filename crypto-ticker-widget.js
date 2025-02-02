/* --------------------------------------------------------------
Script: crypto-ticker-widget
Author: Nico Wickersheim
Version: 1.0.1
updated by u/splatkitten

Description:
Displays the current course of a cryptoin any fiat currency based on 
the data of coinbase API.

Changelog:


1.0.0: Initialization
1.0.1: added custom bitcoin amount
-------------------------------------------------------------- */
let params = null;
// Parameter takeover from input
// param 1 = btc type. param 2 = currency. 
// param 3 = btc amount
if (args.widgetParameter == null) {
    params = ["BTC", "NOK", "1"];
    // Default input without parameters
} else {
    params = args.widgetParameter.split(",")
    console.log(params)
}

// Fetch Coinbase API json object
const url = 'https://api.coinbase.com/v2/prices/' + params[0] + '-' + params[1] + '/spot'
const req = new Request(url)
const res = await req.loadJSON()
let base = "";
let currency = "";
let amount = "";
// Check if the api response contains an error message
if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
    base = res.data.base;
    currency = res.data.currency;
    amount = res.data.amount * params[2];
    coins = params[2];
} else {
    amount = res.errors[0].message;
}

let USDamount = "";
// Fetch Coinbase API json object as USD for comapre with latest (onyl available in USD)
const USDurl = 'https://api.coinbase.com/v2/prices/' + params[0] + '-USD/spot'
const USDreq = new Request(USDurl)
const USDres = await USDreq.loadJSON()
if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
    USDamount = USDres.data.amount * params[2];
    USDamount = parseFloat(USDamount).toFixed(2)
    console.log(USDamount)
}
//amount = 100000000;

// Image fetching
let img = {};
let i = {};
// Fetch belonging image to crypto symbol
if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
    i = new Request('https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@9ab8d6934b83a4aa8ae5e8711609a70ca0ab1b2b/128/white/' + base.toLowerCase() + '.png')
}
try {
    img = await i.loadImage()
    console.log(i.response.statusCode)
} catch (e) {
    // Fetch default independent image
    i = new Request('https://image.flaticon.com/icons/png/512/107/107587.png')
    img = await i.loadImage()
}

// Fetch further information to crpyto from Coinpaprika
let name = "";
let rank = "";
if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
    const nameUrl = 'https://api.coinpaprika.com/v1/search?q=' + base.toLowerCase() + '&c=currencies&limit=1'
    const nameReq = new Request(nameUrl)
    const resName = await nameReq.loadJSON()
    name = resName.currencies[0].name;
    rank = resName.currencies[0].rank;
}
let upticker = SFSymbol.named("chevron.up");
let downticker = SFSymbol.named("chevron.down");
let latest = "";
if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
    const latestUrl = 'https://api.coinpaprika.com/v1/coins/' + base.toLowerCase() + '-' + name.toLowerCase() + '/ohlcv/latest/'
    const latestReq = new Request(latestUrl)
    const resLatest = await latestReq.loadJSON()
    latest = resLatest[0].close;
    latest = parseFloat(latest).toFixed(2);
    console.log(latest);

}

let widget = createWidget(base, amount, currency, img, name, rank)
if (config.runsInWidget) {
    // create and show widget
    Script.setWidget(widget)
    Script.complete()
}
else {
    widget.presentSmall()
}

function createWidget(base, amount, currency, img, name, rank, coins) {
    let w = new ListWidget()
    w.backgroundColor = new Color("#1A1A1A")

    // Place image on the left top
    let imageStack = w.addStack();
    imageStack.setPadding(8, 25, 0, 10);
    imageStack.layoutHorizontally();
    imageStack.centerAlignContent();
    let image = imageStack.addImage(img)
    image.imageSize = new Size(45, 45)
    image.centerAlignImage()
    imageStack.addSpacer(12);

    let imageTextStack = imageStack.addStack();
    imageTextStack.layoutVertically();
    imageTextStack.addSpacer(0);

    // Symbol of crypto token
    let baseText = imageTextStack.addText(base)
    baseText.textColor = Color.white()
    baseText.font = Font.systemFont(20)

    // Rank of crypto token
    let rankText = "";
    if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
        rankText = imageTextStack.addText("Rank: " + rank)
    }
    rankText.textColor = Color.white()
    rankText.font = Font.systemFont(11)

    w.addSpacer(8)

    // Full name of crypto token
    let staticText = w.addText(params[2] + " " + name)
    staticText.textColor = Color.white()
    staticText.font = Font.systemFont(13)
    staticText.centerAlignText()

    w.addSpacer(8)

    let amountStack = w.addStack();
    amountStack.layoutHorizontally();
    amountStack.centerAlignContent();
    amountStack.addSpacer(20);

    // Round amount to 2 decimal positions
    let amountTxt = "";
    if (JSON.stringify(res).toLowerCase().includes("errors") == false) {
        // Cut numbers over 10 Million and show just with ending 'M'
        if (parseFloat(amount) >= 10000000) {
            amount = (parseFloat(amount) / 1000000).toFixed(2).replace(/\.0$/, '');
            amount += "M";
            console.log(amount)
        } else {
            amount = parseFloat(amount).toFixed(2);
      }
        amountTxt = amountStack.addText(amount + ' ' + currency )

        let tickerStack = amountStack.addStack();
        tickerStack.layoutHorizontally();
        amountStack.centerAlignContent();
        tickerStack.addSpacer(5);

        // Stack for ticker image: if course yesterday is lower than today show green ticker
        // if course yesterday is greater than today show red ticker
        // Comapare is executed in USD!
        let ticker = null;
        if (USDamount < latest) {
            ticker = tickerStack.addImage(downticker.image);
            ticker.tintColor = Color.red();
        } else {
            ticker = tickerStack.addImage(upticker.image);
            ticker.tintColor = Color.green();
        }

        ticker.imageSize = new Size(12, 12)

        amountTxt.textColor = Color.orange()
    } else {
        amountTxt = w.addText(amount); // Write error message in case as amount
        amountTxt.textColor = Color.red()
    }

    amountTxt.font = Font.systemFont(16)
    amountTxt.centerAlignText()

    w.addSpacer(8)

    // Bottom date text 
    let currentDate = new Date();
    let lastDate = w.addDate(currentDate);
    lastDate.textColor = Color.gray()
    lastDate.font = Font.mediumSystemFont(10)
    lastDate.centerAlignText();

    w.setPadding(0, 0, 0, 0)
    return w
}
