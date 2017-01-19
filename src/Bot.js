const ActionParser = require("./ActionParser")
const ModuleManager = require("./ModuleManager.js")

const Discord = require("discord.js")

class Bot {
    constructor(config) {
        this.client = new Discord.Client()

        this.config = config
        this.moduleManager = new ModuleManager(config.modulePaths)
        this.actions = new ActionParser(this)

        this.client.on("ready", this.onReady.bind(this))
        this.client.on("message", this.onMessage.bind(this))

        this.client.login(this.config.discordToken)
    }

    get id() {
        return this.client.user.id
    }

    get name() {
        return this.client.user.username
    }

    get discriminator() {
        return this.client.user.discriminator
    }

    onReady() {
        console.log(`${this.name}#${this.discriminator} is ready.`)

        this.moduleManager.register(this)
    }

    onMessage(message) {
        console.log(`${message.author.username}#${message.author.discriminator} (${message.author.id}): ${message.content}`)

        // don't listen to yourself
        if(message.author.id !== this.client.user.id) {
            this.actions.update(message)
        }
    }

    command(commandName, callback) {
        console.log(`\tregistered command action: "${commandName}"`)

        this.actions.register(new RegExp(`!${commandName}\s?(.*)`), (res) => {
            let args = res.matches[1].trim().split(" ")
            callback(res, args)
        })
    }

    hear(regex, callback) {
        console.log(`\tregistered hear action: "${regex.source}"`)

        this.actions.register(regex, (res) => {
            callback(res)
        })
    }

    respond(regex, callback) {
        console.log(`\tregistered respond action: "${regex.source}"`)

        let prefix = new RegExp(`<@${this.client.user.id}> `)
        this.actions.register(new RegExp(prefix.source + regex.source), (res) => {
            callback(res)
        })
    }
}

module.exports = Bot
