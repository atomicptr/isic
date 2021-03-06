const Response = require("./Response")
const IntervalResponse = require("./IntervalResponse")

const Discord = require("discord.js")
const DMChannel = Discord.DMChannel

class Module {
    constructor(bot, moduleConfig, registerFunc) {
        this._bot = bot

        const defaultConfig = {
            requiresPermission: []
        }

        this._moduleConfig = Object.assign({}, defaultConfig, moduleConfig)
        this._actions = []
        this._intervalActions = {}

        registerFunc(this)

        this.bot.on("interval", this.onInterval.bind(this))

        let num = this._actions.length + Object.keys(this._intervalActions).length
        this.bot.contextLog.info({from: this.identifier}, `registered module ${this.identifier} with ${num} actions.`)
    }

    get bot() {
        return this._bot
    }

    get discord() {
        return this.bot.discord
    }

    get client() { // for compat with 0.2.x
        return this.discord
    }

    get config() {
        return this.bot.config
    }

    get clientUser() {
        return this.bot.clientUser
    }

    get identifier() {
        return this._moduleConfig.identifier
    }

    registerAction(regex, callback) {
        this._actions.push({
            trigger: regex,
            callback: callback
        })
    }

    command(commandName, callback) {
        this.bot.contextLog.debug({from: this.identifier}, `\tadded command action ${commandName}`)

        this.registerAction(new RegExp(`^!${commandName}\s?(.*)`), (res) => {
            let args = res.matches[1].trim().split(" ")

            // special case for when there are no args, cuz split leaves an empty string
            if(args.length == 1 && args[0].length == 0) {
                args = []
            }

            this.bot.contextLog.debug({from: this.identifier, channel: res.channel}, `executed command ${commandName} with arguments: [${args.join(", ")}]`)
            callback(res, args)
        })
    }

    hear(regex, callback) {
        this.bot.contextLog.debug({from: this.identifier}, `\tadded hear action: "${regex.source}"`)
        this.registerAction(regex, res => callback(res))
    }

    respond(regex, callback) {
        this.bot.contextLog.debug({from: this.identifier}, `\tadded respond action "${regex.source}"`)
        let prefix = new RegExp(`<@${this.clientUser.id}> `)
        this.registerAction(new RegExp(prefix.source + regex.source), res => callback(res))
    }

    interval(ident, callback) {
        this.bot.contextLog.debug({from: this.identifier}, `\tadded interval action ${ident}`)
        this._intervalActions[ident] = callback
    }

    get service() {
        let register = (method, path, callback) => {
            this.bot.contextLog.debug({from: this.identifier}, `\tadded service ${method.toUpperCase()} ${path}`)
            this.bot.registerService(method, this, path, callback)
        }

        return {
            get: (path, callback) => register("get", path, callback),
            post: (path, callback) => register("post", path, callback),
            put: (path, callback) => register("put", path, callback),
            delete: (path, callback) => register("delete", path, callback)
        }
    }

    removeInterval(ident) {
        this.bot.contextLog.debug({from: this.identifier}, `removed interval action ${ident}`)
        if(this._intervalActions[ident]) delete this._intervalActions[ident]
    }

    onInterval() {
        for(let ident of Object.keys(this._intervalActions)) {
            try {
                this.bot.contextLog.debug({from: this.identifier}, `interval ${ident} emitted...`)
                this._intervalActions[ident](new IntervalResponse(this.bot, this))
            } catch(ex) {
                this.bot.contextLog.error({from: this.identifier}, `Interval "${ident}" failed`, ex)
            }
        }
    }

    update(message) {
        for(let action of this._actions) {
            let match = message.content.match(action.trigger)

            if(match) {
                let isDM = message.channel instanceof DMChannel

                if(isDM && this._moduleConfig.ignoredm) {
                    this.bot.contextLog.debug({from: this.identifier, channel: message.channel}, `Message "${message.content}" matches, but module "${this.identifier}" ignores DMs`)
                    continue
                }

                this.bot.contextLog.debug({from: this.identifier, channel: message.channel}, `Message "${message.content}" matched regex "${action.trigger.source}"`)
                if(this.discord.canI(message.guild, this._moduleConfig.requiresPermission)) {
                    try {
                        action.callback(new Response(this.bot, this, message, match))
                    } catch(ex) {
                        this.bot.contextLog.error({from: this.identifier, channel: message.channel}, `${this.identifier}: Action failed for message "${message.content}"`, ex)
                    }
                } else {
                    this.bot.contextLog.warn({from: this.identifier, channel: message.channel}, `I don't have the permission to execute module ${this.identifier} need [${this._moduleConfig.requiresPermission.join(", ")}]`)
                }
            }
        }
    }

    log(messages) {
        this.bot.contextLog.info({from: this.identifier}, messages)
    }

    error(messages) {
        this.bot.contextLog.error({from: this.identifier}, messages)
    }

    debug(messages) {
        this.bot.contextLog.debug({from: this.identifier}, messages)
    }

    warn(messages) {
        this.bot.contextLog.warn({from: this.identifier}, messages)
    }

    // some of this is mostly for compat with 0.2.x
    hash(str) {
        return this.bot.hash(str)
    }

    request(args) {
        return this.bot.request.apply(null, arguments)
    }

    emojiExists(server, name) {
        return this.discord.emojiExists(server, name)
    }

    serverEmoji(server, name, altText) {
        return this.discord.serverEmoji(server, name, altText)
    }

    isAdministrator(user) {
        return this.discord.isAdministrator(user)
    }

    isServerAdministrator(server, user) {
        return this.discord.isServerAdministrator(server, user)
    }

    sendMessageToChannel(channel, message) {
        return channel.send(message)
    }

    sendEmbedToChannel(channel, message, callback) {
        let embed = new Discord.RichEmbed()
        callback(embed)
        channel.sendEmbed(embed, message)
    }

    collection(collectionName, serverId) {
        return this.bot.database.collection(this, collectionName, serverId)
    }

    collectionName(collectionName, serverId) {
        return this.bot.database.collection(this, collectionName, serverId)
    }

    globalCollection(collectionName) {
        return this.collection(collectionName)
    }

    eachCollection(collectionName, callback) {
        return this.bot.database.eachCollection(this, collectionName, callback)
    }

    uuid(input) {
        return this.bot.uuid(input)
    }
}

module.exports = Module
