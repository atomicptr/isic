const fs = require("fs")

if(!fs.existsSync("./config.json")) {
    console.error("ERR: No \"config.json\" found, please rename the config.template.json file to config.json and enter your Discord token there.")
    process.exit(1)
}

const config = require("./config.json")
const Bot = require("./src/Bot.js")

let bot = new Bot(config)

bot.on("ready", _ => {
    bot.log.info(`### Running github.atomicptr.isic v${require("./package.json").version} on Node ${process.version}`)

    bot.client.user.setGame("Node " + process.version)
})
