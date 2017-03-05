const Discord = require("discord.js")

class Response {
    constructor(bot, mod, message, matches) {
        this._bot = bot
        this._module = mod
        this._message = message
        this._matches = matches
    }

    get bot() {
        return this._bot
    }

    get module() {
        return this._module
    }

    get message() {
        return this._message
    }

    get matches() {
        return this._matches
    }

    get discord() {
        return this.bot.discord
    }

    get clientUser() {
        return this.discord.user
    }

    get authorId() {
        return this._message.author.id
    }

    get author() {
        return this._message.author
    }

    get serverId() {
        return this._message.guild.id
    }

    get server() {
        return this._message.guild
    }

    get channelId() {
        return this._message.channel.id
    }

    get channel() {
        return this._message.channel
    }

    get contextId() {
        return this.server ? `S${this.serverId}` : `U${this.authorId}`
    }

    get autoId() {
        return this.server ? this.serverId : this.authorId
    }

    send(message) {
        let promise = this.message.channel.send(message)

        promise.catch(err => this.bot.contextLog({from: this.module.identifier, channel: this.channel}, err))

        return promise
    }

    reply(message) {
        return this.send(`<@${this.authorId}> ${message}`)
    }

    random(messages) {
        let message = messages[Math.floor(Math.random() * messages.length)]
        return this.send(message)
    }

    sendDirectMessage(message) {
        return this.discord.findUser(this.authorId).sendMessage(message)
    }

    sendEmbed(message, callback) {
        let embed = new Discord.RichEmbed()
        callback(embed)
        this.channel.sendEmbed(embed, message)
    }

    get authorIsAdministrator() {
        return this.discord.isAdministrator(this.author)
    }

    get authorIsServerAdministrator() {
        return this.discord.isServerAdministrator(this.server, this.author)
    }

    canI(permissions) {
        return this.discord.canI(this.server, permissions)
    }

    authorHasPermission(permissions) {
        return this.discord.hasPermission(this.server, this.author, permissions)
    }

    serverEmoji(name, altText) {
        return this.discord.serverEmoji(this.server, name, altText)
    }

    collection(collectionName) {
        return this.bot.database.collection(this.module, collectionName, this.server ? `S${this.serverId}` : `U${this.authorId}`)
    }

    collectionName(collectionName) {
        return this.bot.database.collectionName(this.module, collectionName, this.server ? `S${this.serverId}` : `U${this.authorId}`)
    }
}

module.exports = Response
